import { supabase } from './supabase.client';
import { AuthError as SupabaseAuthError } from '@supabase/supabase-js';
import { AuthError, ValidationError } from '../types/errors';
import {
  User,
  AuthResponse,
  RegistrationData,
  LoginCredentials,
  SocialAuthData,
} from '../types/auth.types';

export class SupabaseAuthService {
  /**
   * Register a new user with email and password
   */
  async register(data: RegistrationData): Promise<AuthResponse> {
    // Validate email and password
    this.validateEmail(data.email);
    this.validatePassword(data.password);

    // Validate additional fields
    if (data.password !== data.confirmPassword) {
      throw new ValidationError('Passwords do not match');
    }

    if (!data.termsAccepted) {
      throw new ValidationError('You must accept the terms and conditions');
    }

    // Validate age, weight, height if provided
    if (data.age !== undefined && (data.age < 13 || data.age > 120)) {
      throw new ValidationError('Please enter a valid age (13-120)');
    }
    
    if (data.weight !== undefined && (data.weight < 20 || data.weight > 1000)) {
      throw new ValidationError('Please enter a valid weight');
    }
    
    if (data.height !== undefined && (data.height < 30 || data.height > 300)) {
      throw new ValidationError('Please enter a valid height');
    }

    try {
      // Sign up with Supabase Auth
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            age: data.age,
            weight: data.weight,
            height: data.height,
            fitnessGoal: data.fitnessGoal,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          throw new ValidationError('Email already exists');
        }
        throw new AuthError(error.message);
      }

      if (!authData.user || !authData.session) {
        throw new AuthError('Registration failed');
      }

      // Create user profile in our User table
      const { data: userProfile, error: profileError } = await supabase
        .from('User')
        .insert({
          id: authData.user.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          provider: 'LOCAL',
          emailVerified: false,
          biometricEnabled: false,
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }

      // Create initial user profile with fitness data if provided
      if (data.age || data.weight || data.height || data.fitnessGoal) {
        const { error: profileDataError } = await supabase
          .from('UserProfile')
          .insert({
            userId: authData.user.id,
            age: data.age,
            weight: data.weight,
            height: data.height,
            fitnessGoal: data.fitnessGoal,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

        if (profileDataError) {
          console.error('Error creating user fitness profile:', profileDataError);
        }
      }

      return {
        user: this.mapSupabaseUser(authData.user, userProfile),
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
      };
    } catch (error) {
      if (error instanceof AuthError || error instanceof ValidationError) {
        throw error;
      }
      throw new AuthError('Registration failed');
    }
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new AuthError('Invalid credentials');
        }
        throw new AuthError(error.message);
      }

      if (!data.user || !data.session) {
        throw new AuthError('Login failed');
      }

      // Get user profile
      const { data: userProfile } = await supabase
        .from('User')
        .select()
        .eq('id', data.user.id)
        .single();

      // Store device info if provided
      if (credentials.deviceInfo) {
        await this.storeSession(data.user.id, data.session, credentials.deviceInfo);
      }

      return {
        user: this.mapSupabaseUser(data.user, userProfile),
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Login failed');
    }
  }

  /**
   * Social authentication (Google, Apple)
   */
  async socialAuth(data: SocialAuthData): Promise<AuthResponse> {
    try {
      const { data: authData, error } = await supabase.auth.signInWithOAuth({
        provider: data.provider === 'google' ? 'google' : 'apple',
        options: {
          redirectTo: process.env.EXPO_PUBLIC_API_URL + '/auth/callback',
        },
      });

      if (error) {
        throw new AuthError(error.message);
      }

      // Note: OAuth flow will redirect, so we won't get immediate session data
      // The session will be established after redirect
      return {
        user: {} as User, // Will be populated after redirect
        accessToken: '',
        refreshToken: '',
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Social authentication failed');
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new AuthError(error.message);
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.EXPO_PUBLIC_API_URL + '/auth/reset-password',
    });

    if (error) {
      throw new AuthError(error.message);
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(newPassword: string): Promise<void> {
    this.validatePassword(newPassword);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new AuthError(error.message);
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('User')
      .select()
      .eq('id', user.id)
      .single();

    return this.mapSupabaseUser(user, userProfile);
  }

  /**
   * Get current session
   */
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  /**
   * Refresh the session
   */
  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      throw new AuthError(error.message);
    }

    return data.session;
  }

  /**
   * Enable biometric authentication for the current user
   */
  async enableBiometric(): Promise<void> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new AuthError('No authenticated user');
    }

    const { error } = await supabase
      .from('User')
      .update({ biometricEnabled: true })
      .eq('id', user.id);

    if (error) {
      throw new AuthError('Failed to enable biometric authentication');
    }
  }

  /**
   * Store session information
   */
  private async storeSession(userId: string, session: any, deviceInfo?: any) {
    try {
      await supabase
        .from('Session')
        .insert({
          userId,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          deviceId: deviceInfo?.id,
          deviceName: deviceInfo?.name,
          platform: deviceInfo?.platform,
          expiresAt: new Date(Date.now() + session.expires_in * 1000).toISOString(),
        });
    } catch (error) {
      console.error('Error storing session:', error);
    }
  }

  /**
   * Map Supabase user to our User type
   */
  private mapSupabaseUser(supabaseUser: any, userProfile?: any): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      firstName: userProfile?.firstName || supabaseUser.user_metadata?.firstName,
      lastName: userProfile?.lastName || supabaseUser.user_metadata?.lastName,
      provider: userProfile?.provider || 'LOCAL',
      emailVerified: supabaseUser.email_confirmed_at !== null,
      biometricEnabled: userProfile?.biometricEnabled || false,
      createdAt: new Date(supabaseUser.created_at),
      updatedAt: new Date(userProfile?.updatedAt || supabaseUser.updated_at || supabaseUser.created_at),
    };
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    const requirements = [
      { regex: /[a-z]/, message: 'lowercase letter' },
      { regex: /[A-Z]/, message: 'uppercase letter' },
      { regex: /[0-9]/, message: 'number' },
      { regex: /[!@#$%^&*(),.?":{}|<>]/, message: 'special character' },
    ];

    const failedRequirements = requirements
      .filter(req => !req.regex.test(password))
      .map(req => req.message);

    if (failedRequirements.length > 0) {
      throw new ValidationError(
        `Password must contain at least one ${failedRequirements.join(', ')}`
      );
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}