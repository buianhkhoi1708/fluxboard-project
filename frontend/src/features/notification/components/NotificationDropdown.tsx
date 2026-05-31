import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Check,
  Info,
  AlertTriangle,
  XCircle,
  Clock,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

import {
  getNotificationTargetUrl,
  useNotificationStore,
} from '../stores/useNotificationStore';
import { AppNotification } from '../types/notificationTypes';

const readDate = (notification: AppNotification) => {
  return notification.createdAt || notification.created_at || notification.timestamp || Date.now();
};

const getNotificationStyle = (type?: string) => {
  const upper = String(type || '').toUpperCase();

  if (upper.includes('OVERDUE')) {
    return {
      icon: <XCircle size={16} className="text-rose-500" />,
      bg: 'bg-rose-50',
      border: 'border-rose-100',
    };
  }

  if (upper.includes('DEADLINE') || upper.includes('REMINDER')) {
    return {
      icon: <AlertTriangle size={16} className="text-orange-500" />,
      bg: 'bg-orange-50',
      border: 'border-orange-100',
    };
  }

  if (upper.includes('EXTENSION') && upper.includes('APPROVED')) {
    return {
      icon: <Check size={16} className="text-emerald-500" />,
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    };
  }

  if (upper.includes('EXTENSION') && upper.includes('REJECTED')) {
    return {
      icon: <XCircle size={16} className="text-red-500" />,
      bg: 'bg-red-50',
      border: 'border-red-100',
    };
  }

  if (upper.includes('EXTENSION')) {
    return {
      icon: <Clock size={16} className="text-amber-500" />,
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    };
  }

  if (upper.includes('MOVE') || upper.includes('UPDATE')) {
    return {
      icon: <Info size={16} className="text-indigo-500" />,
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
    };
  }

  if (upper.includes('COMPLETE')) {
    return {
      icon: <Check size={16} className="text-emerald-500" />,
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    };
  }

  return {
    icon: <Info size={16} className="text-blue-500" />,
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  };
};

const getTimeLabel = (notification: AppNotification) => {
  try {
    return formatDistanceToNow(new Date(readDate(notification)), {
      addSuffix: true,
      locale: vi,
    });
  } catch {
    return 'Vừa xong';
  }
};

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    loadInitialNotifications,
  } = useNotificationStore();

  useEffect(() => {
    loadInitialNotifications();
  }, [loadInitialNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    setIsOpen(false);
    navigate(getNotificationTargetUrl(notification));
  };

  const handleMarkAll = async (event: React.MouseEvent) => {
    event.stopPropagation();
    await markAllAsRead();
  };

  const latestNotifications = notifications.slice(0, 8);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors focus:outline-none"
      >
        <Bell size={22} strokeWidth={2} />

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 border-2 border-white rounded-full text-[10px] font-black text-white flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">
                Thông báo
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                {unreadCount > 0
                  ? `${unreadCount} thông báo chưa đọc`
                  : 'Không có thông báo chưa đọc'}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-indigo-50"
              >
                <CheckCheck size={14} />
                Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
            {latestNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Bell size={24} className="text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-600">
                  Chưa có thông báo
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Các thông báo mới sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : (
              latestNotifications.map((notification) => {
                const style = getNotificationStyle(notification.type);

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-b-0 transition-all hover:bg-slate-50 ${
                      !notification.isRead ? 'bg-indigo-50/30' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center border ${style.bg} ${style.border}`}
                      >
                        {style.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <p className="text-sm font-extrabold text-slate-800 line-clamp-1 flex-1">
                            {notification.title || 'Thông báo mới'}
                          </p>

                          {!notification.isRead && (
                            <span className="mt-1 w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                          )}
                        </div>

                        <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] font-semibold text-slate-400">
                            {getTimeLabel(notification)}
                          </span>

                          <span className="text-[10px] font-black text-indigo-600 flex items-center gap-1">
                            Mở
                            <ExternalLink size={11} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="p-3 bg-slate-50/80 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="w-full py-2.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors"
            >
              Xem tất cả thông báo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;