import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2,
  ExternalLink,
  Ban,
  RotateCcw,
  Trash2,
  ArrowLeft,
  Search,
  Copy,
  Check
} from 'lucide-react';
import api from '../services/api';
import companyService, { Company as CompanyServiceType } from '../services/companyService';

interface StripeAccountStatus {
  stripeAccountId?: string;
  StripeAccountId?: string; // Backend uses PascalCase
  chargesEnabled?: boolean;
  ChargesEnabled?: boolean; // Backend uses PascalCase
  payoutsEnabled?: boolean;
  PayoutsEnabled?: boolean; // Backend uses PascalCase
  detailsSubmitted?: boolean;
  DetailsSubmitted?: boolean; // Backend uses PascalCase
  onboardingCompleted?: boolean;
  OnboardingCompleted?: boolean; // Backend uses PascalCase
  accountStatus?: string;
  AccountStatus?: string; // Backend uses PascalCase
  requirementsCurrentlyDue?: string[];
  RequirementsCurrentlyDue?: string[]; // Backend uses PascalCase
  requirementsPastDue?: string[];
  RequirementsPastDue?: string[]; // Backend uses PascalCase
  disabledReason?: string;
  DisabledReason?: string; // Backend uses PascalCase
  lastSyncAt?: string;
  LastSyncAt?: string; // Backend uses PascalCase
}

// Use the Company type from companyService
type Company = CompanyServiceType;

