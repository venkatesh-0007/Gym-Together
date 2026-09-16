'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile, DEFAULT_PROFILES, getLevelTitle } from '../types/account';
import { triggerHaptic } from '../utils/haptics';

interface AccountContextType {
  activeProfile: UserProfile;
  allProfiles: UserProfile[];
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

  // Load from local storage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedProfilesRaw = localStorage.getItem(STORAGE_PROFILES_KEY);
      let loadedProfiles = DEFAULT_PROFILES;
      if (storedProfilesRaw) {
        const parsed = JSON.parse(storedProfilesRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedProfiles = parsed;
        }
      }
      setAllProfiles(loadedProfiles);

      const activeId = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
      const matched = loadedProfiles.find((p) => p.id === activeId);
      if (matched) {
        setActiveProfileState(matched);
      } else {
        setActiveProfileState(loadedProfiles[0]);
      }
    } catch {
      // Fallback
    }
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

  const switchProfile = useCallback(
    (profileId: string) => {
      const found = allProfiles.find((p) => p.id === profileId);
      if (found) {
        triggerHaptic('medium');
        setActiveProfileState(found);
        persistProfiles(allProfiles, found.id);
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

      const updatedList = allProfiles.map((p) =>
        p.id === activeProfile.id ? updatedProfile : p
      );
      setAllProfiles(updatedList);
      persistProfiles(updatedList, updatedProfile.id);
      triggerHaptic('light');
    },
    [activeProfile, allProfiles]
  );

  const deleteProfile = useCallback(
    (profileId: string) => {
      if (allProfiles.length <= 1) return; // Prevent deleting the last profile
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

  return (
    <AccountContext.Provider
      value={{
        activeProfile,
        allProfiles,
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
