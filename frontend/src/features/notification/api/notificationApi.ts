import axiosClient from '../../../lib/axiosClient';
import { AppNotification, NotificationPageResponse } from '../types/notificationTypes';

const unwrap = (res: any) => {
  if (!res) return res;
  if (res.data?.data !== undefined) return res.data.data;
  if (res.data !== undefined) return res.data;
  return res;
};

const normalizePage = (payload: any): NotificationPageResponse => {
  const data = unwrap(payload);

  if (Array.isArray(data)) {
    return {
      content: data,
      page: 0,
      size: data.length,
      totalElements: data.length,
      totalPages: 1,
      hasNext: false,
    };
  }

  const content = data?.content || data?.data?.content || data?.notifications || [];

  return {
    content,
    page: Number(data?.page ?? data?.number ?? 0),
    size: Number(data?.size ?? content.length ?? 20),
    totalElements: Number(data?.totalElements ?? data?.total_elements ?? content.length ?? 0),
    totalPages: Number(data?.totalPages ?? data?.total_pages ?? 1),
    hasNext: Boolean(data?.hasNext ?? data?.has_next ?? false),
  };
};

const normalizeUnreadCount = (payload: any) => {
  const data = unwrap(payload);

  if (typeof data === 'number') return data;
  if (typeof data === 'string') return Number(data) || 0;

  return Number(data?.count ?? data?.unread_count ?? data?.unreadCount ?? data?.total ?? 0);
};

const normalizeNotificationList = (payload: any): AppNotification[] => {
  const data = unwrap(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.notifications)) return data.notifications;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.content)) return data.data.content;
  return [];
};

export const notificationApi = {
  getNotifications: async (params?: { page?: number; size?: number; unreadOnly?: boolean }) => {
    const res = await axiosClient.get('/notifications', { params });
    return normalizePage(res);
  },

  getUnreadCount: async () => {
    const res = await axiosClient.get('/notifications/unread-count');
    return normalizeUnreadCount(res);
  },

  longPolling: async () => {
    const res = await axiosClient.get('/notifications/long-polling');
    return normalizeNotificationList(res);
  },

  markAsRead: async (id: string): Promise<AppNotification | null> => {
    const res = await axiosClient.patch(`/notifications/${id}/read`);
    const data = unwrap(res);
    return data || null;
  },

  markAllAsRead: async () => {
    const res = await axiosClient.patch('/notifications/read-all');
    return unwrap(res);
  },
};