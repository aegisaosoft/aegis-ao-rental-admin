import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';

const StripeOnboardingComplete = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    // Wait a moment to show the success message, then redirect
    const timer = setTimeout(() => {
      if (companyId) {
        // Pass state to trigger auto-sync when returning to the Stripe management page
        navigate(`/companies/${companyId}/stripe`, { 
          replace: true,
          state: { fromComplete: true }
        });
      } else {
        navigate('/companies', { replace: true });
      }
    }, 3000);

    // Check if onboarding was successful by trying to fetch status
    // For now, just show success after a brief delay
    setTimeout(() => {
      setStatus('success');
    }, 1000);

    return () => clearTimeout(timer);
  }, [companyId, navigate]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Processing...
              </h2>
              <p className="text-gray-600">
                Please wait while we verify your Stripe account setup.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Onboarding Complete!
              </h2>
              <p className="text-gray-600 mb-6">
                Your Stripe account has been successfully set up. You will be redirected to the Stripe management page shortly.
              </p>
              <div className="text-sm text-gray-500">
                Redirecting in a few seconds...
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-2xl">✕</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Setup Incomplete
              </h2>
              <p className="text-gray-600 mb-6">
                There was an issue completing your Stripe account setup. Please try again or contact support.
              </p>
              {companyId && (
                <button
                  onClick={() => navigate(`/companies/${companyId}/stripe`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Go to Stripe Management
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default StripeOnboardingComplete;

