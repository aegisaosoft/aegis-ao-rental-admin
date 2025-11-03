import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Settings, Building2 } from 'lucide-react';
import Layout from '../components/Layout';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user.firstName}!
          </h2>
          <p className="text-gray-600">
            You're logged in as <span className="font-medium capitalize">{user.role}</span>
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
              onClick={() => navigate('/companies')}
              className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors"
            >
              <Building2 className="h-6 w-6 text-blue-600 mb-2" />
              <p className="font-medium text-gray-900">Companies</p>
              <p className="text-sm text-gray-500">Manage rental companies</p>
            </button>
            <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors">
              <Settings className="h-6 w-6 text-blue-600 mb-2" />
              <p className="font-medium text-gray-900">Settings</p>
              <p className="text-sm text-gray-500">Manage app settings</p>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
