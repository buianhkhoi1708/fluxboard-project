import { create } from 'zustand';
import axiosClient from '../../../lib/axiosClient'; 

export const useAuthStore = create((set) => ({
  // Khởi tạo state từ LocalStorage
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isLoading: false,

  // Hàm xử lý Đăng nhập
  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      // Gọi API
      const response = await axiosClient.post('/auth/login', { 
        email, 
        password 
      });
      
      const token = response.data.access_token; 
      const user = response.data; 

      // Lưu xuống LocalStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Cập nhật State để UI thay đổi ngay lập tức
      set({ token, user, isLoading: false });
      return { success: true };

    } catch (error: any) {
      set({ isLoading: false });
      // Lấy thông báo lỗi từ Backend
      return { 
        success: false, 
        message: error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại!' 
      };
    }
  },

  // Hàm xử lý Quên mật khẩu
  forgotPassword: async (email: string) => {
    set({ isLoading: true });
    try {
      // Gọi API quên mật khẩu
      const response: any = await axiosClient.post('/auth/forgot-password', { email });
      set({ isLoading: false });
      return { success: true, message: response.message || 'Đã gửi yêu cầu khôi phục.' };
    } catch (error: any) {
      set({ isLoading: false });
      return { 
        success: false, 
        message: error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.' 
      };
    }
  },

  // Hàm xử lý Đăng xuất
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
    // Đá về trang login
    window.location.href = '/login'; 
  }
}));