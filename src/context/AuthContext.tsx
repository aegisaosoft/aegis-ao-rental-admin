import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

const AUTH_DEBUG = true;

const debugLog = (...args: unknown[]) => {
  if (AUTH_DEBUG) {
    console.info('[AuthContext]', ...args);
  }
};

const debugGroup = (label: string, callback: () => void) => {
  if (!AUTH_DEBUG) {
    callback();
    return;
  }
  console.groupCollapsed(`[AuthContext] ${label}`);
  try {
    callback();
  } finally {
    console.groupEnd();
  }
};

type RawAuthUser = {
  userId?: string;
  UserId?: string;
  user_id?: string;
  aegisUserId?: string;
  AegisUserId?: string;
  aegis_user_id?: string;
  firstName?: string;
  FirstName?: string;
  first_name?: string;
  lastName?: string;
  LastName?: string;
  last_name?: string;
  phone?: string;
  Phone?: string;
  phone_number?: string;
  role?: string;
  Role?: string;
  userRole?: string;
  isActive?: boolean;
  IsActive?: boolean;
  is_active?: boolean;
  lastLogin?: string;
  LastLogin?: string;
  last_login?: string;
  createdAt?: string;
  CreatedAt?: string;
  created_at?: string;
};

interface AegisUser {
  userId: string;
  aegisUserId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface AuthContextType {
  user: AegisUser | null;
  loading: boolean;
  currentCompanyId: string | null;
  login: (credentials: { userId: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapAuthUser = (raw: RawAuthUser): AegisUser => {
  const roleValue =
    raw.role ??
    raw.Role ??
    raw.userRole ??
    '';

  return {
    userId: raw.userId ?? raw.UserId ?? raw.user_id ?? '',
    aegisUserId: raw.aegisUserId ?? raw.AegisUserId ?? raw.aegis_user_id ?? '',
    firstName: raw.firstName ?? raw.FirstName ?? raw.first_name ?? '',
    lastName: raw.lastName ?? raw.LastName ?? raw.last_name ?? '',
    phone: raw.phone ?? raw.Phone ?? raw.phone_number ?? undefined,
    role: roleValue ? roleValue.toLowerCase() : 'agent',
    isActive: raw.isActive ?? raw.IsActive ?? raw.is_active ?? true,
    lastLogin: raw.lastLogin ?? raw.LastLogin ?? raw.last_login ?? undefined,
    createdAt: raw.createdAt ?? raw.CreatedAt ?? raw.created_at ?? new Date().toISOString()
  };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AegisUser | null>(() => {
    try {
      const stored = localStorage.getItem('aegisUser');
      if (stored) {
        const parsed = JSON.parse(stored) as RawAuthUser;
        const mapped = mapAuthUser(parsed);
        debugGroup('Hydrate from localStorage', () => {
          debugLog('Raw stored value:', parsed);
          debugLog('Mapped user:', mapped);
        });
        return mapped;
      }
    } catch (err) {
      console.warn('Failed to parse stored user', err);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [currentCompanyId] = useState<string | null>(() => {
    return localStorage.getItem('currentCompanyId');
  });

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        debugLog('Token found, loading profile...');
        try {
          const response = await api.get('/aegis-admin/profile');
          debugGroup('Profile response', () => {
            debugLog('Full response data:', response.data);
          });
          const payload = response.data?.result ?? response.data;
          const userPayload = (payload && typeof payload === 'object' && 'user' in payload)
            ? (payload as { user: RawAuthUser | null }).user
            : (payload as RawAuthUser | null);

          if (userPayload) {
            const normalized = mapAuthUser(userPayload);
            debugGroup('Profile normalization', () => {
              debugLog('Raw payload:', userPayload);
              debugLog('Normalized user:', normalized);
            });
            setUser(normalized);
            localStorage.setItem('aegisUser', JSON.stringify(normalized));
          } else {
            console.warn('[AuthContext] Profile response did not include user payload', payload);
          }
        } catch (error: any) {
          if (error.response?.status !== 401) {
            console.error('Auth initialization error:', error);
          }
          localStorage.removeItem('token');
          localStorage.removeItem('aegisUser');
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (credentials: { userId: string; password: string }) => {
    debugGroup('Login attempt', () => {
      debugLog('Credentials userId:', credentials.userId);
    });
    const response = await api.post('/aegis-admin/login', credentials);
    const responseData = response.data;
    debugGroup('Login response', () => {
      debugLog('Raw response data:', responseData);
    });
    
    // Handle both old and new response formats
    const tokenData = responseData.result?.token || responseData.token;
    const userData = responseData.result?.user || responseData.user;
    
    localStorage.setItem('token', tokenData);
    setToken(tokenData);
    
    if (userData) {
      const mappedUser = mapAuthUser(userData);
      debugGroup('Login normalization', () => {
        debugLog('Raw user data:', userData);
        debugLog('Mapped user:', mappedUser);
      });
      setUser(mappedUser);
      localStorage.setItem('aegisUser', JSON.stringify(mappedUser));
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('aegisUser');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    debugGroup('User state change', () => {
      debugLog('Current user:', user);
    });
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, currentCompanyId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

