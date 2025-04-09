import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const AdminLayout: React.FC = () => {
  const { adminLogout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleLogout = () => {
    adminLogout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Admin Header */}
      <header className="bg-orange-600 shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-white text-xl font-semibold">Namaste Admin</h1>
          </div>

          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="text-white hover:text-orange-200 mr-4 text-sm"
            >
              Logout
            </button>
            <button
              onClick={toggleMenu}
              className="text-white focus:outline-none md:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`bg-white shadow-md w-64 fixed md:relative inset-y-0 left-0 transform ${
            menuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          } transition-transform duration-300 ease-in-out md:flex flex-col z-10 h-screen md:h-auto`}
        >
          <nav className="mt-5 px-2">
            <Link
              to="/"
              className={`block px-4 py-2 rounded-md mb-1 ${
                isActive('/')
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              to="/admin/coupons"
              className={`block px-4 py-2 rounded-md mb-1 ${
                isActive('/admin/coupons') || isActive('/admin/rewards')
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setMenuOpen(false)}
            >
              Coupons
            </Link>
            <Link
              to="/users"
              className={`block px-4 py-2 rounded-md mb-1 ${
                isActive('/users')
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setMenuOpen(false)}
            >
              Users
            </Link>
            <Link
              to="/settings"
              className={`block px-4 py-2 rounded-md mb-1 ${
                isActive('/settings')
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setMenuOpen(false)}
            >
              Settings
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="container mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
