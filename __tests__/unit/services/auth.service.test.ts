import { AuthService } from '../../../src/services/auth.service';
import * as SecureStore from 'expo-secure-store';
import { AuthError, ValidationError } from '../../../src/types/errors';

// Mock SecureStore
jest.mock('expo-secure-store');

describe('Authentication Service', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('User Registration', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
    };

    test('should create new user with valid email and password', async () => {
      // Act
      const result = await authService.register(validRegistrationData);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(validRegistrationData.email);
      expect(result.user.firstName).toBe(validRegistrationData.firstName);
    });

    test('should hash password with bcrypt before storing', async () => {
      // Act
      const result = await authService.register(validRegistrationData);

      // Assert
      expect('password' in result.user).toBe(false); // Password should not be returned
      const isPasswordHashed = await authService.verifyPasswordHash(
        validRegistrationData.password,
        result.user.id
      );
      expect(isPasswordHashed).toBe(true);
    });

    test('should reject duplicate email addresses', async () => {
      // Arrange
      await authService.register(validRegistrationData);

      // Act & Assert
      await expect(
        authService.register(validRegistrationData)
      ).rejects.toThrow(ValidationError);
      await expect(
        authService.register(validRegistrationData)
      ).rejects.toThrow('Email already exists');
    });

    test('should validate password strength requirements', async () => {
      const weakPasswords = [
        'short',                 // Too short
        'nouppercase123!',       // No uppercase
        'NOLOWERCASE123!',       // No lowercase
        'NoNumbers!',            // No numbers
        'NoSpecialChars123',     // No special chars
      ];

      for (const password of weakPasswords) {
        await expect(
          authService.register({ ...validRegistrationData, password })
        ).rejects.toThrow(ValidationError);
      }
    });

    test('should send verification email after registration', async () => {
      // Spy on email service
      const sendEmailSpy = jest.spyOn(authService, 'sendVerificationEmail');

      // Act
      await authService.register(validRegistrationData);

      // Assert
      expect(sendEmailSpy).toHaveBeenCalledWith(validRegistrationData.email);
    });

    test('should handle social authentication (Google, Apple)', async () => {
      // Test Google Auth
      const googleResult = await authService.socialAuth({
        provider: 'google',
        idToken: 'mock-google-token',
      });

      expect(googleResult).toHaveProperty('user');
      expect(googleResult).toHaveProperty('accessToken');
      expect(googleResult.user.provider).toBe('google');

      // Test Apple Auth
      const appleResult = await authService.socialAuth({
        provider: 'apple',
        idToken: 'mock-apple-token',
      });

      expect(appleResult.user.provider).toBe('apple');
    });
  });

  describe('User Login', () => {
    const validCredentials = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    beforeEach(async () => {
      // Setup: Create a user first
      await authService.register({
        ...validCredentials,
        firstName: 'John',
      });
    });

    test('should authenticate user with valid credentials', async () => {
      // Act
      const result = await authService.login(validCredentials);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(validCredentials.email);
    });

    test('should return JWT tokens (access + refresh)', async () => {
      // Act
      const result = await authService.login(validCredentials);

      // Assert
      expect(result.accessToken).toMatch(/^eyJ/); // JWT token pattern
      expect(result.refreshToken).toMatch(/^[A-Za-z0-9-_]+$/);
      
      // Verify tokens are different
      expect(result.accessToken).not.toBe(result.refreshToken);
    });

    test('should implement rate limiting (5 attempts per 15 minutes)', async () => {
      const wrongCredentials = {
        email: validCredentials.email,
        password: 'WrongPassword123!',
      };

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await expect(
          authService.login(wrongCredentials)
        ).rejects.toThrow(AuthError);
      }

      // 6th attempt should be rate limited
      await expect(
        authService.login(wrongCredentials)
      ).rejects.toThrow('Too many failed attempts. Please try again later.');
    });

    test('should support biometric authentication', async () => {
      // Setup: Enable biometric for user
      await authService.enableBiometric(validCredentials.email);

      // Mock biometric authentication
      const mockBiometric = jest
        .spyOn(authService, 'authenticateWithBiometric')
        .mockResolvedValue(true);

      // Act
      const result = await authService.loginWithBiometric(validCredentials.email);

      // Assert
      expect(mockBiometric).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
    });

    test('should handle refresh token rotation', async () => {
      // Initial login
      const loginResult = await authService.login(validCredentials);
      const initialRefreshToken = loginResult.refreshToken;

      // Refresh tokens
      const refreshResult = await authService.refreshTokens(initialRefreshToken);

      // Assert
      expect(refreshResult.accessToken).toBeDefined();
      expect(refreshResult.refreshToken).toBeDefined();
      expect(refreshResult.refreshToken).not.toBe(initialRefreshToken);
      
      // Old refresh token should be invalidated
      await expect(
        authService.refreshTokens(initialRefreshToken)
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('Session Management', () => {
    const testUser = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
    };

    beforeEach(async () => {
      // Create user first
      await authService.register(testUser);
    });

    test('should maintain 30-day sessions', async () => {
      // Login
      const result = await authService.login({
        email: testUser.email,
        password: testUser.password,
      });

      // Check session expiry
      const session = await authService.getSession(result.accessToken);
      const expiryDate = new Date(session.expiresAt);
      const now = new Date();
      const daysDifference = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      expect(Math.round(daysDifference)).toBe(30);
    });

    test('should auto-refresh tokens before expiry', async () => {
      // Login
      const result = await authService.login({
        email: testUser.email,
        password: testUser.password,
      });

      // Mock SecureStore to return our tokens
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key) => {
        if (key === 'accessToken') return Promise.resolve(result.accessToken);
        if (key === 'refreshToken') return Promise.resolve(result.refreshToken);
        return Promise.resolve(null);
      });

      // Token should be auto-refreshed when close to expiry
      const newSession = await authService.getCurrentSession();
      expect(newSession).toBeDefined();
      expect(newSession.accessToken).toBe(result.accessToken);
    });

    test('should handle concurrent device sessions', async () => {
      // Login from device 1
      const session1 = await authService.login({
        ...testUser,
        deviceInfo: { id: 'device-1', name: 'iPhone' },
      });

      // Login from device 2
      const session2 = await authService.login({
        ...testUser,
        deviceInfo: { id: 'device-2', name: 'iPad' },
      });

      // Both sessions should be valid
      const validSession1 = await authService.validateSession(session1.accessToken);
      const validSession2 = await authService.validateSession(session2.accessToken);

      expect(validSession1).toBeDefined();
      expect(validSession2).toBeDefined();

      // Get all active sessions
      const sessions = await authService.getActiveSessions(testUser.email);
      expect(sessions).toHaveLength(2);
    });

    test('should support secure logout', async () => {
      // Login
      const result = await authService.login(testUser);

      // Mock SecureStore to return the access token
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(result.accessToken);

      // Store token in SecureStore
      await SecureStore.setItemAsync('accessToken', result.accessToken);
      await SecureStore.setItemAsync('refreshToken', result.refreshToken);

      // Logout
      await authService.logout();

      // Tokens should be removed from SecureStore
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('accessToken');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');

      // Token should be invalidated on server
      await expect(
        authService.validateSession(result.accessToken)
      ).rejects.toThrow('Invalid session');
    });
  });

  describe('Security Features', () => {
    beforeEach(async () => {
      // Create test user
      await authService.register({
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
      });
    });

    test('should store tokens securely in device keychain/keystore', async () => {
      // Clear mock calls from beforeEach
      (SecureStore.setItemAsync as jest.Mock).mockClear();
      
      const result = await authService.login({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

      // Verify SecureStore was called
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'accessToken',
        result.accessToken
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'refreshToken',
        result.refreshToken
      );
    });

    test('should validate email format correctly', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
      ];

      for (const email of invalidEmails) {
        await expect(
          authService.register({
            email,
            password: 'SecurePass123!',
            firstName: 'John',
          })
        ).rejects.toThrow(ValidationError);
      }
    });

    test('should handle token expiry gracefully', async () => {
      // Mock expired token
      const expiredToken = 'expired-token';

      // First test - token doesn't exist
      await expect(
        authService.validateSession(expiredToken)
      ).rejects.toThrow('Invalid session');
      
      // Create a session with expired time for second test
      const result = await authService.login({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });
      
      // Manually set the session to expired by modifying the internal state
      // This is a test-specific workaround since we can't directly access private members
      const session = await authService.getSession(result.accessToken);
      session.expiresAt = new Date(Date.now() - 1000); // Set to past
      
      // Now it should throw Session expired
      await expect(
        authService.validateSession(result.accessToken)
      ).rejects.toThrow('Session expired');
    });

    test('should prevent timing attacks on login', async () => {
      // Test with non-existent user
      const start1 = Date.now();
      await authService.login({
        email: 'nonexistent@example.com',
        password: 'SomePassword123!',
      }).catch(() => {});
      const time1 = Date.now() - start1;

      // Test with wrong password
      const start2 = Date.now();
      await authService.login({
        email: 'test@example.com',
        password: 'WrongPassword123!',
      }).catch(() => {});
      const time2 = Date.now() - start2;

      // Both should take approximately 100ms due to constant time simulation
      expect(time1).toBeGreaterThanOrEqual(100);
      expect(time2).toBeGreaterThanOrEqual(100);
      // Response times should be similar
      expect(Math.abs(time1 - time2)).toBeLessThan(100);
    });
  });

  describe('Password Reset', () => {
    beforeEach(async () => {
      // Create test user
      await authService.register({
        email: 'test@example.com',
        password: 'OldPassword123!',
        firstName: 'John',
      });
    });

    test('should send password reset email', async () => {
      const email = 'test@example.com';
      const sendEmailSpy = jest.spyOn(authService, 'sendPasswordResetEmail');

      await authService.requestPasswordReset(email);

      expect(sendEmailSpy).toHaveBeenCalledWith(email);
    });

    test('should validate reset code before allowing password change', async () => {
      const email = 'test@example.com';
      const resetRequest = await authService.requestPasswordReset(email);
      const resetCode = resetRequest.code;

      // Valid code should work
      await expect(
        authService.resetPassword({
          email,
          code: resetCode,
          newPassword: 'NewSecurePass123!',
        })
      ).resolves.toBeTruthy();

      // Invalid code should fail
      await expect(
        authService.resetPassword({
          email,
          code: 'invalid-code',
          newPassword: 'NewSecurePass123!',
        })
      ).rejects.toThrow('Invalid or expired reset code');
    });

    test('should force logout from all devices after password reset', async () => {
      const email = 'test@example.com';

      // Login from multiple devices (user already created in beforeEach)
      const session1 = await authService.login({
        email,
        password: 'OldPassword123!',
        deviceInfo: { id: 'device-1' },
      });

      const session2 = await authService.login({
        email,
        password: 'OldPassword123!',
        deviceInfo: { id: 'device-2' },
      });

      // Reset password
      const resetRequest = await authService.requestPasswordReset(email);
      await authService.resetPassword({
        email,
        code: resetRequest.code,
        newPassword: 'NewSecurePass123!',
      });

      // All sessions should be invalidated
      await expect(
        authService.validateSession(session1.accessToken)
      ).rejects.toThrow('Invalid session');

      await expect(
        authService.validateSession(session2.accessToken)
      ).rejects.toThrow('Invalid session');
    });
  });
});