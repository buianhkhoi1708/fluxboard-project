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

const normalizeMetadata = (raw: any): NotificationMetadata => {
  const metadata = raw?.metadata || {};

  const taskId = metadata.taskId || metadata.task_id || raw?.taskId || raw?.task_id || raw?.referenceId || raw?.reference_id;
  const boardId = metadata.boardId || metadata.board_id || raw?.boardId || raw?.board_id;
  const actionUrl = metadata.actionUrl || metadata.action_url || raw?.actionUrl || raw?.action_url;

  return {
    ...metadata,
    taskId,
    task_id: taskId,
    boardId,
    board_id: boardId,
    actionUrl,
    action_url: actionUrl,
  };
};

const normalizeNotification = (input: any): AppNotification | null => {
  const raw = parseMaybeJson(input);
  if (!raw) return null;

  const metadata = normalizeMetadata(raw);
  const id = String(raw.id || raw._id || `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  return {
    id,
    recipientId: read(raw, 'recipientId', 'recipient_id'),
    recipient_id: read(raw, 'recipientId', 'recipient_id'),
    senderId: read(raw, 'senderId', 'sender_id') || null,
    sender_id: read(raw, 'senderId', 'sender_id') || null,
    type: String(raw.type || 'SYSTEM'),
    title: raw.title || 'Thông báo mới',
    message: raw.message || '',
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

const isExtensionRequest = (notification: AppNotification) => {
  return ['EXTENSION_REQUEST', 'EXTENSION_REQUESTED'].includes(String(notification.type));
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
      console.error('Load notifications failed:', error);
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
      onDisconnect: () => {
        set({ isConnected: false });
      },
      onStompError: (frame) => {
        console.error('STOMP notification error:', frame.headers?.message || frame);
      },
      onWebSocketClose: () => {
        set({ isConnected: false });
      },
    });

    client.activate();
    set({ stompClient: client });
  },

  disconnectWebSocket: () => {
    const client = get().stompClient;
    if (client) {
      client.deactivate();
    }

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
            console.warn('Notification long-polling failed:', error?.message || error);
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

    let isNew = false;

    set((state) => {
      const exists = state.notifications.some((item) => item.id === notification.id);
      isNew = !exists;

      const nextNotifications = dedupeAndSort([notification, ...state.notifications]);
      const shouldToast = options.showToast !== false && isNew;

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
      console.error('Mark notification as read failed:', error);
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
      console.error('Mark all notifications as read failed:', error);
      get().loadInitialNotifications();
    }
  },
}));

export const getNotificationTaskNavigation = (notification: AppNotification) => {
  const metadata = notification.metadata || {};
  const taskId =
    metadata.taskId ||
    metadata.task_id ||
    notification.referenceId ||
    notification.reference_id ||
    undefined;

  const boardId = metadata.boardId || metadata.board_id || undefined;
  const actionUrl =
    notification.actionUrl ||
    notification.action_url ||
    metadata.actionUrl ||
    metadata.action_url ||
    undefined;

  return { taskId, boardId, actionUrl };
};

export const getNotificationTargetUrl = (notification: AppNotification) => {
  const { taskId, boardId, actionUrl } = getNotificationTaskNavigation(notification);

  if (isExtensionRequest(notification)) {
    const params = new URLSearchParams();
    params.set('notificationId', notification.id);
    params.set('extensionRequest', '1');
    if (taskId) params.set('taskId', taskId);
    if (boardId) params.set('boardId', boardId);
    return `/notifications?${params.toString()}`;
  }

  if (actionUrl) return actionUrl;
  if (boardId && taskId) return `/board/${boardId}?taskId=${taskId}`;
  if (taskId) return `/notifications?notificationId=${notification.id}&taskId=${taskId}`;

  return '/notifications';
};