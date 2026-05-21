import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '../api/notificationApi';

export const NOTIFICATION_KEYS = {
  all: ['notifications'] as const,
};

export const useNotifications = (
  page = 0,
  size = 10,
  unreadOnly?: boolean
) => {
  return useQuery({
    queryKey: [
      ...NOTIFICATION_KEYS.all,
      page,
      size,
      unreadOnly,
    ],

    queryFn: async () => {
      const res = await notificationApi.getNotifications({
        page,
        size,
        unreadOnly,
      });

      return res.data.data;
    },
  });
};