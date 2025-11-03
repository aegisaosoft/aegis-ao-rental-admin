import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

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
  login: (credentials: { userId: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AegisUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await api.get('/aegis-admin/profile');
          setUser(response.data);
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
    const response = await api.post('/aegis-admin/login', credentials);
    const responseData = response.data;
    
    // Handle both old and new response formats
    const tokenData = responseData.result?.token || responseData.token;
    const userData = responseData.result?.user || responseData.user;
    
    localStorage.setItem('token', tokenData);
    setToken(tokenData);
    
    if (userData) {
      setUser(userData);
      localStorage.setItem('aegisUser', JSON.stringify(userData));
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('aegisUser');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

