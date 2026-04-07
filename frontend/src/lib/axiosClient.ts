import axios from 'axios';

// Khởi tạo Instance với Base URL
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // Set timeout khoảng 10 giây để tránh app bị treo nếu mạng lag
  timeout: 10000, 
});

// Request Interceptor
axiosClient.interceptors.request.use(
  (config) => {
    // Tự động cấu hình header Content-Type
    config.headers['Content-Type'] = 'application/json';
    
    // 👉 ĐÃ MỞ KHÓA: Lấy Token từ LocalStorage và nhét vào Header (Bearer Token)
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
axiosClient.interceptors.response.use(
  (response) => {
    // Trả về thẳng data cho gọn, khi gọi API không cần chấm .data nhiều lần
    return response.data; 
  },
  (error) => {
    // Đón lõng và xử lý lỗi 400/500 từ Backend
    if (error.response) {
      const status = error.response.status;
      console.error(`[API Error ${status}]:`, error.response.data || 'Đã có lỗi xảy ra từ máy chủ');
      
      // 👉 MẸO PRO ENTERPRISE: Bắt lỗi 401 để Auto Logout
      if (status === 401) {
        console.warn("🔴 Token không hợp lệ hoặc đã hết hạn. Đang đăng xuất...");
        // Khôi bảo Long mở 2 dòng dưới ra khi làm xong trang Login nhé:
        // localStorage.removeItem('token');
        // window.location.href = '/login'; 
      }
      
    } else if (error.request) {
      // Lỗi không có phản hồi từ server (sập server, rớt mạng)
      console.error('[Network Error]: Không thể kết nối tới máy chủ');
    } else {
      // Lỗi khi setup request
      console.error('[Axios Error]:', error.message);
    }

    // Promise.reject để các component gọi API biết là có lỗi
    return Promise.reject(error);
  }
);

export default axiosClient;
