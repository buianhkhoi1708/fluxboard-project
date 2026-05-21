import React from 'react';
import {
  Bell,
  Check,
  Info,
  AlertTriangle,
  XCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';

import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

import { useNavigate } from 'react-router-dom';

import { useNotificationStore } from '../features/notification/stores/useNotificationStore';

const notificationStyles: Record<
  string,
  {
    icon: React.ReactNode;
    bg: string;
    border: string;
  }
> = {
  TASK_ASSIGNED: {
    icon: <Info size={18} className="text-blue-500" />,
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },

  TASK_MOVED: {
    icon: <Info size={18} className="text-indigo-500" />,
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
  },

  DEADLINE_APPROACHING: {
    icon: (
      <AlertTriangle
        size={18}
        className="text-orange-500"
      />
    ),
    bg: 'bg-orange-50',
    border: 'border-orange-100',
  },

  TASK_OVERDUE: {
    icon: (
      <XCircle size={18} className="text-rose-500" />
    ),
    bg: 'bg-rose-50',
    border: 'border-rose-100',
  },

  DEADLINE_UPDATED: {
    icon: <Clock size={18} className="text-sky-500" />,
    bg: 'bg-sky-50',
    border: 'border-sky-100',
  },

  EXTENSION_APPROVED: {
    icon: (
      <Check size={18} className="text-emerald-500" />
    ),
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },

  EXTENSION_REJECTED: {
    icon: (
      <XCircle size={18} className="text-red-500" />
    ),
    bg: 'bg-red-50',
    border: 'border-red-100',
  },

  EXTENSION_REQUESTED: {
    icon: <Clock size={18} className="text-amber-500" />,
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
};

const NotificationsPage = () => {
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  const handleNotificationClick = async (
    notif: any
  ) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }

    const boardId = notif.metadata?.boardId;
    const taskId = notif.metadata?.taskId;

    if (boardId && taskId) {
      navigate(
        `/boards/${boardId}/tasks/${taskId}`
      );
      return;
    }

    if (taskId) {
      navigate(`/tasks/${taskId}`);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto no-scrollbar bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">

          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-800">

              <div className="p-2 rounded-xl border border-indigo-100 bg-white/80 backdrop-blur-sm shadow-sm">
                <Bell
                  className="text-indigo-600"
                  size={24}
                />
              </div>

              Tất cả thông báo
            </h1>

            <p className="pl-12 text-sm font-medium text-slate-500">
              Bạn có{' '}
              <strong className="font-semibold text-indigo-600">
                {unreadCount}
              </strong>{' '}
              thông báo chưa đọc.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-100 hover:text-indigo-600 active:scale-95"
            >
              <CheckCircle2 size={18} />
              Đánh dấu đã đọc tất cả
            </button>
          )}
        </div>

        {/* CONTENT */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-lg backdrop-blur-sm">

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">

              <Bell
                size={48}
                className="mb-4 opacity-20"
              />

              <h3 className="text-lg font-bold text-slate-700">
                Trống trơn!
              </h3>

              <p className="text-sm">
                Bạn chưa có bất kỳ thông báo nào.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">

              {notifications.map((notif: any) => {
                const style =
                  notificationStyles[notif.type] ??
                  notificationStyles.TASK_ASSIGNED;

                return (
                  <div
                    key={notif.id}
                    onClick={() =>
                      handleNotificationClick(notif)
                    }
                    className={`
                      group
                      flex
                      cursor-pointer
                      gap-4
                      p-5
                      transition-all
                      duration-200
                      hover:bg-slate-50
                      hover:scale-[1.005]
                      ${
                        notif.isRead
                          ? 'opacity-70'
                          : 'bg-indigo-50/30'
                      }
                    `}
                  >

                    {/* ICON */}
                    <div
                      className={`
                        mt-1
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        border
                        ${style.bg}
                        ${style.border}
                      `}
                    >
                      {style.icon}
                    </div>

                    {/* BODY */}
                    <div className="flex-1">

                      <div className="flex items-start justify-between gap-4">

                        <div className="space-y-1">

                          {/* TITLE */}
                          <h3
                            className={`
                              text-sm
                              ${
                                notif.isRead
                                  ? 'font-semibold text-slate-700'
                                  : 'font-bold text-slate-900'
                              }
                            `}
                          >
                            {notif.title}
                          </h3>

                          {/* MESSAGE */}
                          <p
                            className={`
                              text-sm
                              leading-relaxed
                              ${
                                notif.isRead
                                  ? 'text-slate-500'
                                  : 'text-slate-700'
                              }
                            `}
                          >
                            {notif.message}
                          </p>
                        </div>

                        {/* UNREAD DOT */}
                        {!notif.isRead && (
                          <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200" />
                        )}
                      </div>

                      {/* FOOTER */}
                      <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-400">

                        <Clock size={12} />

                        <span>
                          {formatDistanceToNow(
                            new Date(notif.createdAt),
                            {
                              addSuffix: true,
                              locale: vi,
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;