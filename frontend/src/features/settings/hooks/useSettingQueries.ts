import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../../../features/user/api/userApi';
import { settingApi } from '../api/settingApi';

export const SETTING_KEYS = {
  notifications: ['settings', 'notifications'] as const,
};

// 🚀 Hook cập nhật Profile (Gộp cả Update Name & Upload Avatar)
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, name, file }: { userId: string | number, name: string, file: File | null }) => {
      // 1. Cập nhật thông tin cơ bản
      await userApi.updateUser(userId, { full_name: name });

      // 2. Nếu có file mới thì upload
      if (file) {
        const uploadRes: any = await userApi.uploadAvatar(userId, file);
        return { name, avatarUrl: uploadRes.data?.url || uploadRes.data || uploadRes };
      }
      return { name };
    },
    onSuccess: (data) => {
      // Invalidate cache user để UI cập nhật mới
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    }
  });
};

// 🚀 Hooks xử lý Thông báo
export const useNotificationSettings = () => {
  return useQuery({
    queryKey: SETTING_KEYS.notifications,
    queryFn: settingApi.getNotificationSettings,
  });
};

export const useUpdateNotifications = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingApi.updateNotificationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTING_KEYS.notifications });
    }
  });
};