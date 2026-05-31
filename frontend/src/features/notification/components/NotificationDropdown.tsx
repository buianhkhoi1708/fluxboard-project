import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    return { icon: <XCircle size={16} className="text-rose-500" />, bg: 'bg-rose-50', border: 'border-rose-100' };
  }

  if (upper.includes('DEADLINE') || upper.includes('REMINDER')) {
    return { icon: <AlertTriangle size={16} className="text-orange-500" />, bg: 'bg-orange-50', border: 'border-orange-100' };
  }

  if (upper.includes('EXTENSION') && upper.includes('APPROVED')) {
    return { icon: <Check size={16} className="text-emerald-500" />, bg: 'bg-emerald-50', border: 'border-emerald-100' };
  }

  if (upper.includes('EXTENSION') && upper.includes('REJECTED')) {
    return { icon: <XCircle size={16} className="text-red-500" />, bg: 'bg-red-50', border: 'border-red-100' };
  }

  if (upper.includes('EXTENSION')) {
    return { icon: <Clock size={16} className="text-amber-500" />, bg: 'bg-amber-50', border: 'border-amber-100' };
  }

  if (upper.includes('COMPLETE')) {
    return { icon: <Check size={16} className="text-emerald-500" />, bg: 'bg-emerald-50', border: 'border-emerald-100' };
  }

  if (upper.includes('MOVE') || upper.includes('UPDATE')) {
    return { icon: <Info size={16} className="text-indigo-500" />, bg: 'bg-indigo-50', border: 'border-indigo-100' };
  }

  return { icon: <Info size={16} className="text-blue-500" />, bg: 'bg-blue-50', border: 'border-blue-100' };
};

const getTimeLabel = (notification: AppNotification) => {
  try {
    return formatDistanceToNow(new Date(readDate(notification)), { addSuffix: true, locale: vi });
  } catch {
    return 'Vừa xong';
  }
};

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const loadInitialNotifications = useNotificationStore((state) => state.loadInitialNotifications);

  useEffect(() => {
    loadInitialNotifications();
  }, [loadInitialNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const latestNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.isRead) await markAsRead(notification.id);
    setIsOpen(false);
    navigate(getNotificationTargetUrl(notification));
  };

  const handleMarkAll = async (event: React.MouseEvent) => {
    event.stopPropagation();
    await markAllAsRead();
  };

  const handleOpenAll = () => {
    setIsOpen(false);
    navigate('/notifications');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors focus:outline-none"
      >
        <Bell size={22} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 border-2 border-white rounded-full text-[10px] font-black text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[430px] max-w-[calc(100vw-2rem)] bg-white rounded-[1.5rem] border border-slate-200 shadow-2xl shadow-slate-900/10 overflow-hidden z-[200] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Thông báo</h3>
              <p className="text-xs font-bold text-slate-400 mt-1">
                {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Không có thông báo chưa đọc'}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50"
              >
                <CheckCheck size={14} />
                Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-[520px] overflow-y-auto custom-scrollbar">
            {latestNotifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                  <Bell size={24} className="text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-500">Chưa có thông báo</p>
                <p className="text-xs text-slate-400 mt-1">Thông báo mới sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              latestNotifications.map((notification) => {
                const style = getNotificationStyle(notification.type);
                const isRead = Boolean(notification.isRead || notification.is_read);

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-5 py-4 border-b border-slate-100 last:border-b-0 transition-all group relative ${
                      isRead
                        ? 'bg-white hover:bg-slate-50 opacity-55'
                        : 'bg-indigo-50/55 hover:bg-indigo-50 opacity-100'
                    }`}
                  >
                    {!isRead && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                    )}

                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                          isRead ? 'bg-slate-50 border-slate-200 grayscale' : `${style.bg} ${style.border}`
                        }`}
                      >
                        {style.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm line-clamp-1 ${isRead ? 'font-bold text-slate-500' : 'font-extrabold text-slate-900'}`}>
                            {notification.title || 'Thông báo mới'}
                          </h4>

                          {!isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />}
                        </div>

                        <p className={`mt-1 text-xs leading-relaxed line-clamp-2 ${isRead ? 'text-slate-400' : 'text-slate-600'}`}>
                          {notification.message}
                        </p>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-400">
                            {getTimeLabel(notification)}
                          </span>

                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 group-hover:text-indigo-700">
                            Mở công việc
                            <ExternalLink size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenAll}
            className="w-full px-5 py-4 border-t border-slate-100 bg-white hover:bg-indigo-50 text-indigo-600 text-sm font-extrabold transition-colors"
          >
            Xem tất cả thông báo
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;