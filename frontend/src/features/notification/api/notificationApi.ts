import axiosClient from '../../../lib/axiosClient';
import { AppNotification, NotificationPageResponse } from '../types/notificationTypes';

const unwrapApiData = (res: any) => {
  if (res?.data !== undefined) return res.data;
  return res;
};

const normalizeArray = (payload: any): AppNotification[] => {
  const data = unwrapApiData(payload);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(payload?.content)) return payload.content;

  return [];
};

const normalizePage = (payload: any, page = 0, size = 20): NotificationPageResponse => {
  const root = payload || {};
  const data = unwrapApiData(root);
  const content = normalizeArray(root);
  const meta = root?.meta || data?.meta || root?.pageable || {};

  return {
    content,
    page: meta.page ?? meta.page_number ?? root.page ?? data?.page ?? page,
    size: meta.size ?? meta.page_size ?? root.size ?? data?.size ?? size,
    totalElements:
      meta.total_elements ??
      meta.totalElements ??
      root.totalElements ??
      data?.totalElements ??
      content.length,
    totalPages:
      meta.total_pages ??
      meta.totalPages ??
      root.totalPages ??
      data?.totalPages ??
      1,
    hasNext:
      meta.has_next ??
      meta.hasNext ??
      false,
  };
};

export const notificationApi = {
  getNotifications: async (
    params?: {
      page?: number;
      size?: number;
      unreadOnly?: boolean;
    }
  ): Promise<NotificationPageResponse> => {
    const page = params?.page ?? 0;
    const size = params?.size ?? 20;

    const res: any = await axiosClient.get('/notifications', { params });
    return normalizePage(res, page, size);
  },

  getUnreadCount: async (): Promise<number> => {
    const res: any = await axiosClient.get('/notifications/unread-count');
    const data = unwrapApiData(res);
    return Number(data ?? 0);
  },

  markAsRead: async (id: string): Promise<AppNotification | null> => {
    const res: any = await axiosClient.patch(`/notifications/${id}/read`);
    return unwrapApiData(res) || null;
  },

  markAllAsRead: async (): Promise<void> => {
    await axiosClient.patch('/notifications/read-all');
  },

  longPolling: async (): Promise<AppNotification[]> => {
    const res: any = await axiosClient.get('/notifications/long-polling');
    return normalizeArray(res);
  },

  requestDeadlineExtension: async (
    taskId: string,
    payload: {
      requestedDueDate?: string;
      requested_due_date?: string;
      newDueDate?: string;
      new_due_date?: string;
      reason: string;
    }
  ) => {
    const finalPayload = {
      requested_due_date:
        payload.requested_due_date ||
        payload.requestedDueDate ||
        payload.new_due_date ||
        payload.newDueDate,
      reason: payload.reason,
    };

    const res: any = await axiosClient.post(`/tasks/${taskId}/deadline/extensions`, finalPayload);
    return unwrapApiData(res);
  },

  approveDeadlineExtension: async (taskId: string) => {
    const res: any = await axiosClient.post(`/tasks/${taskId}/deadline/extensions/approve`);
    return unwrapApiData(res);
  },

  rejectDeadlineExtension: async (
    taskId: string,
    payload?: {
      reason?: string;
      rejectReason?: string;
      reject_reason?: string;
    }
  ) => {
    const res: any = await axiosClient.post(`/tasks/${taskId}/deadline/extensions/reject`, {
      reject_reason: payload?.reject_reason || payload?.rejectReason || payload?.reason || '',
    });

    return unwrapApiData(res);
  },
};