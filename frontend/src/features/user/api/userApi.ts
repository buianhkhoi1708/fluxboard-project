import axiosClient from '../../../lib/axiosClient';

export const userApi = {
  // Lấy danh sách thành viên (Cho size bự bự xíu để khỏi làm phân trang ở UI)
  getUsers: () => axiosClient.get('/users?size=100'),
  
  // Cập nhật User (Bao gồm đổi Role)
  updateUser: (userId: string, data: any) => axiosClient.put(`/users/${userId}`, data),
  
  // Xóa User khỏi hệ thống
  deleteUser: (userId: string) => axiosClient.delete(`/users/${userId}`),
  getAllUsers: (params = { page: 0, size: 50 }) => {
    return axiosClient.get('/users', { params });
  },
  // 1. Lấy thông tin cá nhân của user đang đăng nhập
  getProfile: () => axiosClient.get('/users/profile'), 
  // 2. Cập nhật thông tin cá nhân (Dùng FormData để hỗ trợ upload file ảnh)
  updateProfile: (formData: FormData) => axiosClient.put('/users/profile', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
};