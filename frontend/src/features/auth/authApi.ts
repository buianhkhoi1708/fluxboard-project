// authApi.ts
import axios from 'axios';

// Cấu hình axios instance nếu bạn chưa có
const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
});

export const authApi = {
  // ... các hàm login, forgotPassword khác

  changePassword: async (data: { oldPassword: string; newPassword: string }) => {
    // 1. Lấy token từ nơi lưu trữ
    const token = localStorage.getItem('token'); 

    // 2. Kẹp token vào Header Authorization
    return await apiClient.post('/auth/change-password', data, {
      headers: {
        Authorization: `Bearer ${token}` 
      }
    });
  }
};