import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Check,
  Info,
  AlertTriangle,
  XCircle,
  Clock,
  CheckCheck,
  ExternalLink,
  CalendarClock,
  SearchX,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  canOpenNotificationTask,
  getNotificationTargetUrl,
  getNotificationTaskNavigation,
  useNotificationStore,
} from '../features/notification/stores/useNotificationStore';
import { AppNotification } from '../features/notification/types/notificationTypes';
import {
  useApproveDeadlineExtension,
  useRejectDeadlineExtension,
} from '../features/board/hooks/useBoardQueries';

const readDate = (notification: AppNotification) => {
  return notification.createdAt || notification.created_at || notification.timestamp || Date.now();
};

const readMeta = (notification: AppNotification, camelKey: string, snakeKey: string) => {
  return notification.metadata?.[camelKey] ?? notification.metadata?.[snakeKey];
};

const formatDateTime = (value?: string | number | null) => {
  if (!value) return 'Không rõ';

  try {
    return new Date(value).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(value);
  }
};

const getTimeLabel = (notification: AppNotification) => {
  try {
    return formatDistanceToNow(new Date(readDate(notification)), { addSuffix: true, locale: vi });
  } catch {
    return 'Vừa xong';
  }
};

const getStyle = (type?: string) => {
  const upper = String(type || '').toUpperCase();

  if (upper.includes('OVERDUE')) {
    return {
      icon: <XCircle size={18} className="text-rose-500" />,
      bg: 'bg-rose-50',
      border: 'border-rose-100',
      text: 'text-rose-700',
    };
  }

  if (upper.includes('DEADLINE') || upper.includes('REMINDER')) {
    return {
      icon: <AlertTriangle size={18} className="text-orange-500" />,
      bg: 'bg-orange-50',
      border: 'border-orange-100',
      text: 'text-orange-700',
    };
  }

  if (upper.includes('APPROVED') || upper.includes('COMPLETE')) {
    return {
      icon: <Check size={18} className="text-emerald-500" />,
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      text: 'text-emerald-700',
    };
  }

  if (upper.includes('REJECT')) {
    return {
      icon: <XCircle size={18} className="text-red-500" />,
      bg: 'bg-red-50',
      border: 'border-red-100',
      text: 'text-red-700',
    };
  }

  if (upper.includes('EXTENSION')) {
    return {
      icon: <Clock size={18} className="text-amber-500" />,
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      text: 'text-amber-700',
    };
  }

  return {
    icon: <Info size={18} className="text-indigo-500" />,
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    text: 'text-indigo-700',
  };
};

const isExtensionReviewNotification = (notification: AppNotification | null) => {
  if (!notification) return false;
  const type = String(notification.type || '').toUpperCase();
  return type === 'EXTENSION_REQUEST' || type === 'EXTENSION_REQUESTED';
};

const isPendingExtension = (notification: AppNotification | null) => {
  if (!notification) return false;

  const status =
    readMeta(notification, 'extensionStatus', 'extension_status') ||
    readMeta(notification, 'status', 'status');

  if (!status) return isExtensionReviewNotification(notification);
  return String(status).toUpperCase().includes('PENDING');
};

