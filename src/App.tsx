import { useEffect, lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import ProtectedRoute from './components/ProtectedRoute';
import './locales/i18n';
import { register as registerServiceWorker } from './serviceWorkerRegistration';
import { APP_VERSION } from './config/appConfig';

// Split core pages from dashboard and features that require authentication
// This creates better chunks for initial loading experience

// Core pages - main app
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const InfoPage = lazy(() => import('./pages/InfoPage'));

// Features behind authentication
const ScanPage = lazy(() => import(/* webpackChunkName: "auth-features" */ './pages/ScanPage'));
const InStorePage = lazy(() => import(/* webpackChunkName: "auth-features" */ './pages/InStorePage'));
const CouponsPage = lazy(() => import(/* webpackChunkName: "auth-features" */ './pages/CouponsPage'));
const RedemptionPage = lazy(() => import(/* webpackChunkName: "auth-features" */ './pages/RedemptionPage'));
const RedemptionHistoryPage = lazy(() => import(/* webpackChunkName: "auth-features" */ './pages/RedemptionHistoryPage'));
const ProfilePage = lazy(() => import(/* webpackChunkName: "auth-features" */ './pages/ProfilePage'));

// Admin pages bundled separately for smaller main bundle
const AdminDashboard = lazy(() => import(/* webpackChunkName: "admin-core" */ './pages/admin/AdminDashboard'));
const AdminCoupons = lazy(() => import(/* webpackChunkName: "admin-core" */ './pages/admin/AdminCoupons'));
const AdminLayout = lazy(() => import(/* webpackChunkName: "admin-core" */ './pages/admin/AdminLayout'));
const AdminLogin = lazy(() => import(/* webpackChunkName: "admin-core" */ './pages/admin/AdminLogin'));
const AdminRewards = lazy(() => import(/* webpackChunkName: "admin-core" */ './pages/admin/AdminRewards'));
const AdminUsers = lazy(() => import(/* webpackChunkName: "admin-core" */ './pages/admin/AdminUsers'));
const AdminStoreInfo = lazy(() => import(/* webpackChunkName: "admin-features" */ './pages/admin/AdminStoreInfo'));
const AdminFAQs = lazy(() => import(/* webpackChunkName: "admin-features" */ './pages/admin/AdminFAQs'));
const AdminSettings = lazy(() => import(/* webpackChunkName: "admin-features" */ './pages/admin/AdminSettings'));

// Loading component for suspense fallback
const Loading = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
  </div>
);

function App() {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Register main service worker for PWA
    registerServiceWorker({
      // Disable notifications in service worker
      enabledNotifications: false,
      skipWaiting: true,
      onSuccess: (registration) => {
        console.log('Main service worker registration successful with scope: ', registration.scope);
      },
      // We're intentionally not using the onUpdate callback to avoid the update banner
      onNotificationPermissionChange: (permission) => {
        console.log('Notification permission changed:', permission);
        setNotificationPermission(permission);
      }
    });

    // NOTE: Firebase messaging service worker registration has been removed
    // as notifications feature is temporarily disabled
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AdminAuthProvider>
            {/* Core routes accessible without auth */}
            <Routes>
              <Route path="/" element={
                <Suspense fallback={<Loading />}>
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                </Suspense>
              } />
              <Route path="/login" element={
                <Suspense fallback={<Loading />}>
                  <LoginPage />
                </Suspense>
              } />
              <Route path="/register" element={
                <Suspense fallback={<Loading />}>
                  <RegisterPage />
                </Suspense>
              } />
              <Route path="/info" element={
                <Suspense fallback={<Loading />}>
                  <InfoPage />
                </Suspense>
              } />

              {/* Feature routes that need authentication */}
              <Route path="/scan" element={
                <Suspense fallback={<Loading />}>
                  <ProtectedRoute>
                    <ScanPage />
                  </ProtectedRoute>
                </Suspense>
              } />
              <Route path="/in-store" element={
                <Suspense fallback={<Loading />}>
                  <ProtectedRoute>
                    <InStorePage />
                  </ProtectedRoute>
                </Suspense>
              } />
              <Route path="/coupons" element={
                <Suspense fallback={<Loading />}>
                  <ProtectedRoute>
                    <CouponsPage />
                  </ProtectedRoute>
                </Suspense>
              } />
              <Route path="/rewards" element={<Navigate to="/coupons" replace />} />
              <Route path="/redemption/:id" element={
                <Suspense fallback={<Loading />}>
                  <ProtectedRoute>
                    <RedemptionPage />
                  </ProtectedRoute>
                </Suspense>
              } />
              <Route path="/redemption-history" element={
                <Suspense fallback={<Loading />}>
                  <ProtectedRoute>
                    <RedemptionHistoryPage />
                  </ProtectedRoute>
                </Suspense>
              } />
              <Route path="/profile" element={
                <Suspense fallback={<Loading />}>
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                </Suspense>
              } />

              {/* Redirect old code-entry URLs to scan page which now has integrated manual entry */}
              <Route path="/code-entry" element={<Navigate to="/scan" replace />} />

              {/* Admin routes with separate Suspense boundary */}
              <Route path="/admin/login" element={
                <Suspense fallback={<Loading />}>
                  <AdminLogin />
                </Suspense>
              } />
              <Route
                path="/admin"
                element={
                  <AdminProtectedRoute>
                    <Suspense fallback={<Loading />}>
                      <AdminLayout />
                    </Suspense>
                  </AdminProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="rewards" element={<AdminRewards />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="store-info" element={<AdminStoreInfo />} />
                <Route path="faqs" element={<AdminFAQs />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AdminAuthProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
