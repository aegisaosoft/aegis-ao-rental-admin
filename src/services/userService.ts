import api from './api';

export interface AegisUser {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: 'mainadmin' | 'admin' | 'agent' | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string | null;
}

export interface SaveUserRequest {
  userId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'mainadmin' | 'admin' | 'agent';
  isActive?: boolean;
  password?: string;
}

const mapUser = (data: any): AegisUser => ({
  id: data.id ?? data.Id,
  userId: data.userId ?? data.UserId,
  firstName: data.firstName ?? data.FirstName,
  lastName: data.lastName ?? data.LastName,
  phone: data.phone ?? data.Phone ?? undefined,
  role: data.role ?? data.Role ?? 'agent',
  isActive: data.isActive ?? data.IsActive ?? false,
  createdAt: data.createdAt ?? data.CreatedAt ?? '',
  updatedAt: data.updatedAt ?? data.UpdatedAt ?? '',
  lastLogin: data.lastLogin ?? data.LastLogin ?? undefined,
});

class UserService {
  async getUsers(includeInactive = true): Promise<AegisUser[]> {
    const response = await api.get('/users', {
      params: { includeInactive }
    });
    const payload = response.data.result || response.data;
    return Array.isArray(payload) ? payload.map(mapUser) : [];
  }

  async getUser(id: string): Promise<AegisUser> {
    const response = await api.get(`/users/${id}`);
    const payload = response.data.result || response.data;
    return mapUser(payload);
  }

  async createUser(payload: SaveUserRequest): Promise<AegisUser> {
    const response = await api.post('/users', payload);
    const result = response.data.result || response.data;
    return mapUser(result);
  }

  async updateUser(id: string, payload: Partial<SaveUserRequest>): Promise<AegisUser> {
    const response = await api.put(`/users/${id}`, payload);
    const result = response.data.result || response.data;
    return mapUser(result);
  }

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  }
}

const userService = new UserService();
export default userService;

