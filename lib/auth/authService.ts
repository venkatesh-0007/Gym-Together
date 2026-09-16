import {
  AuthUser,
  StoredAccount,
  SignUpPayload,
  LogInPayload,
  AuthResult,
} from './types';
import { generateSalt, hashPassword, verifyPassword } from './crypto';
import { getFirebaseAuth } from '../firebase/config';
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

  /**
   * Register / Sign Up a new user account.
   */
  public async signUp(payload: SignUpPayload): Promise<AuthResult> {
    const email = payload.email.trim().toLowerCase();
    const name = payload.name.trim();
    const password = payload.password;

    // 1. Validation
    if (!name) {
      return {
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        errorMessage: 'Full name is required.',
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return {
        success: false,
        errorCode: 'INVALID_EMAIL',
        errorMessage: 'Please enter a valid email address.',
      };
    }

    if (!password || password.length < 6) {
      return {
        success: false,
        errorCode: 'WEAK_PASSWORD',
        errorMessage: 'Password must be at least 6 characters long.',
      };
    }

    // 2. Check Firebase Auth if active
    const fbAuth = getFirebaseAuth();
    if (fbAuth) {
      try {
        const {
          createUserWithEmailAndPassword,
          updateProfile: updateFbProfile,
        } = await import('firebase/auth');
        const userCredential = await createUserWithEmailAndPassword(
          fbAuth,
          email,
          password
        );
        const fbUser = userCredential.user;

        await updateFbProfile(fbUser, {
          displayName: name,
        });

        const randomCode = `GYM-${Math.floor(1000 + Math.random() * 9000)}`;
        const userProfile: AuthUser = {
          id: fbUser.uid,
          name: name,
          email: email,
          username:
            payload.username?.trim() ||
            `@${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          avatar: payload.avatar || '⚡',
          bio: payload.bio?.trim() || '',
          buddyCode: randomCode,
          levelTitle: 'Gym Novice',
          weeklyGoal: 4,
          createdAt: new Date().toISOString(),
          authProvider: 'firebase',
        };

        // Sync profile to Cloud Firestore
        try {
          const { getFirestoreDb } = await import('../firebase/config');
          const db = getFirestoreDb();
          if (db) {
            const { doc, setDoc } = await import('firebase/firestore');
            await setDoc(doc(db, 'users', fbUser.uid), userProfile, { merge: true });
          }
        } catch (dbErr) {
          console.warn('Could not persist profile to Firestore:', dbErr);
        }

        // Cache into local storage
        const accounts = this.getStoredAccounts();
        const accountIdx = accounts.findIndex((a) => a.id === fbUser.uid || a.email === email);
        const storedAcc: StoredAccount = {
          id: fbUser.uid,
          email: email,
          passwordHash: 'firebase_managed',
          salt: 'firebase_managed',
          profile: {
            id: fbUser.uid,
            name: userProfile.name,
            username: userProfile.username,
            avatar: userProfile.avatar,
            bio: userProfile.bio,
            buddyCode: userProfile.buddyCode,
            levelTitle: userProfile.levelTitle,
            weeklyGoal: userProfile.weeklyGoal,
            createdAt: userProfile.createdAt,
          },
          createdAt: userProfile.createdAt,
          lastLoginAt: userProfile.createdAt,
        };
        if (accountIdx >= 0) {
          accounts[accountIdx] = storedAcc;
        } else {
          accounts.push(storedAcc);
        }
        this.saveStoredAccounts(accounts);

        this.setSession(userProfile);
        return { success: true, user: userProfile };
      } catch (fbErr: any) {
        if (fbErr.code === 'auth/email-already-in-use') {
          return {
            success: false,
            errorCode: 'EMAIL_EXISTS',
            errorMessage: 'An account with this email already exists.',
          };
        }
        console.warn('Firebase signup failed, trying local fallback:', fbErr);
      }
    }

    // 3. Local cryptographic storage engine
    const accounts = this.getStoredAccounts();
    const existing = accounts.find((a) => a.email.toLowerCase() === email);
    if (existing) {
      return {
        success: false,
        errorCode: 'EMAIL_EXISTS',
        errorMessage: 'An account with this email already exists. Please log in.',
      };
    }

    const salt = generateSalt(16);
    const passwordHash = await hashPassword(password, salt);
    const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const randomCode = `GYM-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    const newProfile: UserProfile = {
      id: newId,
      name: name,
      username:
        payload.username?.trim() ||
        `@${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      avatar: payload.avatar || '⚡',
      bio: payload.bio?.trim() || '',
      buddyCode: randomCode,
      levelTitle: 'Gym Novice',
      weeklyGoal: 4,
      createdAt: nowIso,
    };

    const newAccount: StoredAccount = {
      id: newId,
      email: email,
      passwordHash,
      salt,
      profile: newProfile,
      createdAt: nowIso,
      lastLoginAt: nowIso,
    };

    accounts.push(newAccount);
    this.saveStoredAccounts(accounts);

    const authUser: AuthUser = {
      ...newProfile,
      email: email,
      authProvider: 'local',
    };

    this.setSession(authUser);
    return { success: true, user: authUser };
  }

  /**
   * Log In an existing user.
   */
  public async logIn(payload: LogInPayload): Promise<AuthResult> {
    const email = payload.email.trim().toLowerCase();
    const password = payload.password;

    if (!email || !password) {
      return {
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        errorMessage: 'Please enter both your email and password.',
      };
    }

    // 1. Try Firebase Auth if active
    const fbAuth = getFirebaseAuth();
    if (fbAuth) {
      try {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        const userCredential = await signInWithEmailAndPassword(
          fbAuth,
          email,
          password
        );
        const fbUser = userCredential.user;

        // Try reading user profile from Cloud Firestore for cross-device synchronization
        let firestoreProfile: any = null;
        try {
          const { getFirestoreDb } = await import('../firebase/config');
          const db = getFirestoreDb();
          if (db) {
            const { doc, getDoc } = await import('firebase/firestore');
            const snap = await getDoc(doc(db, 'users', fbUser.uid));
            if (snap.exists()) {
              firestoreProfile = snap.data();
            }
          }
        } catch (dbErr) {
          console.warn('Could not retrieve profile from Firestore:', dbErr);
        }

        // Check if profile exists in local registry or reconstruct
        const accounts = this.getStoredAccounts();
        const existing = accounts.find((a) => a.id === fbUser.uid || a.email === email);
        const randomCode = `GYM-${Math.floor(1000 + Math.random() * 9000)}`;

        const authUser: AuthUser = {
          id: fbUser.uid,
          name: firestoreProfile?.name || fbUser.displayName || existing?.profile.name || 'Lifter',
          email: email,
          username:
            firestoreProfile?.username ||
            existing?.profile.username ||
            `@${(fbUser.displayName || 'lifter').toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          avatar: firestoreProfile?.avatar || existing?.profile.avatar || '⚡',
          bio: firestoreProfile?.bio || existing?.profile.bio || '',
          buddyCode: firestoreProfile?.buddyCode || existing?.profile.buddyCode || randomCode,
          levelTitle: firestoreProfile?.levelTitle || existing?.profile.levelTitle || 'Gym Novice',
          weeklyGoal: firestoreProfile?.weeklyGoal || existing?.profile.weeklyGoal || 4,
          createdAt: firestoreProfile?.createdAt || existing?.profile.createdAt || new Date().toISOString(),
          authProvider: 'firebase',
        };

        // Cache into local storage accounts as well
        const accountIdx = accounts.findIndex((a) => a.id === fbUser.uid || a.email === email);
        const storedAcc: StoredAccount = {
          id: fbUser.uid,
          email: email,
          passwordHash: 'firebase_managed',
          salt: 'firebase_managed',
          profile: {
            id: fbUser.uid,
            name: authUser.name,
            username: authUser.username,
            avatar: authUser.avatar,
            bio: authUser.bio,
            buddyCode: authUser.buddyCode,
            levelTitle: authUser.levelTitle,
            weeklyGoal: authUser.weeklyGoal,
            createdAt: authUser.createdAt,
          },
          createdAt: authUser.createdAt,
          lastLoginAt: new Date().toISOString(),
        };
        if (accountIdx >= 0) {
          accounts[accountIdx] = storedAcc;
        } else {
          accounts.push(storedAcc);
        }
        this.saveStoredAccounts(accounts);

        this.setSession(authUser);
        return { success: true, user: authUser };
      } catch (fbErr: any) {
        if (
          fbErr.code === 'auth/wrong-password' ||
          fbErr.code === 'auth/invalid-credential'
        ) {
          return {
            success: false,
            errorCode: 'INVALID_CREDENTIALS',
            errorMessage: 'Incorrect password. Please try again.',
          };
        }
        if (fbErr.code === 'auth/user-not-found') {
          return {
            success: false,
            errorCode: 'USER_NOT_FOUND',
            errorMessage: 'No account found with this email.',
          };
        }
        console.warn('Firebase login failed, falling back to local registry:', fbErr);
      }
    }

    // 2. Local cryptographic engine verification
    const accounts = this.getStoredAccounts();
    const account = accounts.find((a) => a.email.toLowerCase() === email);

    if (!account) {
      return {
        success: false,
        errorCode: 'USER_NOT_FOUND',
        errorMessage: 'No account found with this email on this device. Please sign up below or check spelling.',
      };
    }

    const isValidPassword = await verifyPassword(
      password,
      account.salt,
      account.passwordHash
    );

    if (!isValidPassword) {
      return {
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        errorMessage: 'Incorrect password. Please try again.',
      };
    }

    // Update lastLoginAt
    account.lastLoginAt = new Date().toISOString();
    this.saveStoredAccounts(accounts);

    const authUser: AuthUser = {
      ...account.profile,
      email: account.email,
      authProvider: 'local',
    };

    this.setSession(authUser);
    return { success: true, user: authUser };
  }

  /**
   * Log Out the current user session.
   */
  public async logOut(): Promise<void> {
    const fbAuth = getFirebaseAuth();
    if (fbAuth) {
      try {
        const { signOut } = await import('firebase/auth');
        await signOut(fbAuth);
      } catch (err) {
        console.warn('Firebase signOut error:', err);
      }
    }
    this.setSession(null);
  }

  /**
   * Update profile fields for an account.
   */
  public updateAccountProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): AuthUser | null {
    const accounts = this.getStoredAccounts();
    const index = accounts.findIndex((a) => a.id === userId);

    if (index !== -1) {
      accounts[index].profile = {
        ...accounts[index].profile,
        ...updates,
      };
      this.saveStoredAccounts(accounts);

      const currentSession = this.getSession();
      if (currentSession && currentSession.id === userId) {
        const updatedUser: AuthUser = {
          ...currentSession,
          ...updates,
        };
        this.setSession(updatedUser);

        // Async sync to Firestore
        if (typeof window !== 'undefined') {
          import('../firebase/config')
            .then(({ getFirestoreDb }) => {
              const db = getFirestoreDb();
              if (db) {
                import('firebase/firestore').then(({ doc, setDoc }) => {
                  setDoc(doc(db, 'users', userId), updates, { merge: true }).catch(
                    (err) => console.warn('Firestore profile sync error:', err)
                  );
                });
              }
            })
            .catch(() => {});
        }

        return updatedUser;
      }
    }

    return null;
  }

  /**
   * Get list of all registered accounts on this device.
   */
  public getAllAccounts(): StoredAccount[] {
    return this.getStoredAccounts();
  }
}

export const authService = new AuthService();
