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
  firstName?: string;
  lastName?: string;
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