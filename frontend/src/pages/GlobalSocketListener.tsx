import { useEffect } from 'react';
import { Bell, Clock, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { useRealtimeEvent } from '../hooks/useRealtimeEvent';
import { WORKSPACE_KEYS } from '../features/workspaces/hooks/useWorkspaceQueries';
import { SETTING_KEYS } from '../features/settings/hooks/useSettingQueries';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import {
  getNotificationTargetUrl,
  useNotificationStore,
} from '../features/notification/stores/useNotificationStore';

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

const getToastIcon = (type?: string) => {
  const upper = String(type || '').toUpperCase();

  if (upper.includes('OVERDUE') || upper.includes('REJECT')) {
    return <AlertTriangle size={18} className="text-rose-500" />;
  }

  if (upper.includes('APPROVED') || upper.includes('COMPLETED')) {
    return <CheckCircle2 size={18} className="text-emerald-500" />;
  }

  if (upper.includes('EXTENSION') || upper.includes('DEADLINE')) {
    return <Clock size={18} className="text-amber-500" />;
  }

  return <Bell size={18} className="text-indigo-500" />;
};

const navigateWithoutRouter = (url: string) => {
  window.location.assign(url || '/notifications');
};

const NotificationToastViewport = () => {
  const toastNotifications = useNotificationStore((state) => state.toastNotifications);
  const removeToast = useNotificationStore((state) => state.removeToast);
  const markAsRead = useNotificationStore((state) => state.markAsRead);

  useEffect(() => {
    if (toastNotifications.length === 0) return;

    const timers = toastNotifications.map((toast) =>
      window.setTimeout(() => removeToast(toast.id), 5500)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toastNotifications, removeToast]);

  if (toastNotifications.length === 0) return null;

  return (
    <div className="fixed right-6 top-[76px] z-[9999] flex flex-col gap-3 pointer-events-none">
      {toastNotifications.map((toast) => {
        const notification = toast.notification;

        return (
          <div
            key={toast.id}
            role="button"
            tabIndex={0}
            onClick={async () => {
              await markAsRead(notification.id);
              removeToast(toast.id);
              navigateWithoutRouter(getNotificationTargetUrl(notification));
            }}
            onKeyDown={async (event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              await markAsRead(notification.id);
              removeToast(toast.id);
              navigateWithoutRouter(getNotificationTargetUrl(notification));
            }}
            className="pointer-events-auto w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white/95 shadow-2xl shadow-slate-900/10 backdrop-blur-md overflow-hidden animate-in slide-in-from-top-4 fade-in duration-300 cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <div className="w-full text-left p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  {getToastIcon(notification.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-extrabold text-slate-800 line-clamp-1">
                      {notification.title || 'Thông báo mới'}
                    </p>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeToast(toast.id);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Đóng thông báo"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {notification.message}
                  </p>

                  <p className="mt-2 text-[11px] font-bold text-indigo-600">
                    Bấm để mở nội dung liên quan
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const GlobalSocketListener = () => {
  const queryClient = useQueryClient();

  const user = useAuthStore((state: any) => state.user);
  const tokenFromStore = useAuthStore((state: any) => state.token);

  const connectWebSocket = useNotificationStore((state) => state.connectWebSocket);
  const disconnectWebSocket = useNotificationStore((state) => state.disconnectWebSocket);
  const startLongPolling = useNotificationStore((state) => state.startLongPolling);
  const stopLongPolling = useNotificationStore((state) => state.stopLongPolling);
  const loadInitialNotifications = useNotificationStore((state) => state.loadInitialNotifications);

  useEffect(() => {
    const stopRealtime = () => {
      stopLongPolling();
      disconnectWebSocket();
    };

    window.addEventListener('auth:unauthorized', stopRealtime);
    window.addEventListener('auth:logout', stopRealtime);

    return () => {
      window.removeEventListener('auth:unauthorized', stopRealtime);
      window.removeEventListener('auth:logout', stopRealtime);
    };
  }, [disconnectWebSocket, stopLongPolling]);

  useEffect(() => {
    const userId = user?.id ? String(user.id) : user?.user_id ? String(user.user_id) : null;
    const token = tokenFromStore || getToken();

    if (!userId || isJwtExpired(token)) {
      stopLongPolling();
      disconnectWebSocket();
      return;
    }

    loadInitialNotifications();
    connectWebSocket(userId);
    startLongPolling();

    return () => {
      stopLongPolling();
      disconnectWebSocket();
    };
  }, [
    user?.id,
    user?.user_id,
    tokenFromStore,
    connectWebSocket,
    disconnectWebSocket,
    startLongPolling,
    stopLongPolling,
    loadInitialNotifications,
  ]);

  useRealtimeEvent('/user/queue/notifications', () => {
    queryClient.invalidateQueries({ queryKey: SETTING_KEYS.notifications });
  });

  useRealtimeEvent('/topic/workspaces/updates', () => {
    queryClient.invalidateQueries({ queryKey: WORKSPACE_KEYS.all });
  });

  useRealtimeEvent('/topic/system', (message) => {
    const { action } = message || {};

    switch (action) {
      case 'PROJECT_DELETED':
        queryClient.invalidateQueries({ queryKey: WORKSPACE_KEYS.all });
        break;

      case 'TASK_ASSIGNED':
      case 'TASK_COMMENT_ADDED':
      case 'TASK_COMMENT_RESOLVED':
      case 'TASK_UPDATED':
      case 'TASK_UPDATE':
      case 'TASK_MOVE':
      case 'TASK_COMPLETED':
      case 'EXTENSION_REQUESTED':
      case 'EXTENSION_APPROVED':
      case 'EXTENSION_REJECTED':
        queryClient.invalidateQueries({ queryKey: ['tasks', 'my-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
        break;

      default:
        break;
    }
  });

  return <NotificationToastViewport />;
};