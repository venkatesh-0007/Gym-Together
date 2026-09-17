'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile, DEFAULT_PROFILES, getLevelTitle } from '../types/account';
import { AuthUser, LogInPayload, SignUpPayload, AuthResult } from '../auth/types';
import { authService } from '../auth/authService';
import { triggerHaptic } from '../utils/haptics';
import { supabase } from '../supabase/client';

interface AccountContextType {
  activeProfile: UserProfile;
  allProfiles: UserProfile[];
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  login: (payload: LogInPayload) => Promise<AuthResult>;
  signup: (payload: SignUpPayload) => Promise<AuthResult>;
  logout: () => Promise<void>;
  switchProfile: (profileId: string) => void;
  createProfile: (profile: Omit<UserProfile, 'id' | 'createdAt' | 'buddyCode' | 'levelTitle'>) => UserProfile;
  updateProfile: (updated: Partial<UserProfile>) => void;
  deleteProfile: (profileId: string) => void;
  updateLevelTitle: (totalWorkouts: number) => void;
}

const STORAGE_PROFILES_KEY = 'irontrack_user_profiles';
const STORAGE_ACTIVE_ID_KEY = 'irontrack_active_profile_id';

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>(DEFAULT_PROFILES);
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
      }

      // 2. Load stored profiles list
      const storedProfilesRaw = localStorage.getItem(STORAGE_PROFILES_KEY);
      let loadedProfiles: UserProfile[] = DEFAULT_PROFILES;
      if (storedProfilesRaw) {
        const parsed = JSON.parse(storedProfilesRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedProfiles = parsed;
        }
      }

      // Merge accounts from authService
      const registeredAccounts = authService.getAllAccounts();
      registeredAccounts.forEach((acc) => {
        if (!loadedProfiles.some((p) => p.id === acc.id)) {
          loadedProfiles.push({ ...acc.profile, email: acc.email });
        }
      });

      setAllProfiles(loadedProfiles);

      if (!session) {
        const activeId = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
        const matched = loadedProfiles.find((p) => p.id === activeId);
        if (matched) {
          setActiveProfileState(matched);
        } else {
          setActiveProfileState(loadedProfiles[0]);
        }
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
          name: dbProfile?.name || session.user.user_metadata?.name || 'Lifter',
          email: session.user.email!,
          username: dbProfile?.username || `@${(session.user.user_metadata?.name || 'lifter').toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          avatar: dbProfile?.avatar || '⚡',
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
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const persistProfiles = (profiles: UserProfile[], currentActiveId?: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(profiles));
      if (currentActiveId) {
        localStorage.setItem(STORAGE_ACTIVE_ID_KEY, currentActiveId);
      }
    } catch (e) {
      console.error('Failed to save profiles to storage:', e);
    }
  };

  const login = useCallback(async (payload: LogInPayload): Promise<AuthResult> => {
    const result = await authService.logIn(payload);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setActiveProfileState(result.user);

      setAllProfiles((prev) => {
        const exists = prev.some((p) => p.id === result.user!.id);
        const updated = exists
          ? prev.map((p) => (p.id === result.user!.id ? result.user! : p))
          : [...prev, result.user!];
        persistProfiles(updated, result.user!.id);
        return updated;
      });

      triggerHaptic('success');
    }
    return result;
  }, []);

  const signup = useCallback(async (payload: SignUpPayload): Promise<AuthResult> => {
    const result = await authService.signUp(payload);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setActiveProfileState(result.user);

      setAllProfiles((prev) => {
        const updated = [...prev, result.user!];
        persistProfiles(updated, result.user!.id);
        return updated;
      });

      triggerHaptic('success');
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    await authService.logOut();
    setCurrentUser(null);

    const guestProfile: UserProfile = {
      ...DEFAULT_PROFILES[0],
      id: `guest_${Date.now()}`,
      name: 'Guest Lifter',
      username: '@guest',
      isGuest: true,
    };
    setActiveProfileState(guestProfile);
    triggerHaptic('warning');
  }, []);

  const switchProfile = useCallback(
    (profileId: string) => {
      const found = allProfiles.find((p) => p.id === profileId);
      if (found) {
        triggerHaptic('medium');
        setActiveProfileState(found);
        persistProfiles(allProfiles, found.id);

        const authAccounts = authService.getAllAccounts();
        const matchedAuth = authAccounts.find((a) => a.id === found.id);
        if (matchedAuth) {
          const authUser: AuthUser = {
            ...matchedAuth.profile,
            email: matchedAuth.email,
            authProvider: 'local',
          };
          authService.setSession(authUser);
          setCurrentUser(authUser);
        } else {
          authService.setSession(null);
          setCurrentUser(null);
        }
      }
    },
    [allProfiles]
  );

  const createProfile = useCallback(
    (data: Omit<UserProfile, 'id' | 'createdAt' | 'buddyCode' | 'levelTitle'>): UserProfile => {
      const newId = `user_${Date.now()}`;
      const randomCode = `GYM-${Math.floor(1000 + Math.random() * 9000)}`;
      const newProfile: UserProfile = {
        ...data,
        id: newId,
        buddyCode: randomCode,
        levelTitle: 'Gym Novice',
        createdAt: new Date().toISOString(),
      };

      const updated = [...allProfiles, newProfile];
      setAllProfiles(updated);
      setActiveProfileState(newProfile);
      persistProfiles(updated, newProfile.id);
      triggerHaptic('success');
      return newProfile;
    },
    [allProfiles]
  );

  const updateProfile = useCallback(
    (updatedData: Partial<UserProfile>) => {
      const updatedProfile = { ...activeProfile, ...updatedData };
      setActiveProfileState(updatedProfile);

      if (currentUser && currentUser.id === activeProfile.id) {
        const updatedAuth: AuthUser = { ...currentUser, ...updatedData };
        setCurrentUser(updatedAuth);
        authService.setSession(updatedAuth);
        authService.updateAccountProfile(activeProfile.id, updatedData);
      }

      const updatedList = allProfiles.map((p) =>
        p.id === activeProfile.id ? updatedProfile : p
      );
      setAllProfiles(updatedList);
      persistProfiles(updatedList, updatedProfile.id);
      triggerHaptic('light');
    },
    [activeProfile, currentUser, allProfiles]
  );

  const deleteProfile = useCallback(
    (profileId: string) => {
      if (allProfiles.length <= 1) return;
      const filtered = allProfiles.filter((p) => p.id !== profileId);
      setAllProfiles(filtered);
      const nextActive = filtered[0];
      setActiveProfileState(nextActive);
      persistProfiles(filtered, nextActive.id);
      triggerHaptic('warning');
    },
    [allProfiles]
  );

  const updateLevelTitle = useCallback(
    (totalWorkouts: number) => {
      const newTitle = getLevelTitle(totalWorkouts);
      if (newTitle !== activeProfile.levelTitle) {
        updateProfile({ levelTitle: newTitle });
      }
    },
    [activeProfile.levelTitle, updateProfile]
  );

  const isAuthenticated = Boolean(currentUser && !currentUser.isGuest);

  return (
    <AccountContext.Provider
      value={{
        activeProfile,
        allProfiles,
        currentUser,
        isAuthenticated,
        login,
        signup,
        logout,
        switchProfile,
        createProfile,
        updateProfile,
        deleteProfile,
        updateLevelTitle,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}
