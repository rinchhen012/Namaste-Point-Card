import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
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

  const navLinkClasses = ({ isActive }: { isActive: boolean }): string => {
    const baseClasses = "block px-4 py-2 rounded-md mb-1 transition-colors duration-150 ease-in-out";
    const activeClasses = "border-l-4 border-orange-500 bg-orange-100 text-orange-800";
    const inactiveClasses = "text-gray-700 hover:bg-gray-100";
    return `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
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
            <NavLink
              to="."
              end
              className={navLinkClasses}
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="coupons"
              className={navLinkClasses}
              onClick={() => setMenuOpen(false)}
            >
              Coupons Management
            </NavLink>
            <NavLink
              to="rewards"
              className={navLinkClasses}
              onClick={() => setMenuOpen(false)}
            >
              Rewards Management
            </NavLink>
            <NavLink
              to="store-info"
              className={navLinkClasses}
              onClick={() => setMenuOpen(false)}
            >
              Store Information
            </NavLink>
            <NavLink
              to="faqs"
              className={navLinkClasses}
              onClick={() => setMenuOpen(false)}
            >
              FAQs Management
            </NavLink>
            <NavLink
              to="users"
              className={navLinkClasses}
              onClick={() => setMenuOpen(false)}
            >
              Users
            </NavLink>
            <NavLink
              to="settings"
              className={navLinkClasses}
              onClick={() => setMenuOpen(false)}
            >
              Settings
            </NavLink>
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
