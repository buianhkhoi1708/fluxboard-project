import { create } from 'zustand';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { notificationApi } from '../api/notificationApi';
import {
  AppNotification,
  NotificationMetadata,
  NotificationStore,
} from '../types/notificationTypes';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const WEBSOCKET_URL = `${API_BASE_URL}/ws-fluxboard`;

let shouldLongPoll = false;

const read = (obj: any, camelKey: string, snakeKey?: string) => {
  if (!obj) return undefined;
  return obj[camelKey] ?? (snakeKey ? obj[snakeKey] : undefined);
};

const getToken = () => {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('accessToken') ||
    ''
  );
};

const isJwtExpired = (token: string | null) => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return !payload?.exp || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

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
      is_read: false,
      created_at: new Date().toISOString(),
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
    .replaceAll('Task', 'Công việc')
    .replaceAll('task', 'công việc')
    .replaceAll('was moved to', 'đã được chuyển sang')
    .replaceAll('moved to', 'được chuyển sang')
    .replaceAll('You moved', 'Bạn đã chuyển')
    .replaceAll('created successfully', 'đã được tạo thành công')
    .replaceAll('assigned to you', 'được giao cho bạn');
};

const extractNavigationFromActionUrl = (actionUrl?: string | null) => {
  if (!actionUrl) return { boardId: undefined, taskId: undefined };

  const boardMatch = actionUrl.match(/\/board\/([^?/#]+)/);
  const taskMatch = actionUrl.match(/[?&]taskId=([^&#]+)/);

  return {
    boardId: boardMatch?.[1],
    taskId: taskMatch?.[1],
  };
};

const getRawDedupeKey = (raw: any) => {
  return (
    raw?.dedupeKey ||
    raw?.dedupe_key ||
    raw?.metadata?.dedupeKey ||
    raw?.metadata?.dedupe_key ||
    ''
  );
};

const normalizeMetadata = (raw: any): NotificationMetadata => {
  const rawMetadata = raw?.metadata || {};
  const rawActionUrl =
    rawMetadata.actionUrl ||
    rawMetadata.action_url ||
    raw?.actionUrl ||
    raw?.action_url ||
    undefined;

  const parsed = extractNavigationFromActionUrl(rawActionUrl);

  const taskId =
    rawMetadata.taskId ||
    rawMetadata.task_id ||
    raw?.taskId ||
    raw?.task_id ||
    parsed.taskId ||
    raw?.referenceId ||
    raw?.reference_id ||
    undefined;

  const boardId =
    rawMetadata.boardId ||
    rawMetadata.board_id ||
    raw?.boardId ||
    raw?.board_id ||
    parsed.boardId ||
    undefined;

  const projectId =
    rawMetadata.projectId ||
    rawMetadata.project_id ||
    raw?.projectId ||
    raw?.project_id ||
    undefined;

  const dedupeKey = getRawDedupeKey(raw);

  return {
    ...rawMetadata,
    taskId,
    task_id: taskId,
    boardId,
    board_id: boardId,
    projectId,
    project_id: projectId,
    actionUrl: rawActionUrl,
    action_url: rawActionUrl,
    dedupeKey,
    dedupe_key: dedupeKey,
  };
};

const normalizeNotification = (input: any): AppNotification | null => {
  const raw = parseMaybeJson(input);
  if (!raw) return null;

  const metadata = normalizeMetadata(raw);
  const id = String(raw.id || raw._id || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const type = String(raw.type || raw.notification_type || 'SYSTEM');
  const isRead = Boolean(read(raw, 'isRead', 'is_read'));
  const actionUrl =
    read(raw, 'actionUrl', 'action_url') ||
    metadata.actionUrl ||
    metadata.action_url ||
    null;

  const notification: AppNotification = {
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
    actionUrl,
    action_url: actionUrl,
    metadata,
    isRead,
    is_read: isRead,
    status: raw.status || null,
    timestamp: raw.timestamp || raw.createdAt || raw.created_at || Date.now(),
    createdAt: raw.createdAt || raw.created_at || raw.timestamp || new Date().toISOString(),
    created_at: raw.createdAt || raw.created_at || raw.timestamp || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.updated_at || null,
    updated_at: raw.updatedAt || raw.updated_at || null,
    sendAt: raw.sendAt || raw.send_at || null,
    send_at: raw.sendAt || raw.send_at || null,
  };

  (notification as any).dedupeKey = getRawDedupeKey(raw);
  (notification as any).dedupe_key = getRawDedupeKey(raw);

  return notification;
};

const getNotificationTime = (notification: AppNotification) => {
  return new Date(String(notification.createdAt || notification.created_at || notification.timestamp || 0)).getTime();
};

const getSemanticKey = (notification: AppNotification | null | undefined) => {
  if (!notification) return '';

  const metadata: any = notification.metadata || {};
  const dedupeKey =
    (notification as any).dedupeKey ||
    (notification as any).dedupe_key ||
    metadata.dedupeKey ||
    metadata.dedupe_key;

  if (dedupeKey) return String(dedupeKey);

  const type = String(notification.type || '').toUpperCase();
  const referenceId = String(notification.referenceId || notification.reference_id || '');
  const taskId = String(metadata.taskId || metadata.task_id || referenceId || '');
  const requesterId = String(metadata.requesterId || metadata.requester_id || '');
  const senderId = String(notification.senderId || notification.sender_id || '');
  const recipientId = String(notification.recipientId || notification.recipient_id || '');
  const dueDate = String(
    metadata.requestedDueDate ||
      metadata.requested_due_date ||
      metadata.approvedDueDate ||
      metadata.approved_due_date ||
      metadata.currentDueDate ||
      metadata.current_due_date ||
      metadata.dueDate ||
      metadata.due_date ||
      ''
  );

  if (type.startsWith('EXTENSION_') || type.includes('DEADLINE') || type.includes('OVERDUE')) {
    return [recipientId, type, taskId, senderId, requesterId, dueDate].join('|');
  }

  return [recipientId, type, taskId, notification.id].join('|');
};

const dedupeAndSort = (notifications: AppNotification[]) => {
  const map = new Map<string, AppNotification>();

  notifications.forEach((notification) => {
    const key = getSemanticKey(notification) || notification.id;
    const current = map.get(key);

    if (!current) {
      map.set(key, notification);
      return;
    }

    const currentTime = getNotificationTime(current);
    const nextTime = getNotificationTime(notification);
    const latest = nextTime >= currentTime ? notification : current;
    const earliestRead = Boolean(current.isRead || current.is_read || notification.isRead || notification.is_read);

    map.set(key, {
      ...current,
      ...latest,
      metadata: {
        ...(current.metadata || {}),
        ...(latest.metadata || {}),
      },
      isRead: earliestRead,
      is_read: earliestRead,
    });
  });

  return Array.from(map.values()).sort((a, b) => getNotificationTime(b) - getNotificationTime(a));
};

const countUnread = (notifications: AppNotification[]) => notifications.filter((n) => !n.isRead).length;

const isExtensionReviewNotification = (notification: AppNotification) => {
  const type = String(notification.type || '').toUpperCase();
  return ['EXTENSION_REQUEST', 'EXTENSION_REQUESTED'].includes(type);
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  stompClient: null,
  isConnected: false,
  isLongPolling: false,
  toastNotifications: [],

  hydrateNotifications: (notifications) => {
    const normalized = notifications.map(normalizeNotification).filter(Boolean) as AppNotification[];

    set((state) => {
      const merged = dedupeAndSort([...normalized, ...state.notifications]);

      return {
        notifications: merged,
        unreadCount: countUnread(merged),
      };
    });
  },

  setUnreadCount: (count) => set({ unreadCount: Math.max(0, Number(count) || 0) }),

  loadInitialNotifications: async () => {
    const token = getToken();
    if (isJwtExpired(token)) return;

    try {
      const page = await notificationApi.getNotifications({ page: 0, size: 50 });
      const normalized = page.content.map(normalizeNotification).filter(Boolean) as AppNotification[];
      const merged = dedupeAndSort(normalized);

      set({
        notifications: merged,
        unreadCount: countUnread(merged),
      });
    } catch (error: any) {
      if (error?.response?.status !== 401) console.error('Tải thông báo thất bại:', error);
    }
  },

  connectWebSocket: (userId: string) => {
    if (!userId) return;

    const token = getToken();
    if (isJwtExpired(token)) return;

    const currentClient = get().stompClient;
    if (currentClient?.active || currentClient?.connected) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${WEBSOCKET_URL}?access_token=${encodeURIComponent(token)}`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      debug: () => undefined,
      onConnect: () => {
        set({ isConnected: true, stompClient: client });

        client.subscribe('/user/queue/notifications', (message) => {
          if (!message.body) return;
          get().addNotification(message.body, { showToast: true });
        });

        client.subscribe(`/topic/notifications/${userId}`, (message) => {
          if (!message.body) return;
          get().addNotification(message.body, { showToast: true });
        });

        client.subscribe(`/topic/notifications/${userId}/latest`, (message) => {
          if (!message.body) return;
          get().addNotification(message.body, { showToast: true });
        });
      },
      onDisconnect: () => set({ isConnected: false }),
      onStompError: (frame) => {
        console.error('Lỗi STOMP notification:', frame.headers?.message || frame.body);
      },
      onWebSocketClose: () => set({ isConnected: false }),
    });

    client.activate();
    set({ stompClient: client });
  },

  disconnectWebSocket: () => {
    const client = get().stompClient;

    if (client) {
      client.deactivate();
    }

    set({ stompClient: null, isConnected: false });
  },

  startLongPolling: () => {
    const token = getToken();
    if (get().isLongPolling || isJwtExpired(token)) return;

    shouldLongPoll = true;
    set({ isLongPolling: true });

    const loop = async () => {
      while (shouldLongPoll) {
        const currentToken = getToken();

        if (isJwtExpired(currentToken)) {
          shouldLongPoll = false;
          set({ isLongPolling: false });
          break;
        }

        try {
          const newNotifications = await notificationApi.longPolling();

          if (Array.isArray(newNotifications) && newNotifications.length > 0) {
            newNotifications.forEach((notification) => {
              get().addNotification(notification, { showToast: true });
            });
          }
        } catch (error: any) {
          if (error?.response?.status === 401) {
            shouldLongPoll = false;
            set({ isLongPolling: false });
            break;
          }

          await sleep(3000);
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

    let created = false;

    set((state) => {
      const key = getSemanticKey(notification);
      const exists = state.notifications.some((item) => getSemanticKey(item) === key || item.id === notification.id);
      created = !exists;

      const nextNotifications = dedupeAndSort([notification, ...state.notifications]);
      const shouldToast = options.showToast !== false && created && !notification.isRead;

      return {
        notifications: nextNotifications,
        unreadCount: countUnread(nextNotifications),
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

    const target = get().notifications.find((notification) => notification.id === id);
    const targetKey = getSemanticKey(target);

    set((state) => {
      const nextNotifications = state.notifications.map((notification) => {
        const same = notification.id === id || (targetKey && getSemanticKey(notification) === targetKey);

        return same
          ? { ...notification, isRead: true, is_read: true }
          : notification;
      });

      return {
        notifications: nextNotifications,
        unreadCount: countUnread(nextNotifications),
      };
    });

    try {
      const updated = await notificationApi.markAsRead(id);

      if (updated) {
        const normalized = normalizeNotification(updated);
        if (normalized) {
          const updatedKey = getSemanticKey(normalized);

          set((state) => {
            const nextNotifications = state.notifications.map((notification) => {
              const same = notification.id === normalized.id || (updatedKey && getSemanticKey(notification) === updatedKey);

              return same
                ? { ...notification, ...normalized, metadata: { ...(notification.metadata || {}), ...(normalized.metadata || {}) }, isRead: true, is_read: true }
                : notification;
            });

            return {
              notifications: dedupeAndSort(nextNotifications),
              unreadCount: countUnread(nextNotifications),
            };
          });
        }
      }
    } catch (error: any) {
      if (error?.response?.status !== 401) console.error('Đánh dấu đã đọc thất bại:', error);
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
      set((state) => ({
        notifications: state.notifications.map((notification) => ({
          ...notification,
          isRead: true,
          is_read: true,
        })),
        unreadCount: 0,
      }));
    } catch (error: any) {
      if (error?.response?.status !== 401) console.error('Đánh dấu tất cả đã đọc thất bại:', error);
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

  const boardId = metadata.boardId || metadata.board_id || parsed.boardId || undefined;

  return {
    taskId,
    boardId,
    actionUrl: rawActionUrl,
  };
};

export const getNotificationTargetUrl = (notification: AppNotification) => {
  if (isExtensionReviewNotification(notification)) {
    return `/notifications?notificationId=${encodeURIComponent(notification.id)}&review=1`;
  }

  const { taskId, boardId, actionUrl } = getNotificationTaskNavigation(notification);

  if (actionUrl && actionUrl.includes('/board/')) {
    return actionUrl;
  }

  if (boardId && taskId) {
    return `/board/${boardId}?taskId=${taskId}`;
  }

  return `/notifications?notificationId=${encodeURIComponent(notification.id)}`;
};

export const canOpenNotificationTask = (notification: AppNotification | null | undefined) => {
  if (!notification) return false;

  const { taskId, boardId, actionUrl } = getNotificationTaskNavigation(notification);
  return Boolean((actionUrl && actionUrl.includes('/board/')) || (boardId && taskId));
};