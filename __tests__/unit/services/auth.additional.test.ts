import { AuthService } from '../../../src/services/auth.service';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { AuthError, ValidationError } from '../../../src/types/errors';

// Mock SecureStore and LocalAuthentication
jest.mock('expo-secure-store');
jest.mock('expo-local-authentication');

describe('Additional Authentication Tests for Coverage', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
    
    // Setup default mocks
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
  });

  describe('Edge Cases and Error Scenarios', () => {
    test('should handle biometric authentication failure', async () => {
      // Create and register user
      await authService.register({
        email: 'bio@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
      });

      // Enable biometric
      await authService.enableBiometric('bio@example.com');

      // Mock biometric failure
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: false });

      // Attempt biometric login
      await expect(
        authService.loginWithBiometric('bio@example.com')
      ).rejects.toThrow('Biometric authentication failed');
    });

    test('should handle unavailable biometric hardware', async () => {
      // Create user
      await authService.register({
        email: 'nobio@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
      });

      // Mock no hardware
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);

      // Try to enable biometric
      await expect(
        authService.enableBiometric('nobio@example.com')
      ).rejects.toThrow('Biometric authentication not available');
    });

    test('should handle biometric not enrolled', async () => {
      // Create user
      await authService.register({
        email: 'notenrolled@example.com',
        password: 'SecurePass123!',
        firstName: 'Bob',
      });

      // Mock hardware available but not enrolled
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);

      // Try to enable biometric
      await expect(
        authService.enableBiometric('notenrolled@example.com')
      ).rejects.toThrow('Biometric authentication not available');
    });

    test('should handle getCurrentSession when no tokens in SecureStore', async () => {
      // Mock no tokens in SecureStore
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.getCurrentSession()
      ).rejects.toThrow('No active session');
    });

    test('should not auto-refresh token if not close to expiry', async () => {
      // Create user and login
      await authService.register({
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
      });
      
      const result = await authService.login({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

      // Mock SecureStore to return tokens
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key) => {
        if (key === 'accessToken') return Promise.resolve(result.accessToken);
        if (key === 'refreshToken') return Promise.resolve(result.refreshToken);
        return Promise.resolve(null);
      });

      // Get current session (token is fresh, shouldn't refresh)
      const session = await authService.getCurrentSession();
      expect(session.accessToken).toBe(result.accessToken);
    });

    test('should handle login with non-existent user for timing attack prevention', async () => {
      const start = Date.now();
      
      await expect(
        authService.login({
          email: 'doesnotexist@example.com',
          password: 'SomePassword123!',
        })
      ).rejects.toThrow('Invalid credentials');

      const elapsed = Date.now() - start;
      // Should still take ~100ms due to constant time
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    test('should handle login with user without password (social auth user)', async () => {
      // Create social auth user
      await authService.socialAuth({
        provider: 'google',
        idToken: 'google-token-123',
      });

      // Try to login with password (should fail)
      await expect(
        authService.login({
          email: 'verified_email_google-token-123@example.com',
          password: 'AnyPassword123!',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    test('should handle expired refresh token', async () => {
      // Create user and login
      await authService.register({
        email: 'expired@example.com',
        password: 'SecurePass123!',
        firstName: 'Expired',
      });
      
      const result = await authService.login({
        email: 'expired@example.com',
        password: 'SecurePass123!',
      });

      // Create an expired refresh token
      const expiredRefreshToken = 'expired_refresh_token';
      
      await expect(
        authService.refreshTokens(expiredRefreshToken)
      ).rejects.toThrow('Invalid refresh token');
    });

    test('should handle biometric login for user without biometric enabled', async () => {
      // Create user but don't enable biometric
      await authService.register({
        email: 'nobiometric@example.com',
        password: 'SecurePass123!',
        firstName: 'NoBio',
      });

      await expect(
        authService.loginWithBiometric('nobiometric@example.com')
      ).rejects.toThrow('Biometric authentication not enabled');
    });

    test('should handle biometric login for non-existent user', async () => {
      await expect(
        authService.loginWithBiometric('nonexistent@example.com')
      ).rejects.toThrow('User not found');
    });

    test('should validate all password requirements individually', async () => {
      const testCases = [
        { password: 'short', error: 'Password must be at least 8 characters' },
        { password: 'nouppercase123!', error: 'Password must contain at least one uppercase letter' },
        { password: 'NOLOWERCASE123!', error: 'Password must contain at least one lowercase letter' },
        { password: 'NoNumbers!', error: 'Password must contain at least one number' },
        { password: 'NoSpecialChars123', error: 'Password must contain at least one special character' },
      ];

      for (const { password, error } of testCases) {
        await expect(
          authService.register({
            email: `test${Date.now()}@example.com`,
            password,
            firstName: 'Test',
          })
        ).rejects.toThrow(ValidationError);
      }
    });

    test('should handle getActiveSessions for non-existent user', async () => {
      const sessions = await authService.getActiveSessions('nonexistent@example.com');
      expect(sessions).toHaveLength(0);
    });

    test('should handle enableBiometric for non-existent user', async () => {
      await expect(
        authService.enableBiometric('nonexistent@example.com')
      ).rejects.toThrow('User not found');
    });

    test('should handle password reset for user without password (social auth)', async () => {
      // Create social auth user
      const socialResult = await authService.socialAuth({
        provider: 'apple',
        idToken: 'apple-token-456',
      });

      // Request password reset
      const resetRequest = await authService.requestPasswordReset(socialResult.user.email);

      // Should be able to set a password
      await expect(
        authService.resetPassword({
          email: socialResult.user.email,
          code: resetRequest.code,
          newPassword: 'NewPassword123!',
        })
      ).resolves.toBe(true);
    });
  });
});