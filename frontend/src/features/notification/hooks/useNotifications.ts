import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '../api/notificationApi';

export const NOTIFICATION_KEYS = {
  all: ['notifications'] as const,
  list: (page: number, size: number, unreadOnly?: boolean) =>
    ['notifications', 'list', page, size, Boolean(unreadOnly)] as const,
};

export const useNotifications = (
  page = 0,
  size = 20,
  unreadOnly?: boolean
) => {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(page, size, unreadOnly),
    queryFn: () => notificationApi.getNotifications({ page, size, unreadOnly }),
  });
};