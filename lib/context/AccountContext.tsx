'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile, DEFAULT_PROFILES, getLevelTitle } from '../types/account';
import { AuthUser, LogInPayload, SignUpPayload, AuthResult } from '../auth/types';
import { authService } from '../auth/authService';
import { triggerHaptic } from '../utils/haptics';
import { supabase } from '../supabase/client';

interface AccountContextType {
  activeProfile: UserProfile;
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  login: (payload: LogInPayload) => Promise<AuthResult>;
  signup: (payload: SignUpPayload) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateProfile: (updated: Partial<UserProfile>) => void;
  updateLevelTitle: (totalWorkouts: number) => void;
}

const STORAGE_ACTIVE_ID_KEY = 'irontrack_active_profile_id';

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [activeProfile, setActiveProfileState] = useState<UserProfile>(DEFAULT_PROFILES[0]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // 1. Check active session
      const session = authService.getSession();
      if (session) {
        setCurrentUser(session);
        setActiveProfileState(session);
      } else {
        setActiveProfileState(DEFAULT_PROFILES[0]);
      }
    } catch (e) {
      console.error('Error initializing accounts/auth:', e);
    }

    // Subscribe to live Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        let dbProfile: any = null;
        try {
          const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          if (data) dbProfile = data;
        } catch (e) {
          console.warn('Could not fetch profile in onAuthStateChange:', e);
        }

        const authUser: AuthUser = {
          id: session.user.id,
          name: dbProfile?.name || session.user.user_metadata?.name || 'User',
          email: session.user.email!,
          username: dbProfile?.username || `@${(session.user.user_metadata?.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          avatar: dbProfile?.avatar || '👤',
          bio: dbProfile?.bio || '',
          buddyCode: dbProfile?.buddy_code || `GYM-${Math.floor(1000 + Math.random() * 9000)}`,
          levelTitle: dbProfile?.level_title || 'Gym Novice',
          weeklyGoal: dbProfile?.weekly_goal || 4,
          createdAt: dbProfile?.created_at || new Date().toISOString(),
          authProvider: 'supabase',
        };

        if (!dbProfile) {
          await supabase.from('profiles').upsert({
            id: authUser.id,
            name: authUser.name,
            email: authUser.email,
            username: authUser.username,
            avatar: authUser.avatar,
            bio: authUser.bio,
            buddy_code: authUser.buddyCode,
            level_title: authUser.levelTitle,
            weekly_goal: authUser.weeklyGoal,
            created_at: authUser.createdAt,
          }).then(({ error }) => {
            if (error) console.warn('Failed to auto-repair profile:', error);
          });
        }

        setCurrentUser(authUser);
        setActiveProfileState(authUser);
        authService.setSession(authUser);
      } else {
        if (event === 'SIGNED_OUT') {
           setCurrentUser(null);
           authService.setSession(null);
           setActiveProfileState(DEFAULT_PROFILES[0]);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (payload: LogInPayload): Promise<AuthResult> => {
    const result = await authService.logIn(payload);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setActiveProfileState(result.user);
      triggerHaptic('success');
    }
    return result;
  }, []);

  const signup = useCallback(async (payload: SignUpPayload): Promise<AuthResult> => {
    const result = await authService.signUp(payload);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setActiveProfileState(result.user);
      triggerHaptic('success');
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    await authService.logOut();
    setCurrentUser(null);
    setActiveProfileState(DEFAULT_PROFILES[0]);
    triggerHaptic('medium');
  }, []);

  const updateProfile = useCallback(async (updatedFields: Partial<UserProfile>) => {
    const updated = { ...activeProfile, ...updatedFields };
    setActiveProfileState(updated);
    if (currentUser) {
      setCurrentUser({ ...currentUser, ...updatedFields });
      authService.setSession({ ...currentUser, ...updatedFields });
      
      // Sync to supabase
      const { error } = await supabase.from('profiles').update({
        name: updated.name,
        username: updated.username,
        avatar: updated.avatar,
        bio: updated.bio,
        weekly_goal: updated.weeklyGoal,
        level_title: updated.levelTitle,
      }).eq('id', currentUser.id);

      if (error) {
        console.error('Failed to sync profile update to supabase', error);
      }
    }
    triggerHaptic('light');
  }, [activeProfile, currentUser]);

  const updateLevelTitle = useCallback((totalWorkouts: number) => {
    const newTitle = getLevelTitle(totalWorkouts);
    if (newTitle !== activeProfile.levelTitle) {
      updateProfile({ levelTitle: newTitle });
    }
  }, [activeProfile.levelTitle, updateProfile]);

  return (
    <AccountContext.Provider
      value={{
        activeProfile,
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        signup,
        logout,
        updateProfile,
        updateLevelTitle,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}
