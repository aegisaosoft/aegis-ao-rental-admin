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
}

const apiService = new ApiService();
export default apiService;
export { apiService };

