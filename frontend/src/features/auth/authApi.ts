import axiosClient from '../../lib/axiosClient';
export const authApi = {
  change_Password: async (payload: { old_password: string; new_password: string }) => {
    const response: any = await axiosClient.put('/users/change-password', payload);
    return response.data || response;
  }
};