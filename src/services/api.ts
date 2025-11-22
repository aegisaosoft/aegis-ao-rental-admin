import axios from 'axios';

// API Base URL from environment variables
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log DELETE requests for debugging
    if (config.method === 'delete') {
      const fullUrl = (config.baseURL || '') + (config.url || '');
      console.log('[api] DELETE request:', config.url, 'Full URL:', fullUrl);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - token invalid or session expired
      // Clear token and user info
      localStorage.removeItem('token');
      localStorage.removeItem('aegisUser');
      // Only redirect if we're not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

