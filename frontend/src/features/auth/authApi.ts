import axiosClient from '../../lib/axiosClient';

export const authApi = {
  // 🚀 Đã đổi thành method POST để khớp hoàn toàn với AuthController
  changePassword: async (data: { oldPassword: string; newPassword: string }) => {
    // Lưu ý: Spring Boot mặc định nhận camelCase (oldPassword, newPassword) 
    // trừ khi trong class ChangePasswordRequest bạn có cấu hình @JsonProperty
    const response: any = await axiosClient.post('/auth/change-password', data);
    return response.data || response;
  },
};