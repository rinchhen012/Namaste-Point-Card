import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { isAdminAuthenticated, adminAuthLoading, currentAdminUser } = useAdminAuth();
  const location = useLocation();

  // If still loading auth, show loading indicator
  if (adminAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        <p className="ml-4 text-gray-600">Verifying admin permissions...</p>
      </div>
    );
  }

  // If not authenticated, redirect to admin login
  if (!isAdminAuthenticated || !currentAdminUser) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated as admin
  return <>{children}</>;
};

export default AdminProtectedRoute; 