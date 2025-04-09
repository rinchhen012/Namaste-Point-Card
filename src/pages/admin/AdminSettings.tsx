import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';

const AdminSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState('');

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adminEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Call the Cloud Function to add admin role
      const addAdminRole = httpsCallable(functions, 'addAdminRole');
      const result = await addAdminRole({ email: adminEmail });
      const data = result.data as { success: boolean; result: string };

      if (data.success) {
        setSuccess(data.result || 'Admin role added successfully');
        setAdminEmail('');
      } else {
        setError('Failed to add admin role');
      }
    } catch (err: any) {
      console.error('Error adding admin role:', err);
      setError(err?.message || 'Failed to add admin role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Admin Settings</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">User Permissions</h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleAddAdmin}>
            <div className="mb-4">
              <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Add Admin User
              </label>
              <input
                type="email"
                id="adminEmail"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="Enter user email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                disabled={loading}
              />
              <p className="mt-1 text-sm text-gray-500">
                This user must already have an account in the system
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : 'Add Admin Privileges'}
            </button>
          </form>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">System Information</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Application Version</h3>
              <p className="text-lg">1.0.0</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Environment</h3>
              <p className="text-lg">{import.meta.env.DEV ? 'Development' : 'Production'}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Firebase Project</h3>
              <p className="text-lg">namaste-point-card</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
