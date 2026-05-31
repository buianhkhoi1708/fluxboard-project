import axiosClient from '../../../lib/axiosClient';

const unwrapData = (res: any) => res?.data || res;

export interface NotificationPreferencePayload {
  emailNotificationsEnabled?: boolean;
  inAppNotificationsEnabled?: boolean;
  email_notifications_enabled?: boolean;
  in_app_notifications_enabled?: boolean;
}

export const settingApi = {
  getNotificationSettings: async () => {
    const res: any = await axiosClient.get('/users/me/notifications/preferences');
    return unwrapData(res);
  },

  updateNotificationSettings: async (settingsData: NotificationPreferencePayload) => {
    const payload = {
      email_notifications_enabled:
        settingsData.email_notifications_enabled ?? settingsData.emailNotificationsEnabled ?? false,
      in_app_notifications_enabled:
        settingsData.in_app_notifications_enabled ?? settingsData.inAppNotificationsEnabled ?? false,
    };

    const res: any = await axiosClient.put('/users/me/notifications/preferences', payload);
    return unwrapData(res);
  },

  uploadAvatar: async (userId: string, file: File) => {
    const presignedRes: any = await axiosClient.get(`/users/${userId}/avatar/presigned-url`, {
      params: { fileName: file.name, contentType: file.type },
    });

    const presignedData = presignedRes?.data || presignedRes;
    const { uploadUrl, fileUrl } = presignedData;

    if (!uploadUrl || !fileUrl) {
      throw new Error('Presigned URL không hợp lệ hoặc Backend không trả về URL.');
    }

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload avatar thất bại: ${uploadRes.status}`);
    }

    await axiosClient.put(`/users/${userId}/avatar`, { avatarUrl: fileUrl });
    return { url: fileUrl };
  },
};