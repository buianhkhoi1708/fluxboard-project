import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/notificationApi';
import { useNotificationStore } from '../stores/useNotificationStore';

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  const markAsReadInStore = useNotificationStore((state) => state.markAsRead);

  return useMutation({
    mutationFn: (id: string) => markAsReadInStore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  const markAllAsReadInStore = useNotificationStore((state) => state.markAllAsRead);

  return useMutation({
    mutationFn: () => markAllAsReadInStore(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
};