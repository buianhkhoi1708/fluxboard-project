import { create } from 'zustand';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { notificationApi } from '../api/notificationApi';
import {
  AppNotification,
  NotificationStore,
  NotificationMetadata,
} from '../types/notificationTypes';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const WEBSOCKET_URL = `${API_BASE_URL}/ws-fluxboard`;

let shouldLongPoll = false;

const read = (obj: any, camelKey: string, snakeKey?: string) => {
  if (!obj) return undefined;
  return obj[camelKey] ?? (snakeKey ? obj[snakeKey] : undefined);
};

const parseMaybeJson = (value: any) => {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: 'Thông báo mới',
      message: value,
      type: 'SYSTEM',
      metadata: {},
      isRead: false,
      createdAt: new Date().toISOString(),
    };
  }
};

const translateTitle = (type?: string, title?: string) => {
  const upper = String(type || '').toUpperCase();

  const map: Record<string, string> = {
    TASK_CREATE: 'Công việc mới',
    TASK_CREATE_BY_YOU: 'Bạn đã tạo công việc',
    TASK_ASSIGNED: 'Bạn được giao công việc mới',
    TASK_UPDATE: 'Công việc đã được cập nhật',
    TASK_UPDATE_BY_YOU: 'Bạn đã cập nhật công việc',
    TASK_MOVE: 'Công việc đã được di chuyển',
    TASK_MOVE_BY_YOU: 'Bạn đã di chuyển công việc',
    TASK_MOVED: 'Công việc đã được di chuyển',
    TASK_COMPLETED: 'Công việc đã hoàn thành',
    TASK_COMPLETED_BY_YOU: 'Bạn đã hoàn thành công việc',
    TASK_DEADLINE_REMINDER: 'Công việc sắp đến hạn',
    DEADLINE_REMINDER: 'Công việc sắp đến hạn',
    DEADLINE_APPROACHING: 'Công việc sắp đến hạn',
    TASK_OVERDUE: 'Công việc đã quá hạn',
    DEADLINE_UPDATED: 'Deadline đã được cập nhật',
    EXTENSION_REQUEST: 'Yêu cầu dời deadline',
    EXTENSION_REQUESTED: 'Yêu cầu dời deadline',
    EXTENSION_SUBMITTED: 'Đã gửi yêu cầu dời deadline',
    EXTENSION_APPROVED: 'Yêu cầu dời deadline đã được duyệt',
    EXTENSION_APPROVED_BY_YOU: 'Bạn đã duyệt yêu cầu dời deadline',
    EXTENSION_REJECTED: 'Yêu cầu dời deadline bị từ chối',
    EXTENSION_REJECTED_BY_YOU: 'Bạn đã từ chối yêu cầu dời deadline',
  };

  return map[upper] || title || 'Thông báo mới';
};

const translateMessage = (message?: string) => {
  if (!message) return '';

  return message
    .replaceAll('Task Created Successfully', 'Bạn đã tạo công việc')
    .replaceAll('Task Updated by You', 'Bạn đã cập nhật công việc')
    .replaceAll('Task Moved by You', 'Bạn đã di chuyển công việc')
    .replaceAll('Task Moved', 'Công việc đã được di chuyển')
    .replaceAll('Task Updated', 'Công việc đã được cập nhật')
    .replaceAll('Task Overdue Notice', 'Công việc đã quá hạn')
    .replaceAll('Task', 'Công việc')
    .replaceAll('task', 'công việc')
    .replaceAll('was moved to', 'đã được chuyển sang')
    .replaceAll('You moved', 'Bạn đã chuyển')
    .replaceAll('has been updated', 'đã được cập nhật');
};

