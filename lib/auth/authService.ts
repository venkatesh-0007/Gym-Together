import {
  AuthUser,
  StoredAccount,
  SignUpPayload,
  LogInPayload,
  AuthResult,
} from './types';
import { supabase } from '../supabase/client';
import { UserProfile } from '../types/account';

const STORAGE_ACCOUNTS_KEY = 'irontrack_auth_accounts';
const STORAGE_SESSION_KEY = 'irontrack_auth_session';

class AuthService {
  private getStoredAccounts(): StoredAccount[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveStoredAccounts(accounts: StoredAccount[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error('Failed to save accounts to storage:', e);
    }
  }

  public getSession(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public setSession(user: AuthUser | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (!user) {
        localStorage.removeItem(STORAGE_SESSION_KEY);
      } else {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
      }
    } catch (e) {
      console.error('Failed to persist session:', e);
    }
  }

  public async signUp(payload: SignUpPayload): Promise<AuthResult> {
    const email = payload.email.trim().toLowerCase();
    const name = payload.name.trim();
    const password = payload.password;

    if (!name) return { success: false, errorCode: 'INVALID_CREDENTIALS', errorMessage: 'Full name is required.' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) return { success: false, errorCode: 'INVALID_EMAIL', errorMessage: 'Please enter a valid email address.' };
    if (!password || password.length < 6) return { success: false, errorCode: 'WEAK_PASSWORD', errorMessage: 'Password must be at least 6 characters long.' };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      return {
        success: false,
        errorCode: error.name || 'SIGNUP_ERROR',
        errorMessage: error.message,
      };
    }

    if (!data.user) {
      return { success: false, errorCode: 'UNKNOWN', errorMessage: 'User creation failed.' };
    }

    const randomCode = `GYM-${Math.floor(1000 + Math.random() * 9000)}`;
    const userProfile: AuthUser = {
      id: data.user.id,
      name: name,
      email: email,
      username: payload.username?.trim() || `@${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      avatar: payload.avatar || '⚡',
      bio: payload.bio?.trim() || '',
      buddyCode: randomCode,
      levelTitle: 'Gym Novice',
      weeklyGoal: 4,
      createdAt: new Date().toISOString(),
      authProvider: 'supabase',
    };

    // Store in Supabase 'profiles' table
    await supabase.from('profiles').upsert({
      id: userProfile.id,
      name: userProfile.name,
      email: userProfile.email,
      username: userProfile.username,
      avatar: userProfile.avatar,
      bio: userProfile.bio,
      buddy_code: userProfile.buddyCode,
      level_title: userProfile.levelTitle,
      weekly_goal: userProfile.weeklyGoal,
      created_at: userProfile.createdAt,
    });

    // Update local accounts list for multi-account fallback switching
    const accounts = this.getStoredAccounts();
    const accountIdx = accounts.findIndex((a) => a.id === data.user!.id);
    const storedAcc: StoredAccount = {
      id: data.user.id,
      email: email,
      passwordHash: 'supabase_managed',
      salt: 'supabase_managed',
      profile: userProfile,
      createdAt: userProfile.createdAt,
      lastLoginAt: userProfile.createdAt,
    };
    if (accountIdx >= 0) accounts[accountIdx] = storedAcc;
    else accounts.push(storedAcc);
    this.saveStoredAccounts(accounts);

    this.setSession(userProfile);
    return { success: true, user: userProfile };
  }

  public async logIn(payload: LogInPayload): Promise<AuthResult> {
    const email = payload.email.trim().toLowerCase();
    const password = payload.password;

    if (!email || !password) {
      return { success: false, errorCode: 'INVALID_CREDENTIALS', errorMessage: 'Please enter both your email and password.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return {
        success: false,
        errorCode: error.name || 'LOGIN_ERROR',
        errorMessage: error.message,
      };
    }

    if (!data.user) {
      return { success: false, errorCode: 'UNKNOWN', errorMessage: 'Login failed.' };
    }

    // Fetch profile
    let profileData: any = {};
    const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
    if (dbProfile) profileData = dbProfile;

    const authUser: AuthUser = {
      id: data.user.id,
      name: profileData.name || data.user.user_metadata?.name || 'Lifter',
      email: email,
      username: profileData.username || `@${(profileData.name || 'lifter').toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      avatar: profileData.avatar || '⚡',
      bio: profileData.bio || '',
      buddyCode: profileData.buddy_code || `GYM-${Math.floor(1000 + Math.random() * 9000)}`,
      levelTitle: profileData.level_title || 'Gym Novice',
      weeklyGoal: profileData.weekly_goal || 4,
      createdAt: profileData.created_at || new Date().toISOString(),
      authProvider: 'supabase',
    };

    const accounts = this.getStoredAccounts();
    const accountIdx = accounts.findIndex((a) => a.id === data.user!.id);
    const storedAcc: StoredAccount = {
      id: data.user.id,
      email: email,
      passwordHash: 'supabase_managed',
      salt: 'supabase_managed',
      profile: authUser,
      createdAt: authUser.createdAt,
      lastLoginAt: new Date().toISOString(),
    };
    if (accountIdx >= 0) accounts[accountIdx] = storedAcc;
    else accounts.push(storedAcc);
    this.saveStoredAccounts(accounts);

    this.setSession(authUser);
    return { success: true, user: authUser };
  }

  public async logOut(): Promise<void> {
    await supabase.auth.signOut();
    this.setSession(null);
  }

  public updateAccountProfile(userId: string, updates: Partial<UserProfile>): AuthUser | null {
    const accounts = this.getStoredAccounts();
    const index = accounts.findIndex((a) => a.id === userId);

    if (index !== -1) {
      accounts[index].profile = { ...accounts[index].profile, ...updates };
      this.saveStoredAccounts(accounts);

      const currentSession = this.getSession();
      if (currentSession && currentSession.id === userId) {
        const updatedUser: AuthUser = { ...currentSession, ...updates };
        this.setSession(updatedUser);

        // Map camelCase to snake_case for Supabase
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.username !== undefined) dbUpdates.username = updates.username;
        if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
        if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
        if (updates.buddyCode !== undefined) dbUpdates.buddy_code = updates.buddyCode;
        if (updates.levelTitle !== undefined) dbUpdates.level_title = updates.levelTitle;
        if (updates.weeklyGoal !== undefined) dbUpdates.weekly_goal = updates.weeklyGoal;

        if (Object.keys(dbUpdates).length > 0) {
          supabase.from('profiles').update(dbUpdates).eq('id', userId).catch(err => console.warn('Supabase profile sync error:', err));
        }
        return updatedUser;
      }
    }
    return null;
  }

  public getAllAccounts(): StoredAccount[] {
    return this.getStoredAccounts();
  }
}

export const authService = new AuthService();