const NotificationCard = ({
  notification,
  selected,
  onClick,
}: {
  notification: AppNotification;
  selected: boolean;
  onClick: () => void;
}) => {
  const style = getStyle(notification.type);
  const isRead = Boolean(notification.isRead || notification.is_read);

  const readClass = isRead
    ? 'bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-90'
    : 'bg-white border-indigo-200 shadow-sm shadow-indigo-100/40';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${
        selected ? 'ring-2 ring-indigo-200 border-indigo-300 bg-indigo-50/60 opacity-100' : readClass
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${
            isRead ? 'bg-slate-100 border-slate-200 grayscale' : `${style.bg} ${style.border}`
          }`}
        >
          {style.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className={`${isRead ? 'text-slate-500 font-bold' : 'text-slate-900 font-extrabold'} text-sm md:text-base`}>
                {notification.title || 'Thông báo mới'}
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-1">{getTimeLabel(notification)}</p>
            </div>

            {!isRead && (
              <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-indigo-100 text-indigo-700">
                Chưa đọc
              </span>
            )}
          </div>

          <p className={`text-sm leading-relaxed mt-3 ${isRead ? 'text-slate-400' : 'text-slate-600'}`}>
            {notification.message}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${style.bg} ${style.text}`}>
              {notification.type}
            </span>

            {canOpenNotificationTask(notification) && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600">
                Có task liên quan
              </span>
            )}

            {isExtensionReviewNotification(notification) && isPendingExtension(notification) && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700">
                Chờ duyệt
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

const NotificationDetail = ({
  notification,
  onOpenTask,
  onApprove,
  onReject,
  rejectReason,
  setRejectReason,
  isApproving,
  isRejecting,
}: {
  notification: AppNotification | null;
  onOpenTask: () => void;
  onApprove: () => void;
  onReject: () => void;
  rejectReason: string;
  setRejectReason: (value: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) => {
  if (!notification) {
    return (
      <div className="h-full min-h-[400px] rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center p-10">
        <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
          <Bell size={28} className="text-indigo-400" />
        </div>
        <h3 className="text-lg font-extrabold text-slate-800">Chọn một thông báo</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">
          Nội dung chi tiết và task liên quan sẽ hiển thị ở đây.
        </p>
      </div>
    );
  }

  const style = getStyle(notification.type);
  const currentDueDate = readMeta(notification, 'currentDueDate', 'current_due_date');
  const requestedDueDate = readMeta(notification, 'requestedDueDate', 'requested_due_date');
  const approvedDueDate = readMeta(notification, 'approvedDueDate', 'approved_due_date');
  const reason = readMeta(notification, 'reason', 'reason') || readMeta(notification, 'extensionReason', 'extension_reason');
  const rejectReasonMeta = readMeta(notification, 'rejectReason', 'reject_reason');
  const requesterName = readMeta(notification, 'requesterName', 'requester_name');
  const expiresAt = readMeta(notification, 'expiresAt', 'expires_at');
  const canOpen = canOpenNotificationTask(notification);
  const canReviewExtension = isExtensionReviewNotification(notification) && isPendingExtension(notification);
  const busy = isApproving || isRejecting;

  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden sticky top-6">
      <div className="p-6 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${style.bg} ${style.border}`}>
            {style.icon}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-extrabold text-slate-800">{notification.title || 'Thông báo'}</h2>
            <p className="text-xs text-slate-400 font-bold mt-1">{formatDateTime(readDate(notification))}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{notification.message}</p>

        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-400 font-bold">Loại thông báo</span>
            <span className={`font-black ${style.text}`}>{notification.type}</span>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-400 font-bold">Trạng thái</span>
            <span className="font-black text-slate-700">
              {notification.isRead || notification.is_read ? 'Đã đọc' : 'Chưa đọc'}
            </span>
          </div>

          {(readMeta(notification, 'taskTitle', 'task_title') || readMeta(notification, 'taskId', 'task_id')) && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-400 font-bold">Task</span>
              <span className="font-black text-slate-700 truncate max-w-[220px]">
                {readMeta(notification, 'taskTitle', 'task_title') || readMeta(notification, 'taskId', 'task_id')}
              </span>
            </div>
          )}

          {requesterName && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-400 font-bold">Người xin dời hạn</span>
              <span className="font-black text-slate-700 truncate max-w-[220px]">{requesterName}</span>
            </div>
          )}
        </div>

        {(currentDueDate || requestedDueDate || approvedDueDate || reason || rejectReasonMeta || expiresAt) && (
          <div className="rounded-2xl bg-amber-50/70 border border-amber-100 p-4 space-y-3">
            <h3 className="text-sm font-extrabold text-amber-800 flex items-center gap-2">
              <CalendarClock size={16} />
              Thông tin deadline
            </h3>

            {currentDueDate && (
              <div className="text-sm flex justify-between gap-3">
                <span className="text-amber-700/70 font-bold">Deadline hiện tại</span>
                <span className="text-amber-900 font-extrabold">{formatDateTime(currentDueDate)}</span>
              </div>
            )}

            {requestedDueDate && (
              <div className="text-sm flex justify-between gap-3">
                <span className="text-amber-700/70 font-bold">Deadline đề xuất</span>
                <span className="text-amber-900 font-extrabold">{formatDateTime(requestedDueDate)}</span>
              </div>
            )}

            {approvedDueDate && (
              <div className="text-sm flex justify-between gap-3">
                <span className="text-emerald-700/70 font-bold">Deadline đã duyệt</span>
                <span className="text-emerald-700 font-extrabold">{formatDateTime(approvedDueDate)}</span>
              </div>
            )}

            {expiresAt && (
              <div className="text-sm flex justify-between gap-3">
                <span className="text-amber-700/70 font-bold">Tự từ chối sau</span>
                <span className="text-amber-900 font-extrabold">{formatDateTime(expiresAt)}</span>
              </div>
            )}

            {reason && (
              <div>
                <p className="text-xs font-black text-amber-700/70 uppercase mb-1">Lý do xin dời hạn</p>
                <p className="text-sm text-amber-900 whitespace-pre-wrap">{reason}</p>
              </div>
            )}

            {rejectReasonMeta && (
              <div>
                <p className="text-xs font-black text-rose-700/70 uppercase mb-1">Lý do từ chối</p>
                <p className="text-sm text-rose-700 whitespace-pre-wrap">{rejectReasonMeta}</p>
              </div>
            )}
          </div>
        )}

        {canReviewExtension && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3">
            <h3 className="text-sm font-extrabold text-indigo-800 flex items-center gap-2">
              <ShieldCheck size={16} />
              Duyệt yêu cầu dời deadline
            </h3>

            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Nhập lý do từ chối nếu bạn muốn từ chối yêu cầu..."
              className="w-full min-h-[86px] rounded-xl border border-indigo-100 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 resize-none"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onReject}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-rose-200 text-rose-600 text-sm font-extrabold hover:bg-rose-50 disabled:opacity-60"
              >
                {isRejecting ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                Từ chối
              </button>

              <button
                type="button"
                onClick={onApprove}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-extrabold hover:bg-emerald-700 disabled:opacity-60"
              >
                {isApproving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Đồng ý
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenTask}
          disabled={!canOpen}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-extrabold hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          <ExternalLink size={18} />
          Đi tới task liên quan
        </button>
      </div>
    </div>
  );
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const loadInitialNotifications = useNotificationStore((state) => state.loadInitialNotifications);

  const approveDeadlineExtension = useApproveDeadlineExtension();
  const rejectDeadlineExtension = useRejectDeadlineExtension();

  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadInitialNotifications();
  }, [loadInitialNotifications]);

  useEffect(() => {
    const notificationId = searchParams.get('notificationId');
    if (notificationId) setSelectedNotificationId(notificationId);
  }, [searchParams]);

  const selectedNotification = useMemo(() => {
    if (selectedNotificationId) {
      return notifications.find((item) => item.id === selectedNotificationId) || notifications[0] || null;
    }

    return notifications[0] || null;
  }, [notifications, selectedNotificationId]);

  useEffect(() => {
    setRejectReason('');
  }, [selectedNotification?.id]);

  const handleSelectNotification = async (notification: AppNotification) => {
    setSelectedNotificationId(notification.id);

    const params = new URLSearchParams(searchParams);
    params.set('notificationId', notification.id);
    setSearchParams(params, { replace: true });

    if (!notification.isRead && !notification.is_read) await markAsRead(notification.id);
  };

  const handleOpenTask = async () => {
    if (!selectedNotification || !canOpenNotificationTask(selectedNotification)) return;

    if (!selectedNotification.isRead && !selectedNotification.is_read) {
      await markAsRead(selectedNotification.id);
    }

    navigate(getNotificationTargetUrl(selectedNotification));
  };

  const getSelectedTaskId = () => {
    if (!selectedNotification) return null;
    const { taskId } = getNotificationTaskNavigation(selectedNotification);
    return taskId || null;
  };

  const getSelectedBoardId = () => {
    if (!selectedNotification) return undefined;
    const { boardId } = getNotificationTaskNavigation(selectedNotification);
    return boardId;
  };

  const handleApprove = async () => {
    const taskId = getSelectedTaskId();
    if (!taskId || !selectedNotification) return;

    await approveDeadlineExtension.mutateAsync({
      taskId,
      boardId: getSelectedBoardId(),
    });

    await markAsRead(selectedNotification.id);
    await loadInitialNotifications();
  };

  const handleReject = async () => {
    const taskId = getSelectedTaskId();
    if (!taskId || !selectedNotification) return;

    await rejectDeadlineExtension.mutateAsync({
      taskId,
      boardId: getSelectedBoardId(),
      rejectReason: rejectReason.trim() || 'Yêu cầu dời deadline không được chấp nhận.',
    });

    await markAsRead(selectedNotification.id);
    setRejectReason('');
    await loadInitialNotifications();
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
  };

  return (
    <div className="flex-1 h-full overflow-y-auto no-scrollbar bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-800">
              <div className="p-2 rounded-xl border border-indigo-100 bg-white/80 backdrop-blur-sm shadow-sm">
                <Bell className="text-indigo-600" size={24} />
              </div>
              Tất cả thông báo
            </h1>

            <p className="pl-12 text-sm font-medium text-slate-500">
              Bạn có <strong className="font-semibold text-indigo-600">{unreadCount}</strong> thông báo chưa đọc.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm"
            >
              <CheckCheck size={17} />
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-16 text-center">
            <div className="w-20 h-20 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-5">
              <SearchX size={34} className="text-indigo-300" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800">Chưa có thông báo</h3>
            <p className="text-sm text-slate-500 mt-2">
              Khi có task mới, deadline gần đến hạn hoặc task trễ hạn, thông báo sẽ xuất hiện ở đây.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6">
            <div className="space-y-3">
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  selected={selectedNotification?.id === notification.id}
                  onClick={() => handleSelectNotification(notification)}
                />
              ))}
            </div>

            <NotificationDetail
              notification={selectedNotification}
              onOpenTask={handleOpenTask}
              onApprove={handleApprove}
              onReject={handleReject}
              rejectReason={rejectReason}
              setRejectReason={setRejectReason}
              isApproving={approveDeadlineExtension.isPending}
              isRejecting={rejectDeadlineExtension.isPending}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;