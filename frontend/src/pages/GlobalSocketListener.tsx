import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const NotificationToastViewport = () => {
  const navigate = useNavigate();
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
    <div className="fixed left-5 bottom-5 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toastNotifications.map((toast) => {
        const notification = toast.notification;

        return (
          <div
            key={toast.id}
            className="pointer-events-auto w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white/95 shadow-2xl shadow-slate-900/10 backdrop-blur-md overflow-hidden animate-in slide-in-from-left-5 fade-in duration-300"
          >
            <button
              type="button"
              onClick={async () => {
                await markAsRead(notification.id);
                removeToast(toast.id);
                navigate(getNotificationTargetUrl(notification));
              }}
              className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
            >
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
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {notification.message}
                  </p>

                  <p className="mt-2 text-[11px] font-bold text-indigo-600">
                    Bấm để xem chi tiết
                  </p>
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const GlobalSocketListener = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const connectWebSocket = useNotificationStore((state) => state.connectWebSocket);
  const disconnectWebSocket = useNotificationStore((state) => state.disconnectWebSocket);
  const startLongPolling = useNotificationStore((state) => state.startLongPolling);
  const stopLongPolling = useNotificationStore((state) => state.stopLongPolling);
  const loadInitialNotifications = useNotificationStore((state) => state.loadInitialNotifications);

  useEffect(() => {
    const userId = user?.id ? String(user.id) : null;

    if (!userId) {
      disconnectWebSocket();
      stopLongPolling();
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
    connectWebSocket,
    disconnectWebSocket,
    startLongPolling,
    stopLongPolling,
    loadInitialNotifications,
  ]);

  useRealtimeEvent('/user/queue/notifications', (message) => {
    console.log('🔔 [Global] Có thông báo mới:', message);
    queryClient.invalidateQueries({ queryKey: SETTING_KEYS.notifications });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  });

  useRealtimeEvent('/topic/workspaces/updates', (message) => {
    console.log('🏢 [Global] Có cập nhật ở Workspace:', message);
    queryClient.invalidateQueries({ queryKey: WORKSPACE_KEYS.all });
  });

  useRealtimeEvent('/topic/system', (message) => {
    const { action } = message;

    switch (action) {
      case 'PROJECT_DELETED':
        queryClient.invalidateQueries({ queryKey: WORKSPACE_KEYS.all });
        break;

      case 'TASK_ASSIGNED':
        queryClient.invalidateQueries({ queryKey: ['tasks', 'my-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        break;

      default:
        break;
    }
  });

  return <NotificationToastViewport />;
};