import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Building2, Loader2, CheckCircle, XCircle, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// API Base URL - constant, doesn't need to be in component
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net/api';

const SetNewClient: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, user: authUser } = useAuth();
  const email = searchParams.get('username') || '';
  const password = searchParams.get('password') || '';
  const [checkingCompany, setCheckingCompany] = useState(false);
  const [companyExists, setCompanyExists] = useState<boolean | null>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [checkingCustomer, setCheckingCustomer] = useState(false);
  const [customerData, setCustomerData] = useState<any>(null);
  const [customerCompanyName, setCustomerCompanyName] = useState<string | null>(null);
  const [creatingAegisUser, setCreatingAegisUser] = useState(false);
  const [aegisUserCreated, setAegisUserCreated] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({
    companyName: '',
    email: '',
    subdomain: '',
    country: '',
    currency: 'USD',
    language: 'en',
  });
  const [apiMessages, setApiMessages] = useState<string[]>([]);
  const hasAttemptedCreation = React.useRef(false);

  const decodedEmail = email ? decodeURIComponent(email) : '';
  const decodedPassword = password ? decodeURIComponent(password) : '';

  // Update company form email when decodedEmail is available
  useEffect(() => {
    if (decodedEmail) {
      setCompanyFormData(prev => ({ ...prev, email: decodedEmail }));
    }
  }, [decodedEmail]);

  // Ensure email is set when form is shown
  useEffect(() => {
    if (showCompanyForm && decodedEmail && !companyFormData.email) {
      setCompanyFormData(prev => ({ ...prev, email: decodedEmail }));
    }
  }, [showCompanyForm, decodedEmail, companyFormData.email]);

  useEffect(() => {
    if (!decodedEmail || !decodedPassword) {
      return;
    }

    const checkEmailAndSetup = async () => {
      setCheckingCustomer(true);
      setCheckingCompany(true);
      try {
        const response = await axios.post(
          `${API_BASE_URL}/aegis-admin/check-email-and-setup`,
          {
            email: decodedEmail,
            password: decodedPassword,
          },
          {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true,
          }
        );

        // Handle both wrapped and unwrapped response formats
        const data = response.data?.result || response.data;
        console.log('Full API Response:', data);
        
        // Store API messages and show toast notifications
        if (data.messages && Array.isArray(data.messages)) {
          setApiMessages(data.messages);
          // Show toast notifications for messages
          data.messages.forEach((message: string) => {
            if (message.startsWith('Error') || 
                message.includes('Invalid password') || 
                message.includes('contact support') ||
                message.includes('This email is registered to')) {
              toast.error(message, { position: 'top-center' });
            } else if (message === 'Email Available' || message === 'This email is available for registration.') {
              toast.success(message, { position: 'top-center' });
            } else if (message === 'No Company Found' || message === 'No company exists with this email address.') {
              toast.info(message, { position: 'top-center' });
            } else if (message.includes('Use this email') || 
                       message.includes('designer') || 
                       message.includes('After creation')) {
              toast.info(message, { position: 'top-center' });
            }
          });
        } else {
          setApiMessages([]);
        }
        
        // Set customer data based on response
        if (data.hasCustomerWithCompany) {
          setCustomerCompanyName(data.customerCompanyName || 'Unknown Company');
          setCustomerData({ companyId: true }); // Mark that customer has company
        } else {
          setCustomerData(null); // No customer or customer without company
        }

        // Set company existence
        setCompanyExists(data.companyExists || false);
        if (data.companyExists) {
          setCompanyData({ companyName: data.companyName });
        }

        // If authentication was successful (token provided), automatically authenticate and redirect
        const isAuthenticated = data.authenticated === true;
        const hasToken = !!data.token;
        const isEmailAvailable = data.emailAvailable === true;
        
        console.log('Authentication check:', { 
          authenticated: isAuthenticated, 
          hasToken: hasToken, 
          emailAvailable: isEmailAvailable,
          redirectTo: data.redirectTo,
          tokenLength: data.token?.length 
        });
        
        if (isAuthenticated && hasToken) {
          console.log('✓ All conditions met - proceeding with authentication and redirect');
          setAegisUserCreated(true);
          
          // Show success toast
          toast.success('Authentication successful! Redirecting...', { position: 'top-center' });
          
          // Store token and user info immediately
          localStorage.setItem('token', data.token);
          console.log('✓ Token stored in localStorage');
          
          if (data.user) {
            // Store user data in the format AuthContext expects
            const userData = {
              userId: data.user.userId || data.user.UserId,
              aegisUserId: data.user.aegisUserId || data.user.AegisUserId,
              firstName: data.user.firstName || data.user.FirstName,
              lastName: data.user.lastName || data.user.LastName,
              role: data.user.role || data.user.Role || 'designer',
              isActive: data.user.isActive !== undefined ? data.user.isActive : (data.user.IsActive !== undefined ? data.user.IsActive : true),
            };
            localStorage.setItem('aegisUser', JSON.stringify(userData));
            console.log('✓ User data stored in localStorage:', userData);
          }
          
          // Redirect immediately - use window.location for full page reload
          // Could be /companies/new for new companies or /companies/{id} for existing company edit
          const redirectPath = data.redirectTo || '/companies/new';
          console.log('✓ Redirecting to:', redirectPath);
          
          // Use setTimeout to ensure state updates complete before redirect
          setTimeout(() => {
            window.location.href = redirectPath;
          }, 1000); // Give time for toast to show
        } else if (isEmailAvailable && !isAuthenticated) {
          console.log('⚠ Email available but not authenticated - showing form');
          // Email available but authentication failed - show form but user needs to login manually
          setShowCompanyForm(true);
          setCompanyFormData(prev => ({ ...prev, email: decodedEmail }));
        } else if (!isEmailAvailable && !isAuthenticated) {
          console.log('✗ Email not available and not authenticated - showing error');
          // Email not available (customer with company exists) and not authenticated - show error
          // Error messages should already be in apiMessages from the API response
        }
        
        // Always set email from URL params when component mounts or email changes
        if (decodedEmail && !companyFormData.email) {
          setCompanyFormData(prev => ({ ...prev, email: decodedEmail }));
        } else {
          console.log('⚠ Authentication conditions not met:', {
            authenticated: isAuthenticated,
            hasToken: hasToken,
            emailAvailable: isEmailAvailable,
            dataKeys: Object.keys(data)
          });
        }
      } catch (err: any) {
        // Don't log 404s as errors - they're expected
        if (err.response?.status !== 404) {
          console.error('Error checking email and setup:', err);
          const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to process request';
          toast.error(errorMessage, { position: 'top-center' });
        }
      } finally {
        setCheckingCustomer(false);
        setCheckingCompany(false);
      }
    };

    checkEmailAndSetup();
  }, [decodedEmail, decodedPassword, login]);


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Building2 className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          {showCompanyForm ? 'Create Your Company' : 'New Client Setup'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {showCompanyForm 
            ? 'Fill in the details below to create your rental company'
            : 'Use these credentials to create an Aegis admin account'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {!email ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
              <p>Please provide an email address in the URL parameter: <code>?username=email@example.com</code></p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Customer Check Result - Show if customer exists with company */}
              {!checkingCustomer && customerCompanyName && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-yellow-800">
                        Email Already Registered
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        This email is registered to <strong>{customerCompanyName}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Display API Messages */}
              {!checkingCustomer && !checkingCompany && apiMessages.length > 0 && (
                <div className="space-y-3">
                  {apiMessages.map((message, index) => {
                    // Determine message type and styling based on content
                    const isEmailAvailable = message === 'Email Available';
                    const isNoCompanyFound = message === 'No Company Found';
                    const isError = message.startsWith('Error') || 
                                   message.includes('Invalid password') || 
                                   message.includes('contact support') ||
                                   message.includes('This email is registered to');
                    const isInstruction = message.includes('Use this email') || 
                                        message.includes('designer') || 
                                        message.includes('After creation');
                    
                    // Skip description messages that are shown with their titles
                    if (message === 'This email is available for registration.' || 
                        message === 'No company exists with this email address.') {
                      return null;
                    }
                    
                    if (isError) {
                      return (
                        <div key={index} className="bg-red-50 border border-red-200 rounded-md p-4">
                          <div className="flex items-start">
                            <XCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-red-800">
                                {message}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    } else if (isEmailAvailable) {
                      const descriptionIndex = apiMessages.findIndex((m, i) => i > index && m === 'This email is available for registration.');
                      return (
                        <div key={index} className="bg-green-50 border border-green-200 rounded-md p-4">
                          <div className="flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-green-800">
                                Email Available
                              </p>
                              {descriptionIndex !== -1 && (
                                <p className="text-sm text-green-700 mt-1">
                                  {apiMessages[descriptionIndex]}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    } else if (isNoCompanyFound) {
                      const descriptionIndex = apiMessages.findIndex((m, i) => i > index && m === 'No company exists with this email address.');
                      return (
                        <div key={index} className="bg-gray-50 border border-gray-200 rounded-md p-4">
                          <div className="flex items-start">
                            <XCircle className="h-5 w-5 text-gray-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-800">
                                No Company Found
                              </p>
                              {descriptionIndex !== -1 && (
                                <p className="text-sm text-gray-700 mt-1">
                                  {apiMessages[descriptionIndex]}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    } else if (isInstruction) {
                      return (
                        <div key={index} className="bg-blue-50 border border-blue-200 rounded-md p-4">
                          <p className="text-sm text-blue-800">
                            {message}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}

              {/* Loading States */}
              {(checkingCompany || checkingCustomer || creatingAegisUser) && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin mr-2" />
                  <p className="text-sm text-gray-600">
                    {creatingAegisUser 
                      ? 'Creating Aegis user and logging in...' 
                      : checkingCustomer 
                        ? 'Checking customer...' 
                        : 'Checking company...'}
                  </p>
                </div>
              )}

              {/* Aegis User Created */}
              {aegisUserCreated && !showCompanyForm && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-green-800">
                        Aegis User Created
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        User account created successfully. Please create your company below.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Company Creation Form */}
              {showCompanyForm && !customerCompanyName && (
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Your Company</h3>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!companyFormData.companyName.trim()) {
                        alert('Company name is required');
                        return;
                      }
                      setCreatingCompany(true);
                      try {
                        const token = localStorage.getItem('token');
                        const response = await axios.post(
                          `${API_BASE_URL}/companies`,
                          {
                            companyName: companyFormData.companyName,
                            email: companyFormData.email,
                            subdomain: companyFormData.subdomain || null,
                            country: companyFormData.country || null,
                            currency: companyFormData.currency || 'USD',
                            language: companyFormData.language || 'en',
                          },
                          {
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': token ? `Bearer ${token}` : '',
                            },
                            withCredentials: true,
                          }
                        );
                        const company = response.data.result || response.data;
                        if (company && company.id) {
                          // Redirect to company edit page
                          navigate(`/companies/${company.id}`, { replace: true });
                        } else {
                          alert('Company created successfully!');
                        }
                      } catch (err: any) {
                        console.error('Error creating company:', err);
                        const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create company';
                        alert(`Failed to create company: ${errorMessage}`);
                      } finally {
                        setCreatingCompany(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="companyName"
                        required
                        value={companyFormData.companyName}
                        onChange={(e) => setCompanyFormData(prev => ({ ...prev, companyName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter company name"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={companyFormData.email || decodedEmail || ''}
                        onChange={(e) => {
                          const roleLower = authUser ? ((authUser as any)?.role ?? (authUser as any)?.Role ?? '').toString().trim().toLowerCase() : '';
                          if (roleLower !== 'designer') {
                            setCompanyFormData(prev => ({ ...prev, email: e.target.value }));
                          }
                        }}
                        disabled={(() => {
                          const roleLower = authUser ? ((authUser as any)?.role ?? (authUser as any)?.Role ?? '').toString().trim().toLowerCase() : '';
                          return roleLower === 'designer';
                        })()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700 mb-1">
                        Subdomain (optional)
                      </label>
                      <input
                        type="text"
                        id="subdomain"
                        value={companyFormData.subdomain}
                        onChange={(e) => setCompanyFormData(prev => ({ ...prev, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="your-company"
                      />
                      <p className="text-xs text-gray-500 mt-1">Will be used as: your-company.aegis-rental.com</p>
                    </div>

                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                        Country
                      </label>
                      <select
                        id="country"
                        value={companyFormData.country}
                        onChange={(e) => setCompanyFormData(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a country</option>
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="Mexico">Mexico</option>
                        <option value="Brazil">Brazil</option>
                        <option value="Argentina">Argentina</option>
                        <option value="Chile">Chile</option>
                        <option value="Colombia">Colombia</option>
                        <option value="Peru">Peru</option>
                        <option value="Ecuador">Ecuador</option>
                        <option value="Uruguay">Uruguay</option>
                        <option value="Venezuela">Venezuela</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                        Currency
                      </label>
                      <select
                        id="currency"
                        value={companyFormData.currency}
                        onChange={(e) => setCompanyFormData(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="MXN">MXN - Mexican Peso</option>
                        <option value="BRL">BRL - Brazilian Real</option>
                        <option value="ARS">ARS - Argentine Peso</option>
                        <option value="CLP">CLP - Chilean Peso</option>
                        <option value="COP">COP - Colombian Peso</option>
                        <option value="PEN">PEN - Peruvian Sol</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                        Language
                      </label>
                      <select
                        id="language"
                        value={companyFormData.language}
                        onChange={(e) => setCompanyFormData(prev => ({ ...prev, language: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="pt">Português</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={creatingCompany || !companyFormData.companyName.trim()}
                      className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {creatingCompany ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating Company...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Create Company
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetNewClient;
