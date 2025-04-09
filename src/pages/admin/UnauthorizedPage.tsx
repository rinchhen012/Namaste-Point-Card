import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          Unauthorized Access
        </h1>
        <p className="text-gray-700 mb-6">
          You do not have permission to view this page.
          Please log in with an administrator account or contact support.
        </p>
        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-200"
        >
          Logout & Go to Admin Login
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
