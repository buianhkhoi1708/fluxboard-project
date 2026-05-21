import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Khởi tạo Instance với Base URL
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string, 
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request Interceptor
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 🚀 SỬA TẠI ĐÂY: Đọc token trực tiếp từ ổ cứng (localStorage) thay vì Zustand
    const token = localStorage.getItem('token');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: any) => Promise.reject(error)
);

// Response Interceptor
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Interceptor "bóc vỏ" Axios 
    return response.data;
  },
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      
      const errorData = error.response.data as any;
      console.error(`[API Error ${status}]:`, errorData || 'Đã có lỗi xảy ra từ máy chủ');
      
      if (status === 401) {
        if (error.config?.url?.includes('/auth/login')) {
            return Promise.reject(error);
        }

        console.warn("🔴 Token không hợp lệ hoặc đã hết hạn. Đang đăng xuất...");
        
        // 🚀 SỬA TẠI ĐÂY: Tự xử lý đăng xuất không cần mượn tay Zustand nữa
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
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