import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase.client';
import { SupabaseAuthService } from '../services/auth.supabase.service';
import { User, AuthResponse, LoginCredentials, RegistrationData } from '../types/auth.types';
import { AuthError, ValidationError } from '../types/errors';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

interface AuthContextType {
  // State
  user: User | null;
  session: Session | null;
  loading: boolean;
  initializing: boolean;

  // Authentication methods
  signIn: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  signUp: (data: RegistrationData) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  
  // Password reset
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  
  // Biometric authentication
  enableBiometric: () => Promise<{ success: boolean; error?: string }>;
  signInWithBiometric: () => Promise<{ success: boolean; error?: string }>;
  isBiometricAvailable: () => Promise<boolean>;
  isBiometricEnabled: boolean;

  // Session management
  refreshSession: () => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authService = new SupabaseAuthService();

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  // Initialize authentication state
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        setInitializing(true);
        
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(initialSession);
          
          if (initialSession?.user) {
            const userData = await authService.getCurrentUser();
            setUser(userData);
            setIsBiometricEnabled(userData?.biometricEnabled || false);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    }

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setSession(session);
        
        if (session?.user && event !== 'SIGNED_OUT') {
          try {
            const userData = await authService.getCurrentUser();
            setUser(userData);
            setIsBiometricEnabled(userData?.biometricEnabled || false);
          } catch (error) {
            console.error('Error getting user data:', error);
            setUser(null);
            setIsBiometricEnabled(false);
          }
        } else {
          setUser(null);
          setIsBiometricEnabled(false);
        }

        // Handle specific auth events
        if (event === 'SIGNED_IN') {
          console.log('User signed in');
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          // Clear any stored biometric data
          await SecureStore.deleteItemAsync('biometric_enabled').catch(() => {});
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed');
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const result = await authService.login(credentials);
      
      // Store credentials for biometric authentication if enabled
      if (result.user.biometricEnabled) {
        await SecureStore.setItemAsync('biometric_email', credentials.email);
      }
      
      return { success: true };
    } catch (error) {
      let errorMessage = 'An unexpected error occurred';
      
      if (error instanceof AuthError) {
        errorMessage = error.message;
      } else if (error instanceof ValidationError) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (data: RegistrationData): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      await authService.register(data);
      return { success: true };
    } catch (error) {
      let errorMessage = 'An unexpected error occurred';
      
      if (error instanceof AuthError) {
        errorMessage = error.message;
      } else if (error instanceof ValidationError) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      await authService.logout();
      
      // Clear biometric data
      await SecureStore.deleteItemAsync('biometric_email').catch(() => {});
      await SecureStore.deleteItemAsync('biometric_enabled').catch(() => {});
      
      setUser(null);
      setSession(null);
      setIsBiometricEnabled(false);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      await authService.requestPasswordReset(email);
      return { success: true };
    } catch (error) {
      let errorMessage = 'An unexpected error occurred';
      
      if (error instanceof AuthError) {
        errorMessage = error.message;
      } else if (error instanceof ValidationError) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const isBiometricAvailable = async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  };

  const enableBiometric = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Check if biometric is available
      const available = await isBiometricAvailable();
      if (!available) {
        return { 
          success: false, 
          error: 'Biometric authentication is not available on this device' 
        };
      }

      // Test biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric login for FitFlow',
        fallbackLabel: 'Cancel',
        cancelLabel: 'Cancel',
      });

      if (!result.success) {
        return { success: false, error: 'Biometric authentication failed' };
      }

      // Enable biometric in backend
      await authService.enableBiometric();
      
      // Store locally
      await SecureStore.setItemAsync('biometric_enabled', 'true');
      if (user?.email) {
        await SecureStore.setItemAsync('biometric_email', user.email);
      }
      
      setIsBiometricEnabled(true);
      
      return { success: true };
    } catch (error) {
      let errorMessage = 'Failed to enable biometric authentication';
      
      if (error instanceof AuthError) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signInWithBiometric = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Check if biometric is available
      const available = await isBiometricAvailable();
      if (!available) {
        return { 
          success: false, 
          error: 'Biometric authentication is not available' 
        };
      }

      // Get stored email
      const storedEmail = await SecureStore.getItemAsync('biometric_email');
      if (!storedEmail) {
        return { 
          success: false, 
          error: 'No biometric credentials found. Please log in with email/password first.' 
        };
      }

      // Authenticate with biometrics
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login to FitFlow',
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
      });

      if (!result.success) {
        return { success: false, error: 'Biometric authentication failed' };
      }

      // For now, we'll need to use stored session or refresh token
      // In a production app, you'd have a secure way to authenticate with biometrics
      // This is a simplified implementation
      const currentSession = await authService.getSession();
      if (currentSession) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: 'Session expired. Please log in with email/password.' 
        };
      }
    } catch (error) {
      let errorMessage = 'Biometric authentication failed';
      
      if (error instanceof AuthError) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async (): Promise<void> => {
    try {
      await authService.refreshSession();
    } catch (error) {
      console.error('Error refreshing session:', error);
      // If refresh fails, sign out the user
      await signOut();
    }
  };

  const getCurrentUser = async (): Promise<User | null> => {
    try {
      return await authService.getCurrentUser();
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  };

  const value: AuthContextType = {
    // State
    user,
    session,
    loading,
    initializing,

    // Authentication methods
    signIn,
    signUp,
    signOut,

    // Password reset
    forgotPassword,

    // Biometric authentication
    enableBiometric,
    signInWithBiometric,
    isBiometricAvailable,
    isBiometricEnabled,

    // Session management
    refreshSession,
    getCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for protected routes
export function useRequireAuth() {
  const { user, loading, initializing } = useAuth();
  
  return {
    user,
    loading: loading || initializing,
    isAuthenticated: !!user,
  };
}

// Hook for auth-only routes (login, register, etc.)
export function useRequireGuest() {
  const { user, loading, initializing } = useAuth();
  
  return {
    user,
    loading: loading || initializing,
    isGuest: !user,
  };
}