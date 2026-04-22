import axiosClient from '../../../lib/axiosClient';
// 👉 Nhớ import IncomingUser từ file Store hoặc file định nghĩa Type chung của sếp
import { IncomingUser } from '../store/useUserStore'; 

// Cấu trúc Response bọc ngoài của Backend
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// 🚀 Tạo một Type riêng cho việc Update để loại bỏ chữ 'any'
export type UpdateUserPayload = Partial<IncomingUser> & {
  status?: 'ACTIVE' | 'INACTIVE';
};

export const userApi = {
  // ==========================================
  // 1. LẤY DANH SÁCH USER (Đã gộp & Tối ưu)
  // ==========================================
  getAllUsers: (params?: { page?: number; size?: number; search?: string }): Promise<ApiResponse<IncomingUser[]>> => {
    const finalParams = { page: 0, size: 100, ...params };
    return axiosClient.get('/users', { params: finalParams });
  },
  
  // ==========================================
  // 2. CẬP NHẬT USER (Đổi Role, Đổi Tên...)
  // ==========================================
  updateUser: (userId: string, data: UpdateUserPayload): Promise<ApiResponse<IncomingUser>> => {
    return axiosClient.put(`/users/${userId}`, data);
  },
  
  // ==========================================
  // 3. VÔ HIỆU HÓA / XÓA USER
  // ==========================================
  deleteUser: (userId: string): Promise<ApiResponse<null>> => {
    return axiosClient.delete(`/users/${userId}`);
  }
};