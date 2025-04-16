import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // If still loading auth, show loading indicator
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        <p className="ml-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!currentUser) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated
  return <>{children}</>;
};

export default ProtectedRoute;
