import api from './api';

interface GetVehiclesParams {
  page?: number;
  pageSize?: number;
  companyId?: string;
}

interface GetVehiclesResponse {
  data: {
    items: any[];
    totalCount: number;
  };
}

class ApiService {
  async getPickupLocations(companyId: string) {
    const response = await api.get(`/locations?companyId=${companyId}`);
    const data = response.data.result || response.data;
    return {
      data: Array.isArray(data) ? data : (data?.items || [])
    };
  }

  async getVehicles(params: GetVehiclesParams): Promise<GetVehiclesResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.companyId) queryParams.append('companyId', params.companyId);
    
    const response = await api.get(`/vehicles?${queryParams.toString()}`);
    const data = response.data.result || response.data;
    return {
      data: {
        items: data.items || data || [],
        totalCount: data.totalCount || data.length || 0
      }
    };
  }

  async updateVehicle(vehicleId: string, updateData: { locationId: string | null }) {
    const response = await api.put(`/vehicles/${vehicleId}`, updateData);
    return response.data.result || response.data;
  }

  async getAllModels(): Promise<ModelItem[]> {
    const response = await api.get('/models');
    const data = response.data.result || response.data;
    return Array.isArray(data) ? data : [];
  }
}

export interface ModelItem {
  id: string;
  make: string;
  modelName: string;
  year: number;
  fuelType: string | null;
  transmission: string | null;
  seats: number | null;
  dailyRate: number | null;
  features: string[] | null;
  description: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  vehicleCount: number;
  availableCount: number;
}

const apiService = new ApiService();
export default apiService;
export { apiService };

