import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '../api/notificationApi';

export const useUnreadCount = () => {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationApi.getUnreadCount(),
    refetchInterval: 30000,
  });
};