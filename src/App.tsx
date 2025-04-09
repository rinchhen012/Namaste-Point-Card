import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import './locales/i18n';
import { register as registerServiceWorker } from './serviceWorkerRegistration';

// Import pages with lazy loading for better performance
const HomePage = lazy(() => import('./pages/HomePage'));
const ScanPage = lazy(() => import('./pages/ScanPage'));
const InStorePage = lazy(() => import('./pages/InStorePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const CouponsPage = lazy(() => import('./pages/CouponsPage'));
const RedemptionPage = lazy(() => import('./pages/RedemptionPage'));
const RedemptionHistoryPage = lazy(() => import('./pages/RedemptionHistoryPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const InfoPage = lazy(() => import('./pages/InfoPage'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminRewards = lazy(() => import('./pages/admin/AdminRewards'));

// Loading component for suspense fallback
const Loading = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
  </div>
);

function App() {
  useEffect(() => {
    // Register service worker
    registerServiceWorker({
      onSuccess: (registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      },
      onUpdate: (registration) => {
        // Notify user about update
        console.log('New content is available; please refresh.');
      }
    });
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AdminAuthProvider>
            <Suspense fallback={<Loading />}>
              <Routes>
                {/* Main app routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/scan" element={<ScanPage />} />
                <Route path="/in-store" element={<InStorePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/coupons" element={<CouponsPage />} />
                <Route path="/rewards" element={<Navigate to="/coupons" replace />} />
                <Route path="/redemption/:id" element={<RedemptionPage />} />
                <Route path="/redemption-history" element={<RedemptionHistoryPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/info" element={<InfoPage />} />
                {/* Redirect old code-entry URLs to scan page which now has integrated manual entry */}
                <Route path="/code-entry" element={<Navigate to="/scan" replace />} />

                {/* Admin routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route
                  path="/admin"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout />
                    </AdminProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="coupons" element={<AdminCoupons />} />
                  <Route path="rewards" element={<AdminCoupons />} />
                </Route>

                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AdminAuthProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
