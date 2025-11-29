import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const DesignerRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const hasCheckedRef = useRef(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net/api';

  // Allowed paths for designers (only company creation/edit and set-new-client)
  const isCompanyPage = location.pathname.startsWith('/companies/');
  const isSetNewClient = location.pathname === '/set-new-client';

  useEffect(() => {
    const checkCompanyAndRedirect = async () => {
      if (loading || !user || hasCheckedRef.current) {
        if (!loading && user) {
          setChecking(false);
        }
        return;
      }

      const roleLower = ((user as any)?.role ?? (user as any)?.Role ?? '').toString().trim().toLowerCase();
      
      // Only apply designer logic for designer role
      if (roleLower !== 'designer') {
        setChecking(false);
        return;
      }

      // If already on set-new-client, don't redirect
      if (isSetNewClient) {
        setChecking(false);
        return;
      }

      // If already on a company page, allow it (will be validated by the page itself)
      if (isCompanyPage) {
        hasCheckedRef.current = true;
        setChecking(false);
        return;
      }

      // Use userId as email to check for company
      const userEmail = user.userId?.trim();
      
      if (!userEmail) {
        setChecking(false);
        return;
      }

      try {
        // Check if company exists with this email
        const response = await axios.get(
          `${API_BASE_URL}/RentalCompanies/email/${encodeURIComponent(userEmail)}`,
          {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true,
          }
        );

        const companyData = response.data.result || response.data;
        
        if (companyData) {
          // Company exists - redirect to edit page
          const foundCompanyId = companyData.companyId || companyData.id;
          setRedirectTo(`/companies/${foundCompanyId}`);
        } else {
          // Company doesn't exist - redirect to create page
          setRedirectTo('/companies/new');
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          // Company not found - redirect to create page
          setRedirectTo('/companies/new');
        } else {
          console.error('Error checking company:', err);
          // On error, redirect to create page
          setRedirectTo('/companies/new');
        }
      } finally {
        hasCheckedRef.current = true;
        setChecking(false);
      }
    };

    checkCompanyAndRedirect();
  }, [user, loading, location.pathname, isCompanyPage, isSetNewClient]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect if needed
  if (redirectTo && redirectTo !== location.pathname) {
    return <Navigate to={redirectTo} replace />;
  }

  // Block access to non-allowed paths (dashboard, companies list, settings, etc.)
  if (!isCompanyPage && !isSetNewClient && location.pathname !== '/login') {
    // Redirect will happen from the check above, but show loading while waiting
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return children;
};

export default DesignerRoute;

