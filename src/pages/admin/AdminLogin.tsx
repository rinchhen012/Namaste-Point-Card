import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { debugAdminStatus } from '../../firebase/adminServices';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { adminLogin, isAdminAuthenticated, adminAuthLoading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/admin';

  useEffect(() => {
    if (isAdminAuthenticated && !adminAuthLoading) {
      navigate(from, { replace: true });
    }
  }, [isAdminAuthenticated, adminAuthLoading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const success = await adminLogin(email, password);
      if (!success) {
        setError('Invalid login credentials or insufficient permissions. Please ensure your account has admin privileges.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDebugAdminStatus = async () => {
    await debugAdminStatus();
  };

  const handleFixAdminRole = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        setError('No user is logged in. Please login first.');
        return;
      }

      // Update user document with admin role
      const db = getFirestore();
      await setDoc(doc(db, 'users', user.uid), {
        role: 'admin',
        email: user.email
      }, { merge: true });

      alert('Admin role has been set. Please log out and log in again.');
    } catch (err) {
      console.error('Error setting admin role:', err);
      setError('Failed to set admin role: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Admin Login</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="flex items-center justify-between mb-4">
            <button
              type="submit"
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>

        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Admin Troubleshooting</h3>
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleDebugAdminStatus}
              className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-2 rounded"
            >
              Debug Admin Status
            </button>
            <button
              onClick={handleFixAdminRole}
              className="text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-800 font-bold py-1 px-2 rounded"
            >
              Fix Admin Role
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
