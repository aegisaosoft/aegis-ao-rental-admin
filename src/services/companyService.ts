import api from './api';

interface Company {
  id: string;
  companyName: string;
  email: string;
  subdomain?: string | null; // Optional - can be set manually
  fullDomain?: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  country?: string;
  currency?: string;
  language?: string;
  securityDeposit?: number;
  isSecurityDepositMandatory?: boolean;
  motto?: string;
  mottoDescription?: string;
  about?: string;
  website?: string;
  customCss?: string;
  videoLink?: string;
  bannerLink?: string;
  backgroundLink?: string;
  invitation?: string;
  bookingIntegrated?: boolean;
  taxId?: string;
  stripeAccountId?: string;
  hasStripeAccount?: boolean;
  stripeSettingsId?: string;
  blinkKey?: string; // BlinkID license key for the company
  aiIntegration?: string;
  texts?: string; // JSONB field - array of language objects with title and description
  isActive: boolean;
  isTestCompany?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

class CompanyService {
  /**
   * Get all companies (admin only)
   */
  async getAllCompanies(includeInactive = false): Promise<Company[]> {
    try {
      const response = await api.get('/companies', {
        params: { includeInactive }
      });
      // The API wraps responses in { result: data, reason: 0, message: null, stackTrace: null }
      return response.data.result || response.data;
    } catch (error) {
      console.error('Failed to load companies:', error);
      throw error;
    }
  }

  /**
   * Get company by ID (admin only)
   */
  async getCompanyById(id: string): Promise<Company> {
    try {
      const response = await api.get(`/RentalCompanies/${id}`);
      // The API wraps responses in { result: data, reason: 0, message: null, stackTrace: null }
      return response.data.result || response.data;
    } catch (error) {
      console.error(`Failed to load company ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new company (admin only)
   */
  async createCompany(companyData: Partial<Company>): Promise<Company> {
    try {
      const response = await api.post('/companies', companyData);
      // The API wraps responses in { result: data, reason: 0, message: null, stackTrace: null }
      return response.data.result || response.data;
    } catch (error) {
      console.error('Failed to create company:', error);
      throw error;
    }
  }

  /**
   * Update an existing company (admin only)
   */
  async updateCompany(id: string, companyData: Partial<Company>): Promise<Company> {
    try {
      const response = await api.put(`/RentalCompanies/${id}`, companyData);
      // The API wraps responses in { result: data, reason: 0, message: null, stackTrace: null }
      return response.data.result || response.data;
    } catch (error) {
      console.error(`Failed to update company ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a company (admin only)
   */
  async deleteCompany(id: string): Promise<void> {
    try {
      await api.delete(`/companies/${id}`);
    } catch (error) {
      console.error(`Failed to delete company ${id}:`, error);
      throw error;
    }
  }

  /**
   * Clear the About field for a company (admin only)
   */
  async clearCompanyAbout(id: string): Promise<Company> {
    try {
      console.log('[companyService] Calling DELETE /RentalCompanies/' + id + '/about');
      const response = await api.delete(`/RentalCompanies/${id}/about`);
      console.log('[companyService] Clear about response:', response);
      // The API wraps responses in { result: data, reason: 0, message: null, stackTrace: null }
      return response.data.result || response.data;
    } catch (error: any) {
      console.error(`[companyService] Failed to clear about field for company ${id}:`, error);
      console.error('[companyService] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url
      });
      throw error;
    }
  }

  /**
   * Invalidate company cache (admin only)
   */
  async invalidateCache(): Promise<void> {
    try {
      await api.post('/companies/invalidate-cache');
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
      throw error;
    }
  }
}

const companyService = new CompanyService();
export default companyService;
export type { Company };

