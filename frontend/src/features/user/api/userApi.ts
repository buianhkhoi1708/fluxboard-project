import axiosClient from '../../../lib/axiosClient';
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

// INTERFACE CHO CẤU HÌNH THÔNG BÁO
export interface NotificationPreferences {
  email_notifications_enabled: boolean;
  in_app_notifications_enabled: boolean;
  notify_on_task_assign: boolean;
  notify_on_due_date: boolean;
  notify_on_comment_mention: boolean;
}

export const userApi = {
  // LẤY DANH SÁCH USER (Đã gộp & Tối ưu)
  getAllUsers: (params?: { page?: number; size?: number; search?: string }): Promise<ApiResponse<IncomingUser[]>> => {
    const finalParams = { page: 0, size: 100, ...params };
    return axiosClient.get('/users', { params: finalParams });
  },
  
  // CẬP NHẬT USER (Đổi Role, Đổi Tên...)
  updateUser: (userId: string, data: UpdateUserPayload): Promise<ApiResponse<IncomingUser>> => {
    return axiosClient.put(`/users/${userId}`, data);
  },
  
  // VÔ HIỆU HÓA / XÓA USER
  deleteUser: (userId: string): Promise<ApiResponse<null>> => {
    return axiosClient.delete(`/users/${userId}`);
  },

  // Upload avatar
  uploadAvatar: (userId: string, file: File): Promise<ApiResponse<string>> => {
    const formData = new FormData();
    formData.append('file', file); // Chú ý: Backend đang bắt tham số tên là "file"
    
    return axiosClient.post(`/users/${userId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Lấy cấu hình thông báo
  getNotificationPrefs: (userId: string): Promise<ApiResponse<NotificationPreferences>> => {
    return axiosClient.get(`/users/${userId}/notifications/preferences`);
  },

  // Cập nhật cấu hình thông báo
  updateNotificationPrefs: (userId: string, data: NotificationPreferences): Promise<ApiResponse<NotificationPreferences>> => {
    return axiosClient.put(`/users/${userId}/notifications/preferences`, data);
  }
};