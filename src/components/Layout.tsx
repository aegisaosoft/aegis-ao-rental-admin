import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Car, LogOut, Building2, Home, Settings as SettingsIcon, CreditCard } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const roleLower = ((user as any)?.role ?? (user as any)?.Role ?? '').toString().trim().toLowerCase();
  const firstName = (user.firstName ?? '').trim();
  const lastName = (user.lastName ?? '').trim();
  const userId = (user.userId ?? '').trim();
  const displayName = `${firstName || userId || 'User'}${lastName ? ` ${lastName}` : ''}`.trim();
  const displayRole = roleLower || 'user';
  const canAccessSettings = roleLower === 'mainadmin' || roleLower === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation Bar - Azure Style */}
      <nav className="bg-blue-600 z-10">
        <div className="flex items-center justify-between px-6 py-3 h-14">
          {/* Logo and Brand */}
          <div className="flex items-center gap-4">
            <Car className="h-6 w-6 text-white" />
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold text-white">Aegis</span>
              <span className="text-xl font-semibold text-blue-200">Admin</span>
            </div>
          </div>

          {/* Navigation Links and User Info */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className={`flex items-center gap-2 px-3 py-2 rounded transition ${
                pathname === '/dashboard' 
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white'
              }`}
            >
              <Home className="h-4 w-4" />
              <span className="text-sm font-medium">Home</span>
            </button>
            <button
              onClick={() => navigate('/companies')}
              className={`flex items-center gap-2 px-3 py-2 rounded transition ${
                pathname.startsWith('/companies') 
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span className="text-sm font-medium">Companies</span>
            </button>
            {canAccessSettings && (
              <button
                onClick={() => navigate('/settings')}
                className={`flex items-center gap-2 px-3 py-2 rounded transition ${
                  pathname.startsWith('/settings') && !pathname.startsWith('/stripe-settings')
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                }`}
              >
                <SettingsIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Settings</span>
              </button>
            )}
            {canAccessSettings && (
              <button
                onClick={() => navigate('/stripe-settings')}
                className={`flex items-center gap-2 px-3 py-2 rounded transition ${
                  pathname.startsWith('/stripe-settings')
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span className="text-sm font-medium">Stripe Settings</span>
              </button>
            )}

            {/* User Info and Logout */}
            <div className="flex items-center gap-3 pl-4 border-l border-blue-500">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{displayName || 'User'}</p>
                <p className="text-xs text-blue-200 capitalize">{displayRole || 'user'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-2 text-blue-100 hover:bg-blue-700 hover:text-white rounded transition"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;

