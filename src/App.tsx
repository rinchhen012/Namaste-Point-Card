import { useEffect, lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import './locales/i18n';
import { register as registerServiceWorker, applyUpdate } from './serviceWorkerRegistration';
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
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const [newAppVersion, setNewAppVersion] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Register service worker
    registerServiceWorker({
      enabledNotifications: true,
      onSuccess: (registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      },
      onUpdate: (registration) => {
        // Notify user about update
        console.log('New content is available; please refresh.');
        setNewVersionAvailable(true);

        // In a real app, you might be able to get the new version number from the service worker
        // For now, we'll just indicate that there's a newer version than the current one
        setNewAppVersion(`${APP_VERSION}+`);
      },
      onNotificationPermissionChange: (permission) => {
        console.log('Notification permission changed:', permission);
        setNotificationPermission(permission);
      }
    });
  }, []);

  // Handler for applying the update when user clicks the refresh button
  const handleApplyUpdate = () => {
    applyUpdate();
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AdminAuthProvider>
            {/* Update notification banner */}
            {newVersionAvailable && (
              <div className="fixed bottom-0 inset-x-0 pb-2 sm:pb-5 z-50">
                <div className="max-w-screen-xl mx-auto px-2 sm:px-6 lg:px-8">
                  <div className="p-2 rounded-lg bg-primary shadow-lg sm:p-3">
                    <div className="flex items-center justify-between flex-wrap">
                      <div className="w-0 flex-1 flex items-center">
                        <span className="flex p-2 rounded-lg bg-primary-dark">
                          <svg
                            className="h-6 w-6 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                        </span>
                        <p className="ml-3 font-medium text-white truncate">
                          <span className="md:inline">
                            {newAppVersion ? `New version ${newAppVersion} is available!` : 'A new version is available!'}
                          </span>
                        </p>
                      </div>
                      <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
                        <button
                          onClick={handleApplyUpdate}
                          className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary bg-white hover:bg-primary-50"
                        >
                          Refresh
                        </button>
                      </div>
                      <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-2">
                        <button
                          onClick={() => setNewVersionAvailable(false)}
                          type="button"
                          className="-mr-1 flex p-2 rounded-md hover:bg-primary-dark focus:outline-none focus:bg-primary-dark transition ease-in-out duration-150"
                        >
                          <svg className="h-6 w-6 text-white" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Core routes accessible without auth */}
            <Routes>
              <Route path="/" element={
                <Suspense fallback={<Loading />}>
                  <HomePage />
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
                  <ScanPage />
                </Suspense>
              } />
              <Route path="/in-store" element={
                <Suspense fallback={<Loading />}>
                  <InStorePage />
                </Suspense>
              } />
              <Route path="/coupons" element={
                <Suspense fallback={<Loading />}>
                  <CouponsPage />
                </Suspense>
              } />
              <Route path="/rewards" element={<Navigate to="/coupons" replace />} />
              <Route path="/redemption/:id" element={
                <Suspense fallback={<Loading />}>
                  <RedemptionPage />
                </Suspense>
              } />
              <Route path="/redemption-history" element={
                <Suspense fallback={<Loading />}>
                  <RedemptionHistoryPage />
                </Suspense>
              } />
              <Route path="/profile" element={
                <Suspense fallback={<Loading />}>
                  <ProfilePage />
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
