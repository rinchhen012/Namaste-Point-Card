import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp, FirestoreError } from 'firebase/firestore';
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

  // Function to fetch user profile from Firestore with retry
  const fetchUserProfile = async (user: User, retryCount = 0): Promise<void> => {
    const MAX_RETRIES = 3;
    try {
      setAuthError(null);
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      } else {
        console.log('No profile document found for this user');
        // If no profile exists but we have a valid user, create a default profile
        if (user.email) {
          const defaultProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'User',
            points: 0,
            createdAt: Timestamp.now()
          };

          try {
            await setDoc(userDocRef, defaultProfile);
            setUserProfile(defaultProfile);
          } catch (error) {
            console.error('Error creating default profile:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Handle specific Firestore errors
      if (error instanceof FirestoreError) {
        if (['unavailable', 'cancelled', 'unknown', 'deadline-exceeded'].includes(error.code) && retryCount < MAX_RETRIES) {
          // Retry with exponential backoff for connection-related errors
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying profile fetch in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => {
            fetchUserProfile(user, retryCount + 1);
          }, delay);
          return;
        }

        // Set a user-friendly error message
        if (error.code === 'permission-denied') {
          setAuthError('Access denied. You may not have permission to access your profile.');
        } else {
          setAuthError('Error connecting to the server. Please try again later.');
        }
      }

      // If we've exhausted retries or it's not a retriable error,
      // create an in-memory profile from the auth user to allow basic functionality
      if (user.email) {
        const fallbackProfile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'User',
          points: 0,
          createdAt: Timestamp.now()
        };

        // Use this as a temporary profile until connectivity is restored
        console.warn('Using fallback profile due to connectivity issues');
        setUserProfile(fallbackProfile);
      }
    }
  };

  // Monitor authentication state
  useEffect(() => {
    let unsubscribed = false;
    setLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (unsubscribed) return;

      setCurrentUser(user);

      if (user) {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
        setAuthError(null);
      }

      setLoading(false);
    }, (error) => {
      console.error('Auth state change error:', error);
      setLoading(false);
      setAuthError('Authentication error. Please try again later.');
    });

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  }, []);

  // Login with email and password
  const login = async (email: string, password: string): Promise<User> => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Register new user
  const register = async (email: string, password: string): Promise<User> => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // Set default display name to "User" for Firebase Auth profile
      await updateProfile(user, { displayName: "User" });

      // Create user profile in Firestore with default name
      const userProfileData: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: "User", // Default display name
        points: 0,
        createdAt: Timestamp.now(),
        phoneNumber: '',
        // No need to set lastQRCheckIn here, will be set on first check-in
      };

      await setDoc(doc(db, 'users', user.uid), userProfileData);
      setUserProfile(userProfileData); // Update context

      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Google Sign-in
  const googleSignIn = async (): Promise<User> => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user profile exists, create one if not
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const newUserProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          points: 0,
          createdAt: Timestamp.now(),
          phoneNumber: user.phoneNumber || '',
          // No need to set lastQRCheckIn here, will be set on first check-in
        };

        await setDoc(userDocRef, newUserProfile);
        setUserProfile(newUserProfile);
      }

      return user;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  // Apple Sign-in
  const appleSignIn = async (): Promise<User> => {
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user profile exists, create one if not
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const newUserProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          points: 0,
          createdAt: Timestamp.now(),
          phoneNumber: user.phoneNumber || '',
          // No need to set lastQRCheckIn here, will be set on first check-in
        };

        await setDoc(userDocRef, newUserProfile);
        setUserProfile(newUserProfile);
      }

      return user;
    } catch (error) {
      console.error('Apple sign-in error:', error);
      throw error;
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
    loading,
    authError
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
