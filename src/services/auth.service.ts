import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { AuthError, ValidationError, RateLimitError } from '../types/errors';
import {
  User,
  AuthResponse,
  RegistrationData,
  LoginCredentials,
  SocialAuthData,
  Session,
  DeviceInfo,
  PasswordResetRequest,
  PasswordResetData,
} from '../types/auth.types';

export class AuthService {
  private users: Map<string, User & { password?: string; passwordHash?: string }> = new Map();
  private sessions: Map<string, Session> = new Map();
  private refreshTokensMap: Map<string, { userId: string; expiresAt: Date }> = new Map();
  private failedAttempts: Map<string, { count: number; firstAttempt: Date }> = new Map();
  private passwordResetCodes: Map<string, PasswordResetRequest> = new Map();
  private emailToUserId: Map<string, string> = new Map();

  async register(data: RegistrationData): Promise<AuthResponse> {
    this.validateEmail(data.email);
    this.validatePassword(data.password);

    if (this.emailToUserId.has(data.email)) {
      throw new ValidationError('Email already exists');
    }

    const userId = this.generateId();
    const passwordHash = await this.hashPassword(data.password);

    const user: User & { passwordHash: string } = {
      id: userId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      provider: 'local',
      emailVerified: false,
      biometricEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash,
    };

    this.users.set(userId, user);
    this.emailToUserId.set(data.email, userId);

    await this.sendVerificationEmail(data.email);

    const tokens = await this.generateTokens(userId);
    await this.saveTokensToSecureStore(tokens);

    const { passwordHash: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    await this.simulateConstantTime();

    const rateLimitKey = credentials.email;
    this.checkRateLimit(rateLimitKey);

    const userId = this.emailToUserId.get(credentials.email);
    if (!userId) {
      this.recordFailedAttempt(rateLimitKey);
      throw new AuthError('Invalid credentials');
    }

    const user = this.users.get(userId);
    if (!user || !user.passwordHash) {
      this.recordFailedAttempt(rateLimitKey);
      throw new AuthError('Invalid credentials');
    }

    const isValidPassword = await this.verifyPasswordHash(credentials.password, userId);
    if (!isValidPassword) {
      this.recordFailedAttempt(rateLimitKey);
      throw new AuthError('Invalid credentials');
    }

    this.clearFailedAttempts(rateLimitKey);

    const tokens = await this.generateTokens(userId);
    await this.saveTokensToSecureStore(tokens);

    const session = await this.createSession(userId, tokens, credentials.deviceInfo);

    const { passwordHash, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword as User,
      ...tokens,
    };
  }

  async socialAuth(data: SocialAuthData): Promise<AuthResponse> {
    const verifiedEmail = await this.verifySocialToken(data.idToken);
    
    let userId = this.emailToUserId.get(verifiedEmail);
    let user: User & { passwordHash?: string };

    if (!userId) {
      userId = this.generateId();
      user = {
        id: userId,
        email: verifiedEmail,
        firstName: data.user?.firstName,
        lastName: data.user?.lastName,
        provider: data.provider,
        emailVerified: true,
        biometricEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(userId, user);
      this.emailToUserId.set(verifiedEmail, userId);
    } else {
      user = this.users.get(userId)!;
      user.provider = data.provider;
    }

    const tokens = await this.generateTokens(userId);
    await this.saveTokensToSecureStore(tokens);

    const { passwordHash, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword as User,
      ...tokens,
    };
  }

  async loginWithBiometric(email: string): Promise<AuthResponse> {
    const userId = this.emailToUserId.get(email);
    if (!userId) {
      throw new AuthError('User not found');
    }

    const user = this.users.get(userId);
    if (!user || !user.biometricEnabled) {
      throw new AuthError('Biometric authentication not enabled');
    }

    const isAuthenticated = await this.authenticateWithBiometric();
    if (!isAuthenticated) {
      throw new AuthError('Biometric authentication failed');
    }

    const tokens = await this.generateTokens(userId);
    await this.saveTokensToSecureStore(tokens);

    const { passwordHash, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword as User,
      ...tokens,
    };
  }

  async enableBiometric(email: string): Promise<void> {
    const userId = this.emailToUserId.get(email);
    if (!userId) {
      throw new AuthError('User not found');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new AuthError('User not found');
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      throw new AuthError('Biometric authentication not available');
    }

    user.biometricEnabled = true;
    user.updatedAt = new Date();
  }

  async authenticateWithBiometric(): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to continue',
      fallbackLabel: 'Use password',
    });
    return result.success;
  }

  async refreshTokens(refreshToken: string): Promise<Omit<AuthResponse, 'user'>> {
    const tokenData = this.refreshTokensMap.get(refreshToken);
    if (!tokenData || tokenData.expiresAt < new Date()) {
      throw new AuthError('Invalid refresh token');
    }

    this.refreshTokensMap.delete(refreshToken);

    const tokens = await this.generateTokens(tokenData.userId);
    await this.saveTokensToSecureStore(tokens);

    return tokens;
  }

  async logout(): Promise<void> {
    const accessToken = await SecureStore.getItemAsync('accessToken');
    if (accessToken) {
      this.sessions.delete(accessToken);
    }
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  }

  async validateSession(accessToken: string): Promise<Session> {
    const session = this.sessions.get(accessToken);
    if (!session) {
      throw new AuthError('Invalid session');
    }

    if (session.expiresAt < new Date()) {
      this.sessions.delete(accessToken);
      throw new AuthError('Session expired');
    }

    return session;
  }

  async getSession(accessToken: string): Promise<Session> {
    return this.validateSession(accessToken);
  }

  async getCurrentSession(): Promise<Session> {
    const accessToken = await SecureStore.getItemAsync('accessToken');
    if (!accessToken) {
      throw new AuthError('No active session');
    }

    const session = await this.validateSession(accessToken);
    
    const timeUntilExpiry = session.expiresAt.getTime() - Date.now();
    if (timeUntilExpiry < 2 * 60 * 1000) {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        const newTokens = await this.refreshTokens(refreshToken);
        const newSession = await this.createSession(session.userId, newTokens);
        return newSession;
      }
    }

    return session;
  }

  async getActiveSessions(email: string): Promise<Session[]> {
    const userId = this.emailToUserId.get(email);
    if (!userId) {
      return [];
    }

    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId && session.expiresAt > new Date());
  }

  async requestPasswordReset(email: string): Promise<PasswordResetRequest> {
    await this.sendPasswordResetEmail(email);
    
    const code = this.generateResetCode();
    const request: PasswordResetRequest = {
      email,
      code,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };

    this.passwordResetCodes.set(email, request);
    return request;
  }

  async resetPassword(data: PasswordResetData): Promise<boolean> {
    const request = this.passwordResetCodes.get(data.email);
    if (!request || request.code !== data.code || request.expiresAt < new Date()) {
      throw new AuthError('Invalid or expired reset code');
    }

    this.validatePassword(data.newPassword);

    const userId = this.emailToUserId.get(data.email);
    if (!userId) {
      throw new AuthError('User not found');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new AuthError('User not found');
    }

    user.passwordHash = await this.hashPassword(data.newPassword);
    user.updatedAt = new Date();

    this.invalidateAllSessions(userId);
    this.passwordResetCodes.delete(data.email);

    return true;
  }

  async verifyPasswordHash(password: string, userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user || !user.passwordHash) {
      return false;
    }

    const testHash = await this.hashPassword(password);
    return testHash === user.passwordHash;
  }

  async sendVerificationEmail(email: string): Promise<void> {
    console.log(`Sending verification email to ${email}`);
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    console.log(`Sending password reset email to ${email}`);
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    const invalidPatterns = [
      /^\./,
      /\.$/,
      /\.{2,}/,
      /^@/,
      /@$/,
    ];

    if (invalidPatterns.some(pattern => pattern.test(email))) {
      throw new ValidationError('Invalid email format');
    }
  }

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    const requirements = [
      /[a-z]/,
      /[A-Z]/,
      /[0-9]/,
      /[!@#$%^&*(),.?":{}|<>]/,
    ];

    const failedRequirements = [];
    if (!requirements[0].test(password)) failedRequirements.push('lowercase letter');
    if (!requirements[1].test(password)) failedRequirements.push('uppercase letter');
    if (!requirements[2].test(password)) failedRequirements.push('number');
    if (!requirements[3].test(password)) failedRequirements.push('special character');

    if (failedRequirements.length > 0) {
      throw new ValidationError(`Password must contain at least one ${failedRequirements.join(', ')}`);
    }
  }

  private async hashPassword(password: string): Promise<string> {
    return `hashed_${password}_salt`;
  }

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateResetCode(): string {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  private async generateTokens(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = `eyJ${Buffer.from(JSON.stringify({ userId, exp: Date.now() + 15 * 60 * 1000 })).toString('base64')}`;
    const refreshToken = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

    const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    this.refreshTokensMap.set(refreshToken, { userId, expiresAt: refreshExpiry });

    return { accessToken, refreshToken };
  }

  private async saveTokensToSecureStore(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
    await SecureStore.setItemAsync('accessToken', tokens.accessToken);
    await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
  }

  private async createSession(
    userId: string, 
    tokens: { accessToken: string; refreshToken: string },
    deviceInfo?: DeviceInfo
  ): Promise<Session> {
    const session: Session = {
      id: `session_${Date.now()}`,
      userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      deviceInfo,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    this.sessions.set(tokens.accessToken, session);
    return session;
  }

  private checkRateLimit(key: string): void {
    const attempts = this.failedAttempts.get(key);
    if (attempts) {
      const timeSinceFirst = Date.now() - attempts.firstAttempt.getTime();
      if (timeSinceFirst < 15 * 60 * 1000 && attempts.count >= 5) {
        throw new RateLimitError();
      }
      if (timeSinceFirst >= 15 * 60 * 1000) {
        this.failedAttempts.delete(key);
      }
    }
  }

  private recordFailedAttempt(key: string): void {
    const attempts = this.failedAttempts.get(key);
    if (attempts) {
      attempts.count++;
    } else {
      this.failedAttempts.set(key, { count: 1, firstAttempt: new Date() });
    }
  }

  private clearFailedAttempts(key: string): void {
    this.failedAttempts.delete(key);
  }

  private invalidateAllSessions(userId: string): void {
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(token);
      }
    }
  }

  private async verifySocialToken(idToken: string): Promise<string> {
    return `verified_email_${idToken}@example.com`;
  }

  private async simulateConstantTime(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}