import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CompanyList from './pages/CompanyList';
import CompanyForm from './pages/CompanyForm';
import VehicleLocations from './pages/VehicleLocations';
import ScrollToTop from './components/ScrollToTop';
import Settings from './pages/Settings';
import StripeSettings from './pages/StripeSettings';
import CompanyStripeManagement from './pages/CompanyStripeManagement';
import StripeOnboardingComplete from './pages/StripeOnboardingComplete';
import SetNewClient from './pages/SetNewClient';
import DesignerRoute from './components/DesignerRoute';
import './App.css';

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // For designer role, wrap with DesignerRoute to handle company redirect
  const roleLower = ((user as any)?.role ?? (user as any)?.Role ?? '').toString().trim().toLowerCase();
  if (roleLower === 'designer') {
    return <DesignerRoute>{children}</DesignerRoute>;
  }

  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <ToastContainer
            position="top-center"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/set-new-client" element={<SetNewClient />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/companies"
            element={
              <ProtectedRoute>
                <CompanyList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/companies/:companyId/stripe"
            element={
              <ProtectedRoute>
                <CompanyStripeManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/companies/:companyId/stripe/complete"
            element={
              <ProtectedRoute>
                <StripeOnboardingComplete />
              </ProtectedRoute>
            }
          />
          <Route
            path="/companies/new"
            element={
              <ProtectedRoute>
                <CompanyForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/companies/:id"
            element={
              <ProtectedRoute>
                <CompanyForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stripe-settings"
            element={
              <ProtectedRoute>
                <StripeSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicle-locations"
            element={
              <ProtectedRoute>
                <VehicleLocations />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            } 
          />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
