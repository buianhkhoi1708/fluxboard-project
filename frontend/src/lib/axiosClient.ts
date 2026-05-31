import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

let isRedirectingToLogin = false;

const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/verify-reset-token',
  '/auth/reset-password',
  '/health-check',
];

const isPublicEndpoint = (url?: string) => {
  if (!url) return false;
  return PUBLIC_ENDPOINTS.some((endpoint) => url.includes(endpoint));
};

const clearAuthAndRedirect = () => {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;

  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('auth:unauthorized'));

  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
};

axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');

    if (token && config.headers && !isPublicEndpoint(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.headers && isPublicEndpoint(config.url)) {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error: any) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data as any;

      console.error(`[API Error ${status}]:`, errorData || 'Đã có lỗi xảy ra từ máy chủ');

      if (status === 401 && !isPublicEndpoint(error.config?.url)) {
        clearAuthAndRedirect();
      }
    } else if (error.request) {
      console.error('[Network Error]: Không thể kết nối tới máy chủ');
    } else {
      console.error('[Axios Error]:', error.message);
    }

    return Promise.reject(error);
  }
);

export default axiosClient;