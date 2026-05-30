import axiosClient from '../../../lib/axiosClient';

const unwrapData = (res: any) => res?.data || res;

export const userApi = {
  getUsers: () => axiosClient.get('/users?size=100'),

  getAllUsers: (params?: { page?: number; size?: number; search?: string }) => {
    const finalParams = { page: 0, size: 50, ...params };
    return axiosClient.get('/users', { params: finalParams });
  },

  getAccounts: (params?: { page?: number; size?: number }) => {
    const finalParams = { page: 0, size: 100, ...params };
    return axiosClient.get('/users/accounts', { params: finalParams });
  },

  createUser: (data: any) => {
    return axiosClient.post('/users', data);
  },

  getRoles: () => axiosClient.get('/rbac/roles?size=100'),

  updateUser: (userId: string | number, data: any) => {
    return axiosClient.put(`/users/${userId}`, data);
  },

  updateAccountRole: (userId: string | number, roleId: string) => {
    return axiosClient.patch(`/users/accounts/${userId}/role`, { role_id: roleId });
  },

  deleteUser: (userId: string | number) => {
    return axiosClient.delete(`/users/${userId}`);
  },

  deleteAccount: (userId: string | number) => {
    return axiosClient.delete(`/users/accounts/${userId}`);
  },

  uploadAvatar: async (userId: string | number, file: File) => {
    const presignRes: any = await axiosClient.get(`/users/${userId}/avatar/presigned-url`, {
      params: { fileName: file.name, contentType: file.type }
    });

    const responseData = unwrapData(presignRes);
    const { uploadUrl, fileUrl } = responseData;

    if (!uploadUrl || !fileUrl) {
      throw new Error("Presigned URL không hợp lệ hoặc Backend không trả về URL.");
    }

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload S3 thất bại: ${uploadRes.status} - ${uploadRes.statusText}`);
    }

    await axiosClient.put(`/users/${userId}/avatar`, { avatarUrl: fileUrl });
    return { url: fileUrl };
  }
};