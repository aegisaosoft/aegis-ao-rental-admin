import axios from 'axios';

// API Base URL from environment variables
const envUrl = process.env.REACT_APP_API_URL;
const API_BASE_URL = envUrl ? `${envUrl.replace(/\/+$/, '')}/api` : '/api';

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
    // Log all PUT/POST requests for debugging
    if (config.method === 'put' || config.method === 'post' || config.method === 'delete') {
      const fullUrl = (config.baseURL || '') + (config.url || '');
      console.log(`[api] ${config.method?.toUpperCase()} request:`, config.url, 'Full URL:', fullUrl);
      if (config.method === 'put' && config.data) {
        const dataKeys = Object.keys(config.data);
        const hasImageData = dataKeys.some(key => 
          ['bannerLink', 'backgroundLink', 'logoUrl', 'faviconUrl'].includes(key) && 
          typeof config.data[key] === 'string' && 
          config.data[key].startsWith('data:')
        );
        console.log(`[api] PUT data keys:`, dataKeys);
        console.log(`[api] PUT has image data:`, hasImageData);
        if (hasImageData) {
          console.log(`[api] PUT image field lengths:`, {
            bannerLink: config.data.bannerLink?.length || 0,
            backgroundLink: config.data.backgroundLink?.length || 0,
            logoUrl: config.data.logoUrl?.length || 0,
            faviconUrl: config.data.faviconUrl?.length || 0,
          });
        }
      }
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

