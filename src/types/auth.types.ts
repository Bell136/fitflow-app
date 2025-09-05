export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  provider?: 'local' | 'google' | 'apple';
  emailVerified: boolean;
  biometricEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
}

export interface RegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  weight?: number;
  height?: number;
  fitnessGoal?: 'lose_weight' | 'gain_muscle' | 'maintain_health' | 'increase_strength' | 'improve_endurance';
  termsAccepted: boolean;
}

export interface PasswordStrength {
  score: number; // 0-4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
  deviceInfo?: DeviceInfo;
}

export interface SocialAuthData {
  provider: 'google' | 'apple';
  idToken: string;
  user?: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface DeviceInfo {
  id: string;
  name?: string;
  platform?: string;
}

export interface Session {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  deviceInfo?: DeviceInfo;
  expiresAt: Date;
  createdAt: Date;
}

export interface PasswordResetRequest {
  email: string;
  code: string;
  expiresAt: Date;
}

export interface PasswordResetData {
  email: string;
  code: string;
  newPassword: string;
}