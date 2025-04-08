import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  adminLogin: (email: string, password: string) => Promise<boolean>;
  adminLogout: () => Promise<void>;
  adminAuthLoading: boolean;
  currentAdminUser: User | null;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAdminAuthenticated: false,
  adminLogin: async () => false,
  adminLogout: async () => {},
  adminAuthLoading: true,
  currentAdminUser: null
});

export const useAdminAuth = () => useContext(AdminAuthContext);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminAuthLoading, setAdminAuthLoading] = useState(true);
  const [currentAdminUser, setCurrentAdminUser] = useState<User | null>(null);
  const auth = getAuth();

  // Check if user is admin
  const checkIsAdmin = async (user: User) => {
    try {
      // For development environments, allow easier testing
      if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
        setIsAdminAuthenticated(true);
        setCurrentAdminUser(user);
        return;
      }

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists() && userDoc.data().role === 'admin') {
        setIsAdminAuthenticated(true);
        setCurrentAdminUser(user);
      } else {
        console.error('User is not an admin');
        await signOut(auth);
        setIsAdminAuthenticated(false);
        setCurrentAdminUser(null);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdminAuthenticated(false);
      setCurrentAdminUser(null);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    // For development environments with mock auth, create a mock admin user
    if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
      // Create a mock Firebase User for development
      const mockUser = {
        uid: 'admin-mock-uid',
        email: 'admin@example.com',
        displayName: 'Mock Admin',
        emailVerified: true,
        // Include other required User properties as needed
        getIdToken: () => Promise.resolve('mock-token'),
        reload: () => Promise.resolve(),
        delete: () => Promise.resolve(),
        toJSON: () => ({})
      } as unknown as User;
      
      setIsAdminAuthenticated(true);
      setCurrentAdminUser(mockUser);
      setAdminAuthLoading(false);
      return () => {}; // No cleanup needed for mock
    }

    // Regular Firebase auth for production
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await checkIsAdmin(user);
      } else {
        setIsAdminAuthenticated(false);
        setCurrentAdminUser(null);
      }
      setAdminAuthLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  // Admin login function using Firebase
  const adminLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      // For development environments with mock auth
      if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
        if (email === 'admin' && password === 'namaste2024') {
          const mockUser = {
            uid: 'admin-mock-uid',
            email: 'admin@example.com',
            displayName: 'Mock Admin',
            emailVerified: true,
            getIdToken: () => Promise.resolve('mock-token'),
            reload: () => Promise.resolve(),
            delete: () => Promise.resolve(),
            toJSON: () => ({})
          } as unknown as User;
          
          setIsAdminAuthenticated(true);
          setCurrentAdminUser(mockUser);
          return true;
        } else {
          setIsAdminAuthenticated(false);
          setCurrentAdminUser(null);
          return false;
        }
      }

      // Regular Firebase auth for production
      setAdminAuthLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await checkIsAdmin(userCredential.user);
      return isAdminAuthenticated;
    } catch (error) {
      console.error('Login error:', error);
      setIsAdminAuthenticated(false);
      setCurrentAdminUser(null);
      return false;
    } finally {
      setAdminAuthLoading(false);
    }
  };

  // Admin logout function
  const adminLogout = async () => {
    try {
      await signOut(auth);
      setIsAdminAuthenticated(false);
      setCurrentAdminUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAdminAuthenticated,
        adminLogin,
        adminLogout,
        adminAuthLoading,
        currentAdminUser
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export default AdminAuthContext; 