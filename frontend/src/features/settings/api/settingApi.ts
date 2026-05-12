import axiosClient from '../../../lib/axiosClient';

export const settingApi = {
  getNotificationSettings: () => {
    return axiosClient.get('/settings/notifications');
  },

  // Cập nhật cấu hình thông báo
  updateNotificationSettings: (settingsData: any) => {
    return axiosClient.put('/settings/notifications', settingsData);
  }
};