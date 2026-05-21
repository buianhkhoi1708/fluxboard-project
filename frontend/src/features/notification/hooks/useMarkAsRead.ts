import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/notificationApi';

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      notificationApi.markAsRead(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notifications'],
      });

      queryClient.invalidateQueries({
        queryKey: ['notifications', 'unread-count'],
      });
    },
  });
};