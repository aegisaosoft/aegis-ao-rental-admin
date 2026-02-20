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

  async getCategories(): Promise<VehicleCategory[]> {
    const response = await api.get('/vehicles/categories');
    const data = response.data.result || response.data;
    return Array.isArray(data) ? data : [];
  }

  async updateModelCategory(modelId: string, categoryId: string | null) {
    const response = await api.put(`/models/${modelId}/category`, { categoryId });
    return response.data.result || response.data;
  }

  async startCarImageSearch(make: string, model: string, maxResults: number = 16): Promise<string> {
    const response = await api.post('/car-images/search', { make, model, maxResults });
    const data = response.data.result || response.data;
    return data.jobId;
  }

  async getCarImageSearchStatus(jobId: string): Promise<CarSearchJobStatus> {
    const response = await api.get(`/car-images/search/status/${jobId}`);
    return response.data.result || response.data;
  }

  async processCarImage(make: string, model: string, sourceImageUrl: string): Promise<CarProcessResult> {
    const response = await api.post('/car-images/process', { make, model, sourceImageUrl }, {
      timeout: 120000, // 2 минуты — обработка изображений (скачивание + Python + Azure Blob)
    });
    return response.data.result || response.data;
  }
}

export interface VehicleCategory {
  id: string;
  categoryName: string;
  description: string | null;
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

export interface CarSearchResult {
  id: string;
  thumbnailUrl: string;
  sourceUrl: string;
  make: string;
  model: string;
  source: string; // "cars.com" | "google"
}

export interface CarProcessResult {
  blobUrl: string;
  fileName: string;
  status: string;
}

export interface CarSearchJobStatus {
  jobId: string;
  status: string; // pending, searching_cars, searching_google, completed, error
  message: string;
  foundCount: number;
  results: CarSearchResult[];
  elapsedSeconds: number;
}

const apiService = new ApiService();
export default apiService;
export { apiService };

