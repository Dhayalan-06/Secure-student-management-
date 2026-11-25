import axios from 'axios';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
});
api.interceptors.request.use((config) => {
  if (/^\/auth\/(login|register|google)$/.test(config.url || '')) return config;
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(undefined, (error) => {
  const bearer = error.config?.headers?.Authorization;
  const token = localStorage.getItem('accessToken');
  if (error.response?.status === 401 && token && bearer === `Bearer ${token}`) {
    localStorage.removeItem('accessToken');
    window.dispatchEvent(new Event('student-session-expired'));
  }
  return Promise.reject(error);
});
