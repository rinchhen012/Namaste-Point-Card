import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import './locales/i18n';
import './index.css';

// Admin pages with lazy loading
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminStoreInfo = lazy(() => import('./pages/admin/AdminStoreInfo'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminRewards = lazy(() => import('./pages/admin/AdminRewards'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminFAQs = lazy(() => import('./pages/admin/AdminFAQs'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const UnauthorizedPage = lazy(() => import('./pages/admin/UnauthorizedPage'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));

// Loading component for suspense fallback
const Loading = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
  </div>
);

// Using HashRouter for development avoids page refresh issues
const AppRouter = () => {
  return (
    <HashRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected admin routes with layout */}
        <Route
          path="/"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="store-info" element={<AdminStoreInfo />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="rewards" element={<AdminRewards />} />
          <Route path="faqs" element={<AdminFAQs />} />
          <Route path="settings" element={<AdminSettings />} />
          {/* Add other protected admin routes here */}
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

// Check if the root element exists
const rootElement = document.getElementById('root');

if (rootElement) {
  // Check if the root element already has React initialized on it
  const existingRoot = (window as any).__ADMIN_ROOT__;

  if (existingRoot) {
    // If the root already exists, just render to it
    existingRoot.render(
      <React.StrictMode>
        <AuthProvider>
          <LanguageProvider>
            <AdminAuthProvider>
              <Suspense fallback={<Loading />}>
                <AppRouter />
              </Suspense>
            </AdminAuthProvider>
          </LanguageProvider>
        </AuthProvider>
      </React.StrictMode>
    );
  } else {
    // Create a new root and store it for future reference
    const newRoot = ReactDOM.createRoot(rootElement);
    (window as any).__ADMIN_ROOT__ = newRoot;

    newRoot.render(
      <React.StrictMode>
        <AuthProvider>
          <LanguageProvider>
            <AdminAuthProvider>
              <Suspense fallback={<Loading />}>
                <AppRouter />
              </Suspense>
            </AdminAuthProvider>
          </LanguageProvider>
        </AuthProvider>
      </React.StrictMode>
    );
  }
}
