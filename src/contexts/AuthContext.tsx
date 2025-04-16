import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp, FirestoreError, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  googleSignIn: () => Promise<User>;
  appleSignIn: () => Promise<User>;
  updateUserPasswordInternal: (currentPass: string, newPass: string) => Promise<void>;
  loading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const profileListenerUnsubscribe = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    setLoading(true);

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (profileListenerUnsubscribe.current) {
        profileListenerUnsubscribe.current();
        profileListenerUnsubscribe.current = null;
      }

      setCurrentUser(user);

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);

        profileListenerUnsubscribe.current = onSnapshot(userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const profileData = docSnap.data() as UserProfile;
              setUserProfile(profileData);
              setAuthError(null);
              console.log('[AuthContext] User profile updated via listener.');
            } else {
              console.warn(`Profile not found for ${user.uid}, attempting to create default.`);
              if (user.email) {
                const defaultProfile: UserProfile = {
                  uid: user.uid,
                  email: user.email,
                  displayName: user.displayName || 'User',
                  points: 0,
                  createdAt: Timestamp.now()
                };
                setDoc(userDocRef, defaultProfile)
                  .then(() => {
                    console.log('[AuthContext] Default profile created.');
                    setUserProfile(defaultProfile);
                    setAuthError(null);
                  })
                  .catch((error) => {
                    console.error('[AuthContext] Error creating default profile:', error);
                    setUserProfile(null);
                    setAuthError('Failed to create user profile.');
                  });
              } else {
                setUserProfile(null);
                console.error('[AuthContext] Cannot create default profile: User has no email.');
                setAuthError('User profile missing and cannot be created.');
              }
            }
            if (loading) setLoading(false);
          },
          (error) => {
            console.error('[AuthContext] Error listening to user profile:', error);
            setAuthError('Failed to load profile data in real-time.');
            setUserProfile(null);
            setLoading(false);
          }
        );

      } else {
        setUserProfile(null);
        setAuthError(null);
        setLoading(false);
      }
    }, (error) => {
      console.error('[AuthContext] Auth state change error:', error);
      setLoading(false);
      setAuthError('Authentication error. Please try again later.');
      if (profileListenerUnsubscribe.current) {
        profileListenerUnsubscribe.current();
      }
    });

    return () => {
      unsubscribeAuth();
      if (profileListenerUnsubscribe.current) {
        profileListenerUnsubscribe.current();
      }
    };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string): Promise<User> => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      await updateProfile(user, { displayName: "User" });

      const userProfileData: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: "User",
        points: 0,
        createdAt: Timestamp.now(),
        phoneNumber: '',
      };

      await setDoc(doc(db, 'users', user.uid), userProfileData);

      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const googleSignIn = async (): Promise<User> => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const newUserProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'User',
          points: 0,
          createdAt: Timestamp.now(),
          phoneNumber: user.phoneNumber || '',
        };

        await setDoc(userDocRef, newUserProfile);
      }

      return user;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  const appleSignIn = async (): Promise<User> => {
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const newUserProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'User',
          points: 0,
          createdAt: Timestamp.now(),
          phoneNumber: user.phoneNumber || '',
        };

        await setDoc(userDocRef, newUserProfile);
      }

      return user;
    } catch (error) {
      console.error('Apple sign-in error:', error);
      throw error;
    }
  };

  const updateUserPasswordInternal = async (currentPass: string, newPass: string): Promise<void> => {
    if (!currentUser || !currentUser.email) {
      throw new Error('User not logged in or email missing.');
    }

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
      await reauthenticateWithCredential(currentUser, credential);

      await updatePassword(currentUser, newPass);
      console.log('[AuthContext] Password updated successfully.');
    } catch (error) {
      console.error('[AuthContext] Error updating password:', error);
      if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect current password.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many attempts. Please try again later.');
      }
      throw new Error('Failed to update password.');
    }
  };

  const value: AuthContextType = {
    currentUser,
    userProfile,
    setUserProfile,
    login,
    register,
    logout,
    googleSignIn,
    appleSignIn,
    updateUserPasswordInternal,
    loading,
    authError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
