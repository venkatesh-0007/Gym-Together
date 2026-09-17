import { UserProfile } from '../types/account';

export interface AuthUser extends UserProfile {
  email: string;
  authProvider: 'local' | 'firebase' | 'supabase';
  isGuest?: boolean;
}

export interface StoredAccount {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  profile: UserProfile;
  createdAt: string;
  lastLoginAt: string;
}

export interface SignUpPayload {
  name: string;
  email: string;
  password: string;
  username?: string;
  avatar?: string;
  bio?: string;
}

export interface LogInPayload {
  email: string;
  password: string;
}

export interface AuthSession {
  userId: string;
  token: string;
  expiresAt: number;
}

export type AuthErrorCode =
  | 'EMAIL_EXISTS'
  | 'INVALID_CREDENTIALS'
  | 'WEAK_PASSWORD'
  | 'INVALID_EMAIL'
  | 'USER_NOT_FOUND'
  | 'UNKNOWN_ERROR'
  | 'UNKNOWN';

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  errorCode?: AuthErrorCode | string;
  errorMessage?: string;
}
