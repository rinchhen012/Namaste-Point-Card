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
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, displayName: string) => Promise<User>;
  logout: () => Promise<void>;
  googleSignIn: () => Promise<User>;
  appleSignIn: () => Promise<User>;
  loading: boolean;
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

  // Function to fetch user profile from Firestore
  const fetchUserProfile = async (user: User) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      } else {
        console.log('No profile document found for this user');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
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
  const register = async (email: string, password: string, displayName: string): Promise<User> => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      // Update user profile with display name
      await updateProfile(user, { displayName });
      
      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName,
        points: 0,
        createdAt: Timestamp.now(),
        phoneNumber: '',
        // No need to set lastQRCheckIn here, will be set on first check-in
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfile);
      setUserProfile(userProfile);
      
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
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 