const CompanyStripeManagement: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [suspendReason, setSuspendReason] = useState('terms_of_service');
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch company details (hooks must be called before any conditional returns)
  const { data: company, isLoading: companyLoading, error: companyError } = useQuery<Company>({
    queryKey: ['company', companyId],
    queryFn: async () => {
      // Use companyService to get company data (same as CompanyForm)
      const companyData = await companyService.getCompanyById(companyId!);
      return companyData;
    },
    enabled: !!companyId,
    retry: false,
  });

  // Initialize onboarding URL from company data if available
  React.useEffect(() => {
    if (company) {
      const companyLink = (company as any)?.stripeOnboardingLink;
      if (companyLink && !onboardingUrl) {
        console.log('[CompanyStripeManagement] Loading onboarding link from company data:', companyLink);
        setOnboardingUrl(companyLink);
      }
    }
  }, [company, onboardingUrl]);

  // Debug: Log when onboardingUrl state changes
  React.useEffect(() => {
    console.log('[CompanyStripeManagement] onboardingUrl state changed to:', onboardingUrl);
  }, [onboardingUrl]);

  // Fetch Stripe account status
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<StripeAccountStatus>({
    queryKey: ['stripeStatus', companyId],
    queryFn: async () => {
      try {
        const response = await api.get(`/companies/${companyId}/stripe/status`);
        
        // The API wraps responses in { result: data, reason: 0, message: null, stackTrace: null }
        // Unwrap it like other services do
        const statusData = response.data.result || response.data;
        
        return statusData;
      } catch (error: any) {
        // If 404, the company might not have a Stripe account yet
        if (error.response?.status === 404) {
          return {
            stripeAccountId: undefined,
            chargesEnabled: false,
            payoutsEnabled: false,
            detailsSubmitted: false,
            onboardingCompleted: false,
            accountStatus: 'not_started',
            requirementsCurrentlyDue: [],
            requirementsPastDue: [],
          } as StripeAccountStatus;
        }
        
        // Return default status for any error
        return {
          stripeAccountId: undefined,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          onboardingCompleted: false,
          accountStatus: 'not_started',
          requirementsCurrentlyDue: [],
          requirementsPastDue: [],
        } as StripeAccountStatus;
      }
    },
    enabled: !!companyId,
    retry: false,
    // Auto-sync from Stripe if account is in onboarding state
    refetchOnMount: true,
    // Poll every 30 seconds if account exists and is in onboarding or has requirements
    // This ensures UI updates after webhook events
    refetchInterval: (query) => {
      const data = query.state.data as StripeAccountStatus | undefined;
      if (!data) return false;
      
      const accountStatus = (data.accountStatus || data.AccountStatus || 'not_started').toLowerCase();
      const hasAccount = !!(data.stripeAccountId || data.StripeAccountId);
      const isOnboarding = accountStatus === 'onboarding' || !(data.onboardingCompleted ?? data.OnboardingCompleted);
      const hasRequirements = ((data.requirementsCurrentlyDue?.length ?? 0) > 0) || 
                             ((data.requirementsPastDue?.length ?? 0) > 0);
      
      // Poll if account exists and is in onboarding or has pending requirements
      if (hasAccount && (isOnboarding || hasRequirements)) {
        return 10000; // 10 seconds
      }
      
      // Poll every 30 seconds if account is active (to catch any status changes)
      if (hasAccount && accountStatus === 'active') {
        return 30000; // 30 seconds
      }
      
      return false; // No polling if no account or inactive
    },
  });


  // Setup Stripe account mutation
  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/companies/${companyId}/stripe/setup`);
      return response.data;
    },
    onSuccess: (data) => {
      setOnboardingUrl(data.onboardingUrl);
      queryClient.invalidateQueries({ queryKey: ['stripeStatus', companyId] });
    },
    onError: (error: any) => {
      console.error('[CompanyStripeManagement] Setup error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create Stripe account';
      alert(`Error: ${errorMessage}`);
    },
  });

  // Get onboarding link mutation
  const getOnboardingLinkMutation = useMutation({
    mutationFn: async () => {
      console.log('[CompanyStripeManagement] mutationFn called, fetching onboarding link...');
      console.log('[CompanyStripeManagement] companyId:', companyId);
      try {
        // Add json query parameter to get JSON response instead of redirect
        const response = await api.get(`/companies/${companyId}/stripe/reauth?json=true`, {
          headers: {
            'Accept': 'application/json'
          }
        });
        console.log('[CompanyStripeManagement] Raw API response:', response);
        console.log('[CompanyStripeManagement] Raw API response.data:', response.data);
        return response.data;
      } catch (error) {
        console.error('[CompanyStripeManagement] Error in mutationFn:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('[CompanyStripeManagement] onSuccess called with data:', data);
      console.log('[CompanyStripeManagement] Data type:', typeof data);
      console.log('[CompanyStripeManagement] Data keys:', data ? Object.keys(data) : 'null');
      
      // The API wraps responses in { result: data, reason: 0 }
      // Try multiple ways to extract the URL
      let url: string | null = null;
      
      // Check if data is already the URL string
      if (typeof data === 'string' && data.startsWith('http')) {
        url = data;
      }
      // Check if wrapped in result
      else if (data?.result) {
        const result = data.result;
        url = result?.url || result?.onboardingUrl || (typeof result === 'string' ? result : null);
      }
      // Check if direct properties
      else if (data) {
        url = data.url || data.onboardingUrl || (typeof data === 'string' ? data : null);
      }
      
      console.log('[CompanyStripeManagement] Extracted URL:', url);
      
      if (url) {
        console.log('[CompanyStripeManagement] Setting onboarding URL state:', url);
        setOnboardingUrl(url);
        // Optionally open in new tab
        window.open(url, '_blank');
      } else {
        console.warn('[CompanyStripeManagement] No URL found in response. Full data:', JSON.stringify(data, null, 2));
        alert('Warning: Onboarding link was received but could not be extracted. Check console for details.');
      }
      queryClient.invalidateQueries({ queryKey: ['stripeStatus', companyId] });
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
    },
    onError: (error: any) => {
      console.error('[CompanyStripeManagement] Get onboarding link error:', error);
      const errorData = error.response?.data;
      let errorMessage = 'Failed to get onboarding link';
      
      if (errorData) {
        // Combine error and message fields for better user feedback
        const parts = [];
        if (errorData.error) parts.push(errorData.error);
        if (errorData.message && errorData.message !== errorData.error) {
          parts.push(errorData.message);
        }
        errorMessage = parts.length > 0 ? parts.join(': ') : errorData.message || errorData.error || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Error: ${errorMessage}`);
    },
  });

  // Suspend account mutation
  const suspendMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await api.post(`/companies/${companyId}/stripe/suspend`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripeStatus', companyId] });
    },
  });

  // Reactivate account mutation
  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/companies/${companyId}/stripe/reactivate`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripeStatus', companyId] });
    },
  });

  // Delete account mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/companies/${companyId}/stripe`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripeStatus', companyId] });
    },
  });

  // Track if this is an auto-sync (to avoid showing alerts)
  const [isAutoSync, setIsAutoSync] = React.useState(false);

  // Sync/Find account mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/companies/${companyId}/stripe/sync`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stripeStatus', companyId] });
      // Only show alert for manual syncs, not auto-syncs
      if (!isAutoSync) {
        alert('Account status synced successfully from Stripe!');
      }
      setIsAutoSync(false); // Reset flag
    },
    onError: (error: any) => {
      console.error('[CompanyStripeManagement] Sync error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to sync account';
      // Only show alert for manual syncs, not auto-syncs
      if (!isAutoSync) {
        alert(`Error: ${errorMessage}`);
      }
      setIsAutoSync(false); // Reset flag
    },
  });

  // Auto-sync from Stripe when page loads if account is in onboarding state
  // Also auto-sync when returning from Stripe onboarding complete page
  React.useEffect(() => {
    if (!status || !companyId) return;

    const accountStatus = (status.accountStatus || status.AccountStatus || 'not_started').toLowerCase();
    const hasAccount = !!(status.stripeAccountId || status.StripeAccountId);
    const isOnboarding = accountStatus === 'onboarding' || !(status.onboardingCompleted ?? status.OnboardingCompleted);
    const lastSyncAt = status.lastSyncAt || status.LastSyncAt;
    
    // Check if we're returning from the complete page (URL contains /complete or state indicates it)
    const isReturningFromComplete = location.pathname.includes('/complete') || 
      location.state?.fromComplete === true;
    
    // Auto-sync if:
    // 1. Account exists
    // 2. (Account is in onboarding state OR returning from complete page)
    // 3. Either never synced, or last sync was more than 2 minutes ago (or immediately if returning from complete)
    if (hasAccount && (isOnboarding || isReturningFromComplete)) {
      const timeSinceLastSync = lastSyncAt ? (new Date().getTime() - new Date(lastSyncAt).getTime()) : Infinity;
      const shouldSync = !lastSyncAt || 
        timeSinceLastSync > (isReturningFromComplete ? 0 : 2 * 60 * 1000); // 2 minutes, or immediately if returning from complete
      
      if (shouldSync && !syncMutation.isPending) {
        console.log('[CompanyStripeManagement] Auto-syncing account status from Stripe', 
          isReturningFromComplete ? '(returning from onboarding complete)' : '(account in onboarding state)');
        setIsAutoSync(true); // Mark as auto-sync to suppress alerts
        syncMutation.mutate(undefined, {
          onSuccess: () => {
            // Refetch status after sync
            setTimeout(() => {
              refetchStatus();
            }, 500);
          },
          onError: (error) => {
            console.error('[CompanyStripeManagement] Auto-sync failed:', error);
            // Don't show alert for auto-sync failures, just log
          }
        });
      }
    }
  }, [status, companyId, syncMutation, refetchStatus, location]);

  // Ensure we have a companyId - check after all hooks are called
  if (!companyId) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Invalid Company ID</h2>
            <p className="text-red-700 mb-4">No company ID provided in the URL.</p>
            <button
              onClick={() => navigate('/companies')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Back to Companies
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const getStatusColor = (status?: string) => {
    if (!status) return 'text-gray-600 bg-gray-50';
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'onboarding':
        return 'text-yellow-600 bg-yellow-50';
      case 'past_due':
        return 'text-red-600 bg-red-50';
      case 'restricted':
        return 'text-orange-600 bg-orange-50';
      case 'not_started':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status?: string) => {
    if (!status) return <XCircle className="h-5 w-5 text-gray-600" />;
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'onboarding':
        return <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />;
      case 'past_due':
      case 'restricted':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  if (companyLoading || statusLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  if (companyError) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Company</h2>
            <p className="text-red-700 mb-4">
              {companyError instanceof Error ? companyError.message : 'Failed to load company information'}
            </p>
            <button
              onClick={() => navigate('/companies')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Back to Companies
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/companies')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Companies
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Stripe Account Management
                {company && (company.companyName || (company as any).name) && (
                  <span className="text-2xl font-semibold text-gray-600 ml-3">
                    - {company.companyName || (company as any).name}
                  </span>
                )}
              </h1>
            </div>
            <CreditCard className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        {/* Status Card */}
        {status && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${getStatusColor((status.accountStatus || status.AccountStatus || 'not_started').toLowerCase())}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Status</span>
                  {getStatusIcon((status.accountStatus || status.AccountStatus || 'not_started').toLowerCase())}
                </div>
                <p className="text-2xl font-bold capitalize">{((status.accountStatus || status.AccountStatus || 'not_started').replace('_', ' '))}</p>
              </div>
              
              {(status.stripeAccountId || status.StripeAccountId) && (
                <div className="p-4 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700">Account ID</span>
                  </div>
                  <p className="text-sm font-mono text-gray-600">{status.stripeAccountId || status.StripeAccountId}</p>
                </div>
              )}
            </div>

            {/* Capabilities */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-3 rounded-lg ${(status?.chargesEnabled ?? status?.ChargesEnabled) ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Charges</span>
                  {(status?.chargesEnabled ?? status?.ChargesEnabled) ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <p className={`text-sm mt-1 ${(status?.chargesEnabled ?? status?.ChargesEnabled) ? 'text-green-700' : 'text-red-700'}`}>
                  {(status?.chargesEnabled ?? status?.ChargesEnabled) ? 'Enabled' : 'Disabled'}
                </p>
              </div>

              <div className={`p-3 rounded-lg ${(status?.payoutsEnabled ?? status?.PayoutsEnabled) ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Payouts</span>
                  {(status?.payoutsEnabled ?? status?.PayoutsEnabled) ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <p className={`text-sm mt-1 ${(status?.payoutsEnabled ?? status?.PayoutsEnabled) ? 'text-green-700' : 'text-red-700'}`}>
                  {(status?.payoutsEnabled ?? status?.PayoutsEnabled) ? 'Enabled' : 'Disabled'}
                </p>
              </div>

              <div className={`p-3 rounded-lg ${(status?.onboardingCompleted ?? status?.OnboardingCompleted) ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Onboarding</span>
                  {(status?.onboardingCompleted ?? status?.OnboardingCompleted) ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
                <p className={`text-sm mt-1 ${(status?.onboardingCompleted ?? status?.OnboardingCompleted) ? 'text-green-700' : 'text-yellow-700'}`}>
                  {(status?.onboardingCompleted ?? status?.OnboardingCompleted) ? 'Completed' : 'In Progress'}
                </p>
              </div>
            </div>

            {/* Requirements */}
            {((status?.requirementsCurrentlyDue?.length ?? 0) > 0 || (status?.requirementsPastDue?.length ?? 0) > 0) && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Requirements</h3>
                {(status?.requirementsPastDue?.length ?? 0) > 0 && (
                  <div className="mb-2">
                    <p className="text-sm font-medium text-red-700 mb-1">Past Due:</p>
                    <ul className="list-disc list-inside text-sm text-red-600">
                      {status.requirementsPastDue?.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(status?.requirementsCurrentlyDue?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-sm font-medium text-yellow-700 mb-1">Currently Due:</p>
                    <ul className="list-disc list-inside text-sm text-yellow-600">
                      {status.requirementsCurrentlyDue?.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {status?.disabledReason && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-700">Disabled Reason:</p>
                <p className="text-sm text-red-600">{status.disabledReason}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions</h2>
          
          <div className="space-y-4">
            {/* Setup Account - Always show when status is "Not Started" */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">1. Create Stripe Account</h3>
              <p className="text-sm text-gray-600 mb-4">
                Create a new Stripe Connect account for this company.
              </p>
              <button
                onClick={() => setupMutation.mutate()}
                disabled={setupMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {setupMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Create Account
                  </>
                )}
              </button>
              {onboardingUrl && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">Onboarding URL:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={onboardingUrl}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded-md bg-white text-gray-900 font-mono"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(onboardingUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <a
                      href={onboardingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                      title="Open in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Get Onboarding Link - Show when account exists but onboarding not completed */}
            {(() => {
              const hasAccount = !!(status?.stripeAccountId || status?.StripeAccountId || company?.stripeAccountId);
              const onboardingNotCompleted = !(status?.onboardingCompleted || status?.OnboardingCompleted);
              const shouldShow = hasAccount && onboardingNotCompleted;
              console.log('[CompanyStripeManagement] Get Onboarding Link section - shouldShow:', shouldShow, 'hasAccount:', hasAccount, 'onboardingNotCompleted:', onboardingNotCompleted);
              console.log('[CompanyStripeManagement] status:', status);
              console.log('[CompanyStripeManagement] company:', company);
              return shouldShow;
            })() && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">2. Get Onboarding Link</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Get or refresh the Stripe onboarding link to complete account setup.
                </p>
                
                {/* Always show the link field */}
                <div className="mb-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-900 mb-2">Onboarding URL:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={onboardingUrl || (company as any)?.stripeOnboardingLink || ''}
                      readOnly
                      placeholder="Click 'Get Onboarding Link' to generate the URL"
                      className="flex-1 px-3 py-2 text-sm border border-green-300 rounded-md bg-white text-gray-900 font-mono"
                      onClick={(e) => {
                        const input = e.target as HTMLInputElement;
                        if (input.value) {
                          input.select();
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const urlToCopy = onboardingUrl || (company as any)?.stripeOnboardingLink || '';
                        if (urlToCopy) {
                          navigator.clipboard.writeText(urlToCopy);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }
                      }}
                      disabled={!onboardingUrl && !(company as any)?.stripeOnboardingLink}
                      className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <a
                      href={onboardingUrl || (company as any)?.stripeOnboardingLink || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center ${!(onboardingUrl || (company as any)?.stripeOnboardingLink) ? 'pointer-events-none opacity-50' : ''}`}
                      title="Open in new tab"
                      onClick={(e) => {
                        if (!onboardingUrl && !(company as any)?.stripeOnboardingLink) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[CompanyStripeManagement] ====== BUTTON CLICKED ======');
                    console.log('[CompanyStripeManagement] Button clicked! Calling mutate...');
                    console.log('[CompanyStripeManagement] companyId:', companyId);
                    console.log('[CompanyStripeManagement] mutation state:', {
                      isPending: getOnboardingLinkMutation.isPending,
                      isError: getOnboardingLinkMutation.isError,
                      isSuccess: getOnboardingLinkMutation.isSuccess
                    });
                    try {
                      getOnboardingLinkMutation.mutate(undefined, {
                        onSuccess: (data) => {
                          console.log('[CompanyStripeManagement] MUTATION SUCCESS - data:', data);
                        },
                        onError: (error) => {
                          console.error('[CompanyStripeManagement] MUTATION ERROR:', error);
                        }
                      });
                      console.log('[CompanyStripeManagement] mutate() called successfully');
                    } catch (error) {
                      console.error('[CompanyStripeManagement] Error calling mutate():', error);
                    }
                  }}
                  disabled={getOnboardingLinkMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {getOnboardingLinkMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Getting link...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Get Onboarding Link
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Check Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">{(status?.stripeAccountId || status?.StripeAccountId || company?.stripeAccountId) && !(status?.onboardingCompleted || status?.OnboardingCompleted) ? '3' : '2'}. Check Status</h3>
              <p className="text-sm text-gray-600 mb-4">
                Sync the latest account status from Stripe API and update the database. Use this after completing onboarding or if the status seems outdated.
              </p>
              <button
                onClick={() => {
                  // Sync from Stripe first, then refetch
                  syncMutation.mutate(undefined, {
                    onSuccess: () => {
                      // Refetch status after sync completes
                      setTimeout(() => {
                        refetchStatus();
                      }, 500);
                    }
                  });
                }}
                disabled={statusLoading || syncMutation.isPending}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {(statusLoading || syncMutation.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing from Stripe...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Sync Status from Stripe
                  </>
                )}
              </button>
            </div>

            {/* Find/Sync Account */}
            {status && (status.stripeAccountId || status.StripeAccountId) && (
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <h3 className="font-medium text-blue-900 mb-2">3. Find Account</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Fetch the latest account status directly from Stripe API and update the database.
                  Use this if the status seems outdated or after completing onboarding.
                </p>
                <button
                  onClick={() => {
                    // Manual sync - show alerts
                    setIsAutoSync(false);
                    syncMutation.mutate();
                  }}
                  disabled={syncMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {syncMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Find Account from Stripe
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Suspend Account */}
            {status && (status.accountStatus || status.AccountStatus) && (status.accountStatus || status.AccountStatus || '').toLowerCase() !== 'not_started' && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">4. Suspend Account</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Temporarily disable the Stripe account.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason
                  </label>
                  <select
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="fraud">Fraud</option>
                    <option value="terms_of_service">Terms of Service</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <button
                  onClick={() => suspendMutation.mutate(suspendReason)}
                  disabled={suspendMutation.isPending}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {suspendMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Suspending...
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4 mr-2" />
                      Suspend Account
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Reactivate Account */}
            {status && status.accountStatus && status.accountStatus !== 'not_started' && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">5. Reactivate Account</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Re-enable a suspended Stripe account.
                </p>
                <button
                  onClick={() => reactivateMutation.mutate()}
                  disabled={reactivateMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {reactivateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Reactivating...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reactivate Account
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Delete Account */}
            {status && status.accountStatus && status.accountStatus !== 'not_started' && (
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h3 className="font-medium text-red-900 mb-2">6. Delete Account</h3>
                <p className="text-sm text-red-700 mb-4">
                  Permanently delete the Stripe account. This action cannot be undone.
                </p>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this Stripe account? This action cannot be undone.')) {
                      deleteMutation.mutate();
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CompanyStripeManagement;

