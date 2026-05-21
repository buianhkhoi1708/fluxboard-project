import axiosClient from '../../../lib/axiosClient';

export interface Notification {
  id: string;
  recipientId: string;
  type:
    | 'TASK_ASSIGNED'
    | 'TASK_MOVED'
    | 'DEADLINE_APPROACHING'
    | 'TASK_OVERDUE'
    | 'DEADLINE_UPDATED'
    | 'EXTENSION_APPROVED'
    | 'EXTENSION_REJECTED'
    | 'EXTENSION_REQUESTED';

  title: string;
  message: string;

  isRead: boolean;

  metadata?: {
    taskId?: string;
    boardId?: string;
    [key: string]: any;
  };

  createdAt: string;
}

export interface NotificationPageResponse {
  content: Notification[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const notificationApi = {
  /**
   * 🔔 Lấy danh sách notifications
   */
  getNotifications: (
    params?: {
      page?: number;
      size?: number;
      unreadOnly?: boolean;
    }
  ) =>
    axiosClient.get('/notifications', {
      params,
    }),

  /**
   * 🔴 Badge unread count
   */
  getUnreadCount: () =>
    axiosClient.get('/notifications/unread-count'),

  /**
   * ✔️ Đánh dấu 1 notification đã đọc
   */
  markAsRead: (id: string) =>
    axiosClient.patch(`/notifications/${id}/read`),

  /**
   * ✔️ Đánh dấu tất cả đã đọc
   */
  markAllAsRead: () =>
    axiosClient.patch('/notifications/read-all'),
};