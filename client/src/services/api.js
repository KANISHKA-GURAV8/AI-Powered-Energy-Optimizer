import axios from 'axios';

/**
 * Axios instance pre-configured with the backend base URL.
 * All API calls go through this instance.
 *
 * Usage:
 *   import api from '../services/api';
 *   const res = await api.post('/auth/login', { email, password });
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Request interceptor:
 * Attaches the JWT token (from localStorage) to every outgoing request.
 * This allows protected routes to verify the user's identity.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
