import axiosClient from '../../../lib/axiosClient';

export const userApi = {
  // Lấy danh sách thành viên (Cho size bự bự xíu để khỏi làm phân trang ở UI)
  getUsers: () => axiosClient.get('/users?size=100'),
  
  // Cập nhật User (Bao gồm đổi Role)
  updateUser: (userId: string | number, data: any) => axiosClient.put(`/users/${userId}`, data),
  
  // Xóa User khỏi hệ thống
  deleteUser: (userId: string | number) => axiosClient.delete(`/users/${userId}`),
  getAllUsers: (params = { page: 0, size: 50 }) => {
    return axiosClient.get('/users', { params });
  },
  uploadAvatar: (userId: string | number, file: File) => {
    const formData = new FormData();
    formData.append('file', file); 
    return axiosClient.post(`/users/${userId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};