const extractNavigationFromActionUrl = (actionUrl?: string | null) => {
  if (!actionUrl) return { boardId: undefined as string | undefined, taskId: undefined as string | undefined };

  try {
    const url = actionUrl.startsWith('http')
      ? new URL(actionUrl)
      : new URL(actionUrl, window.location.origin);

    const boardMatch = url.pathname.match(/\/board\/([^/?#]+)/);
    const boardId = boardMatch?.[1];
    const taskId = url.searchParams.get('taskId') || undefined;

    return { boardId, taskId };
  } catch {
    const boardMatch = actionUrl.match(/\/board\/([^/?#]+)/);
    const taskMatch = actionUrl.match(/[?&]taskId=([^&#]+)/);

    return {
      boardId: boardMatch?.[1],
      taskId: taskMatch?.[1],
    };
  }
};

const normalizeMetadata = (raw: any): NotificationMetadata => {
  const metadata = raw?.metadata || {};
  const rawActionUrl = metadata.actionUrl || metadata.action_url || raw?.actionUrl || raw?.action_url;
  const parsed = extractNavigationFromActionUrl(rawActionUrl);

  const taskId =
    metadata.taskId ||
    metadata.task_id ||
    raw?.taskId ||
    raw?.task_id ||
    parsed.taskId ||
    raw?.referenceId ||
    raw?.reference_id;

  const boardId =
    metadata.boardId ||
    metadata.board_id ||
    raw?.boardId ||
    raw?.board_id ||
    parsed.boardId;

  return {
    ...metadata,
    taskId,
    task_id: taskId,
    boardId,
    board_id: boardId,
    actionUrl: rawActionUrl,
    action_url: rawActionUrl,
  };
};

const normalizeNotification = (input: any): AppNotification | null => {
  const raw = parseMaybeJson(input);
  if (!raw) return null;

  const metadata = normalizeMetadata(raw);
  const id = String(raw.id || raw._id || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const type = String(raw.type || 'SYSTEM');

  return {
    id,
    recipientId: read(raw, 'recipientId', 'recipient_id'),
    recipient_id: read(raw, 'recipientId', 'recipient_id'),
    senderId: read(raw, 'senderId', 'sender_id') || null,
    sender_id: read(raw, 'senderId', 'sender_id') || null,
    type,
    title: translateTitle(type, raw.title),
    message: translateMessage(raw.message),
    referenceId: read(raw, 'referenceId', 'reference_id') || null,
    reference_id: read(raw, 'referenceId', 'reference_id') || null,
    referenceType: read(raw, 'referenceType', 'reference_type') || null,
    reference_type: read(raw, 'referenceType', 'reference_type') || null,
    actionUrl: read(raw, 'actionUrl', 'action_url') || metadata.actionUrl || null,
    action_url: read(raw, 'actionUrl', 'action_url') || metadata.action_url || null,
    metadata,
    isRead: Boolean(read(raw, 'isRead', 'is_read')),
    is_read: Boolean(read(raw, 'isRead', 'is_read')),
    status: raw.status || null,
    timestamp: raw.timestamp || raw.createdAt || raw.created_at || Date.now(),
    createdAt: raw.createdAt || raw.created_at || raw.timestamp || new Date().toISOString(),
    created_at: raw.createdAt || raw.created_at || raw.timestamp || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.updated_at || null,
    updated_at: raw.updatedAt || raw.updated_at || null,
    sendAt: raw.sendAt || raw.send_at || null,
    send_at: raw.sendAt || raw.send_at || null,
  };
};

const dedupeAndSort = (notifications: AppNotification[]) => {
  const map = new Map<string, AppNotification>();

  notifications.forEach((notification) => {
    map.set(notification.id, {
      ...map.get(notification.id),
      ...notification,
    });
  });

  return Array.from(map.values()).sort((a, b) => {
    const aTime = new Date(String(a.createdAt || a.created_at || a.timestamp || 0)).getTime();
    const bTime = new Date(String(b.createdAt || b.created_at || b.timestamp || 0)).getTime();
    return bTime - aTime;
  });
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  stompClient: null,
  isConnected: false,
  isLongPolling: false,
  toastNotifications: [],

  hydrateNotifications: (notifications) => {
    const normalized = notifications
      .map(normalizeNotification)
      .filter(Boolean) as AppNotification[];

    set((state) => {
      const merged = dedupeAndSort([...normalized, ...state.notifications]);
      return {
        notifications: merged,
        unreadCount: merged.filter((n) => !n.isRead).length,
      };
    });
  },

  setUnreadCount: (count) => set({ unreadCount: Math.max(0, Number(count) || 0) }),

  loadInitialNotifications: async () => {
    try {
      const [page, unreadCount] = await Promise.all([
        notificationApi.getNotifications({ page: 0, size: 20 }),
        notificationApi.getUnreadCount(),
      ]);

      get().hydrateNotifications(page.content);
      set({ unreadCount });
    } catch (error) {
      console.error('Tải thông báo thất bại:', error);
    }
  },

  connectWebSocket: (userId: string) => {
    if (!userId) return;

    const currentClient = get().stompClient;
    if (currentClient?.active || currentClient?.connected) return;

    const token = localStorage.getItem('token');

    const client = new Client({
      webSocketFactory: () => new SockJS(WEBSOCKET_URL),
      reconnectDelay: 5000,
      debug: () => {},
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        set({ isConnected: true });

        const handleMessage = (message: any) => {
          if (!message?.body) return;
          get().addNotification(message.body, { showToast: true });
        };

        client.subscribe(`/topic/notifications/${userId}`, handleMessage);
        client.subscribe(`/topic/notifications/${userId}/latest`, handleMessage);
      },
      onDisconnect: () => set({ isConnected: false }),
      onWebSocketClose: () => set({ isConnected: false }),
      onStompError: (frame) => {
        console.error('Lỗi STOMP notification:', frame.headers?.message || frame);
      },
    });

    client.activate();
    set({ stompClient: client });
  },

  disconnectWebSocket: () => {
    const client = get().stompClient;
    if (client) client.deactivate();

    set({
      stompClient: null,
      isConnected: false,
    });
  },

  startLongPolling: () => {
    if (get().isLongPolling) return;

    shouldLongPoll = true;
    set({ isLongPolling: true });

    const loop = async () => {
      while (shouldLongPoll) {
        try {
          const notifications = await notificationApi.longPolling();

          if (notifications.length > 0) {
            notifications.forEach((notification) => {
              get().addNotification(notification, { showToast: true });
            });
          }
        } catch (error: any) {
          if (shouldLongPoll) {
            console.warn('Long-polling thông báo thất bại:', error?.message || error);
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
        }
      }

      set({ isLongPolling: false });
    };

    loop();
  },

  stopLongPolling: () => {
    shouldLongPoll = false;
    set({ isLongPolling: false });
  },

  addNotification: (rawNotification, options = { showToast: true }) => {
    const notification = normalizeNotification(rawNotification);
    if (!notification) return null;

    set((state) => {
      const exists = state.notifications.some((item) => item.id === notification.id);
      const nextNotifications = dedupeAndSort([notification, ...state.notifications]);
      const shouldToast = options.showToast !== false && !exists;

      return {
        notifications: nextNotifications,
        unreadCount: nextNotifications.filter((n) => !n.isRead).length,
        toastNotifications: shouldToast
          ? [
              {
                id: `${notification.id}-${Date.now()}`,
                notification,
                createdAt: Date.now(),
              },
              ...state.toastNotifications,
            ].slice(0, 4)
          : state.toastNotifications,
      };
    });

    return notification;
  },

  removeToast: (toastId) => {
    set((state) => ({
      toastNotifications: state.toastNotifications.filter((toast) => toast.id !== toastId),
    }));
  },

  markAsRead: async (id: string) => {
    if (!id) return;

    set((state) => {
      const nextNotifications = state.notifications.map((notification) =>
        notification.id === id
          ? { ...notification, isRead: true, is_read: true }
          : notification
      );

      return {
        notifications: nextNotifications,
        unreadCount: nextNotifications.filter((n) => !n.isRead).length,
      };
    });

    try {
      const updated = await notificationApi.markAsRead(id);
      if (updated) get().addNotification(updated, { showToast: false });
    } catch (error) {
      console.error('Đánh dấu đã đọc thất bại:', error);
      get().loadInitialNotifications();
    }
  },

  markAllAsRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        isRead: true,
        is_read: true,
      })),
      unreadCount: 0,
    }));

    try {
      await notificationApi.markAllAsRead();
    } catch (error) {
      console.error('Đánh dấu tất cả đã đọc thất bại:', error);
      get().loadInitialNotifications();
    }
  },
}));

export const getNotificationTaskNavigation = (notification: AppNotification) => {
  const metadata = notification.metadata || {};
  const rawActionUrl =
    notification.actionUrl ||
    notification.action_url ||
    metadata.actionUrl ||
    metadata.action_url ||
    undefined;

  const parsed = extractNavigationFromActionUrl(rawActionUrl);

  const taskId =
    metadata.taskId ||
    metadata.task_id ||
    parsed.taskId ||
    notification.referenceId ||
    notification.reference_id ||
    undefined;

  const boardId =
    metadata.boardId ||
    metadata.board_id ||
    parsed.boardId ||
    undefined;

  return {
    taskId,
    boardId,
    actionUrl: rawActionUrl,
  };
};

export const getNotificationTargetUrl = (notification: AppNotification) => {
  const { taskId, boardId, actionUrl } = getNotificationTaskNavigation(notification);

  if (actionUrl && actionUrl.includes('/board/')) {
    return actionUrl;
  }

  if (boardId && taskId) {
    return `/board/${boardId}?taskId=${taskId}`;
  }

  return '/notifications';
};

export const canOpenNotificationTask = (notification: AppNotification | null | undefined) => {
  if (!notification) return false;

  const { taskId, boardId, actionUrl } = getNotificationTaskNavigation(notification);
  return Boolean((actionUrl && actionUrl.includes('/board/')) || (boardId && taskId));
};