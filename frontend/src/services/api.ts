import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://cinecast-vpg6.onrender.com';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for injecting Authorization JWT header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cinecast_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling global 401 / Network errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('cinecast_token');
      // If not already on auth pages, we can handle navigation
    }
    return Promise.reject(error);
  }
);
