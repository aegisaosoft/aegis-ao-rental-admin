import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import companyService from '../services/companyService';
import { Company } from '../services/companyService';
import { Building2, ArrowLeft, Save, X } from 'lucide-react';
import Layout from '../components/Layout';

// Country options grouped by continent
const countriesByContinent = {
  'North America': [
    'Anguilla', 'Antigua and Barbuda', 'Bahamas', 'Barbados', 'Belize', 'Bermuda',
    'British Virgin Islands', 'Canada', 'Cayman Islands', 'Costa Rica',
    'Cuba', 'Dominica', 'Dominican Republic', 'El Salvador', 'Greenland',
    'Grenada', 'Guatemala', 'Haiti', 'Honduras', 'Jamaica', 'Mexico',
    'Montserrat', 'Nicaragua', 'Panama', 'Puerto Rico', 'Saint Kitts and Nevis',
    'Saint Lucia', 'Saint Pierre and Miquelon', 'Saint Vincent and the Grenadines',
    'Trinidad and Tobago', 'Turks and Caicos Islands', 'United States',
    'US Virgin Islands'
  ],
  'South America': [
    'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador',
    'French Guiana', 'Guyana', 'Paraguay', 'Peru', 'Suriname',
    'Uruguay', 'Venezuela'
  ]
};

const CompanyForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Company>>({
    companyName: '',
    email: '',
    subdomain: undefined, // Optional - can be set manually
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    logoUrl: '',
    faviconUrl: '',
    country: '',
    language: 'en',
    motto: '',
    mottoDescription: '',
    about: '',
    website: '',
    customCss: '',
    videoLink: '',
    bannerLink: '',
    backgroundLink: '',
    invitation: '',
    bookingIntegrated: false,
    taxId: '',
    stripeAccountId: '',
    isActive: true
  });

  const loadCompany = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await companyService.getCompanyById(id!);
      setFormData(data);
    } catch (err: any) {
      console.error('Failed to load company:', err);
      setError(err.message || 'Failed to load company');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadCompany();
    }
  }, [id, loadCompany]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Prepare data - convert empty strings to null for optional fields
      const submitData = {
        ...formData,
        // Convert empty strings to null/undefined for optional fields
        subdomain: formData.subdomain && formData.subdomain.trim() ? formData.subdomain.trim().toLowerCase() : undefined,
        logoUrl: formData.logoUrl && formData.logoUrl.trim() ? formData.logoUrl : undefined,
        faviconUrl: formData.faviconUrl && formData.faviconUrl.trim() ? formData.faviconUrl : undefined,
        country: formData.country && formData.country.trim() ? formData.country : undefined,
        language: formData.language && formData.language.trim() ? formData.language : undefined,
        motto: formData.motto && formData.motto.trim() ? formData.motto : undefined,
        mottoDescription: formData.mottoDescription && formData.mottoDescription.trim() ? formData.mottoDescription : undefined,
        about: formData.about && formData.about.trim() ? formData.about : undefined,
        website: formData.website && formData.website.trim() ? formData.website : undefined,
        customCss: formData.customCss && formData.customCss.trim() ? formData.customCss : undefined,
        videoLink: formData.videoLink && formData.videoLink.trim() ? formData.videoLink : undefined,
        bannerLink: formData.bannerLink && formData.bannerLink.trim() ? formData.bannerLink : undefined,
        backgroundLink: formData.backgroundLink && formData.backgroundLink.trim() ? formData.backgroundLink : undefined,
        invitation: formData.invitation && formData.invitation.trim() ? formData.invitation : undefined,
        taxId: formData.taxId && formData.taxId.trim() ? formData.taxId : undefined,
        stripeAccountId: formData.stripeAccountId && formData.stripeAccountId.trim() ? formData.stripeAccountId : undefined,
      };

      if (id) {
        await companyService.updateCompany(id, submitData);
        alert('Company updated successfully!');
      } else {
        await companyService.createCompany(submitData);
        alert('Company created successfully!\n\nNext steps:\n1. Set subdomain manually if not set\n2. Add DNS CNAME record (if subdomain set)\n3. Configure custom domain in Azure\n4. Set up SSL certificate');
      }
      navigate('/companies');
    } catch (err: any) {
      console.error('Failed to save company:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to save company';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">
              {id ? 'Edit Company' : 'Create New Company'}
            </h1>
          </div>
          <button 
            type="button" 
            onClick={() => navigate('/companies')}
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to List
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 bg-white rounded-lg shadow-lg p-8">
          {/* Basic Information */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName || ''}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Acme Rentals"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  required
                  placeholder="contact@company.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700 mb-2">
                  Subdomain <span className="text-gray-500 text-xs">(Optional - can be set manually)</span>
                </label>
                <div className="flex items-center">
                <input
                  type="text"
                  id="subdomain"
                  name="subdomain"
                  value={formData.subdomain || ''}
                  onChange={handleChange}
                  pattern="[a-z0-9-]+"
                  placeholder="company"
                  className="w-full px-4 py-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                />
                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-gray-700">
                    .aegis-rental.com
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Lowercase letters, numbers, and hyphens only. Leave empty to set later.
                </p>
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  id="country"
                  name="country"
                  value={formData.country || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Country</option>
                  {Object.entries(countriesByContinent).map(([continent, countries]) => (
                    <optgroup key={continent} label={continent}>
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  id="language"
                  name="language"
                  value={formData.language || 'en'}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="pt">Português</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>
          </section>

          {/* Branding */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Branding & Design</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="primaryColor"
                    name="primaryColor"
                    value={formData.primaryColor}
                    onChange={handleChange}
                    className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    placeholder="#007bff"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="secondaryColor"
                    name="secondaryColor"
                    value={formData.secondaryColor}
                    onChange={handleChange}
                    className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    placeholder="#6c757d"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Logo URL
              </label>
              <input
                type="url"
                id="logoUrl"
                name="logoUrl"
                value={formData.logoUrl || ''}
                onChange={handleChange}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.logoUrl && (
                <img src={formData.logoUrl} alt="Logo preview" className="mt-2 max-w-xs h-20 object-contain border border-gray-300 rounded" />
              )}
            </div>

            <div>
              <label htmlFor="faviconUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Favicon URL
              </label>
              <input
                type="url"
                id="faviconUrl"
                name="faviconUrl"
                value={formData.faviconUrl || ''}
                onChange={handleChange}
                placeholder="https://example.com/favicon.ico"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="bannerLink" className="block text-sm font-medium text-gray-700 mb-2">
                Banner Image URL
              </label>
              <input
                type="url"
                id="bannerLink"
                name="bannerLink"
                value={formData.bannerLink || ''}
                onChange={handleChange}
                placeholder="https://example.com/banner.jpg"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.bannerLink && (
                <img src={formData.bannerLink} alt="Banner preview" className="mt-2 w-full max-w-2xl h-48 object-cover border border-gray-300 rounded" />
              )}
            </div>

            <div>
              <label htmlFor="backgroundLink" className="block text-sm font-medium text-gray-700 mb-2">
                Background Image URL
              </label>
              <input
                type="url"
                id="backgroundLink"
                name="backgroundLink"
                value={formData.backgroundLink || ''}
                onChange={handleChange}
                placeholder="https://example.com/background.jpg"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="videoLink" className="block text-sm font-medium text-gray-700 mb-2">
                Video Link
              </label>
              <input
                type="url"
                id="videoLink"
                name="videoLink"
                value={formData.videoLink || ''}
                onChange={handleChange}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </section>

          {/* Content & Messaging */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Content & Messaging</h2>
            
            <div>
              <label htmlFor="motto" className="block text-sm font-medium text-gray-700 mb-2">
                Motto
              </label>
              <input
                type="text"
                id="motto"
                name="motto"
                value={formData.motto || ''}
                onChange={handleChange}
                placeholder="e.g., Your Trusted Rental Partner"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="mottoDescription" className="block text-sm font-medium text-gray-700 mb-2">
                Motto Description
              </label>
              <textarea
                id="mottoDescription"
                name="mottoDescription"
                value={formData.mottoDescription || ''}
                onChange={handleChange}
                rows={2}
                placeholder="e.g., Providing quality rental services since 2024"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="invitation" className="block text-sm font-medium text-gray-700 mb-2">
                Invitation Text
              </label>
              <input
                type="text"
                id="invitation"
                name="invitation"
                value={formData.invitation || ''}
                onChange={handleChange}
                placeholder="e.g., Find & Book a Great Deal Today"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="about" className="block text-sm font-medium text-gray-700 mb-2">
                About
              </label>
              <textarea
                id="about"
                name="about"
                value={formData.about || ''}
                onChange={handleChange}
                rows={4}
                placeholder="Company description..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website || ''}
                onChange={handleChange}
                placeholder="https://company.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="customCss" className="block text-sm font-medium text-gray-700 mb-2">
                Custom CSS
              </label>
              <textarea
                id="customCss"
                name="customCss"
                value={formData.customCss || ''}
                onChange={handleChange}
                rows={6}
                placeholder="Custom CSS styles..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                Advanced: Add custom CSS to override default styles
              </p>
            </div>
          </section>

          {/* Business Information */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Business Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-2">
                  Tax ID
                </label>
                <input
                  type="text"
                  id="taxId"
                  name="taxId"
                  value={formData.taxId || ''}
                  onChange={handleChange}
                  placeholder="12-3456789"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="stripeAccountId" className="block text-sm font-medium text-gray-700 mb-2">
                  Stripe Account ID
                </label>
                <input
                  type="text"
                  id="stripeAccountId"
                  name="stripeAccountId"
                  value={formData.stripeAccountId || ''}
                  onChange={handleChange}
                  placeholder="acct_1234567890"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Settings */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Settings</h2>
            
            <div className="space-y-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="bookingIntegrated"
                  checked={formData.bookingIntegrated || false}
                  onChange={handleChange}
                  className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">Booking Integrated</span>
              </label>

              {id && (
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive !== undefined ? formData.isActive : true}
                    onChange={handleChange}
                    className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Active</span>
                </label>
              )}
            </div>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button 
              type="button" 
              onClick={() => navigate('/companies')}
              className="flex items-center gap-2 bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 transition"
              disabled={saving}
            >
              <X className="h-5 w-5" />
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              <Save className="h-5 w-5" />
              {saving ? 'Saving...' : (id ? 'Update Company' : 'Create Company')}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CompanyForm;

