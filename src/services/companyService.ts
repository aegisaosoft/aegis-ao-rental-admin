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
  blinkKey?: string; // BlinkID license key for the company
  aiIntegration?: string;
  texts?: string; // JSONB field - array of language objects with title and description
  isActive: boolean;
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
      const response = await api.get(`/companies/${id}`);
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
      const response = await api.put(`/companies/${id}`, companyData);
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

