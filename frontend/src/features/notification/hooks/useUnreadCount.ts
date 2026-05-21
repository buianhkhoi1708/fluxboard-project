import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '../api/notificationApi';

export const useUnreadCount = () => {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],

    queryFn: async () => {
      const res = await notificationApi.getUnreadCount();
      return res.data.data;
    },

    refetchInterval: 30000,
  });
};