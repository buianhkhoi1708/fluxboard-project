import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Check,
  Info,
  AlertTriangle,
  XCircle,
  Clock,
  CheckCircle2,
  CheckCheck,
  ExternalLink,
  Loader2,
  X,
  CalendarClock,
  MessageSquareText,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

import { notificationApi } from '../features/notification/api/notificationApi';
import {
  getNotificationTargetUrl,
  getNotificationTaskNavigation,
  useNotificationStore,
} from '../features/notification/stores/useNotificationStore';
import { AppNotification } from '../features/notification/types/notificationTypes';

const notificationStyles: Record<
  string,
  {
    icon: React.ReactNode;
    bg: string;
    border: string;
    text: string;
  }
> = {
  TASK_CREATE: {
    icon: <Info size={18} className="text-blue-500" />,
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    text: 'text-blue-700',
  },
  TASK_CREATE_BY_YOU: {
    icon: <Info size={18} className="text-blue-500" />,
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    text: 'text-blue-700',
  },
  TASK_ASSIGNED: {
    icon: <Info size={18} className="text-blue-500" />,
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    text: 'text-blue-700',
  },
  TASK_MOVE: {
    icon: <Info size={18} className="text-indigo-500" />,
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    text: 'text-indigo-700',
  },
  TASK_MOVE_BY_YOU: {
    icon: <Info size={18} className="text-indigo-500" />,
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    text: 'text-indigo-700',
  },
  TASK_MOVED: {
    icon: <Info size={18} className="text-indigo-500" />,
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    text: 'text-indigo-700',
  },
  TASK_UPDATE: {
    icon: <Info size={18} className="text-sky-500" />,
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    text: 'text-sky-700',
  },
  TASK_UPDATE_BY_YOU: {
    icon: <Info size={18} className="text-sky-500" />,
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    text: 'text-sky-700',
  },
  TASK_DEADLINE_REMINDER: {
    icon: <AlertTriangle size={18} className="text-orange-500" />,
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    text: 'text-orange-700',
  },
  DEADLINE_REMINDER: {
    icon: <AlertTriangle size={18} className="text-orange-500" />,
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    text: 'text-orange-700',
  },
  DEADLINE_APPROACHING: {
    icon: <AlertTriangle size={18} className="text-orange-500" />,
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    text: 'text-orange-700',
  },
  TASK_OVERDUE: {
    icon: <XCircle size={18} className="text-rose-500" />,
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    text: 'text-rose-700',
  },
  DEADLINE_UPDATED: {
    icon: <Clock size={18} className="text-sky-500" />,
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    text: 'text-sky-700',
  },
  EXTENSION_APPROVED: {
    icon: <Check size={18} className="text-emerald-500" />,
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    text: 'text-emerald-700',
  },
  EXTENSION_APPROVED_BY_YOU: {
    icon: <Check size={18} className="text-emerald-500" />,
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    text: 'text-emerald-700',
  },
  EXTENSION_REJECTED: {
    icon: <XCircle size={18} className="text-red-500" />,
    bg: 'bg-red-50',
    border: 'border-red-100',
    text: 'text-red-700',
  },
  EXTENSION_REJECTED_BY_YOU: {
    icon: <XCircle size={18} className="text-red-500" />,
    bg: 'bg-red-50',
    border: 'border-red-100',
    text: 'text-red-700',
  },
  EXTENSION_REQUEST: {
    icon: <Clock size={18} className="text-amber-500" />,
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    text: 'text-amber-700',
  },
  EXTENSION_REQUESTED: {
    icon: <Clock size={18} className="text-amber-500" />,
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    text: 'text-amber-700',
  },
  EXTENSION_SUBMITTED: {
    icon: <Clock size={18} className="text-amber-500" />,
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    text: 'text-amber-700',
  },
};

const defaultStyle = {
  icon: <Info size={18} className="text-indigo-500" />,
  bg: 'bg-indigo-50',
  border: 'border-indigo-100',
  text: 'text-indigo-700',
};

const readMeta = (notification: AppNotification, camelKey: string, snakeKey: string) => {
  return notification.metadata?.[camelKey] ?? notification.metadata?.[snakeKey];
};

const readDate = (notification: AppNotification) => {
  return notification.createdAt || notification.created_at || notification.timestamp || Date.now();
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

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Không rõ';

  try {
    return new Date(value).toLocaleString('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(value);
  }
};

const isExtensionRequest = (notification?: AppNotification | null) => {
  if (!notification) return false;
  return ['EXTENSION_REQUEST', 'EXTENSION_REQUESTED'].includes(String(notification.type));
};

const isPendingExtension = (notification?: AppNotification | null) => {
  if (!notification) return false;
  const status =
    readMeta(notification, 'extensionStatus', 'extension_status') ||
    'PENDING';

  const canReview =
    readMeta(notification, 'canReview', 'can_review') ?? true;

  return isExtensionRequest(notification) && status === 'PENDING' && Boolean(canReview);
};

const ExtensionReviewModal = ({
  notification,
  onClose,
  onDone,
}: {
  notification: AppNotification;
  onClose: () => void;
  onDone: () => void;
}) => {
  const navigate = useNavigate();
  const [rejectReason, setRejectReason] = useState('');
  const [mode, setMode] = useState<'main' | 'reject'>('main');

  const { taskId, boardId } = getNotificationTaskNavigation(notification);

  const approveMutation = useMutation({
    mutationFn: () => notificationApi.approveDeadlineExtension(String(taskId)),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      notificationApi.rejectDeadlineExtension(String(taskId), {
        reject_reason: rejectReason,
      }),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });

  const requesterName =
    readMeta(notification, 'requesterName', 'requester_name') || 'Nhân viên';
  const taskTitle =
    readMeta(notification, 'taskTitle', 'task_title') ||
    notification.title ||
    'Task';
  const currentDueDate = readMeta(notification, 'currentDueDate', 'current_due_date');
  const requestedDueDate = readMeta(notification, 'requestedDueDate', 'requested_due_date');
  const reason = readMeta(notification, 'reason', 'reason') || 'Không có lý do.';
  const expiresAt = readMeta(notification, 'expiresAt', 'expires_at');

  const isSubmitting = approveMutation.isPending || rejectMutation.isPending;

  const openTaskDetail = () => {
    if (boardId && taskId) {
      navigate(`/board/${boardId}?taskId=${taskId}`);
      return;
    }

    navigate(getNotificationTargetUrl(notification));
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl rounded-[2rem] bg-white shadow-2xl border border-white/60 overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <CalendarClock size={24} />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-slate-800">
                Yêu cầu dời deadline
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {requesterName} đang xin dời hạn cho task.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-white hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
              Task
            </p>
            <p className="text-lg font-extrabold text-slate-800">
              {taskTitle}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
              <div className="rounded-xl bg-white border border-slate-100 p-4">
                <p className="text-xs font-bold text-slate-400 mb-1">
                  Deadline hiện tại
                </p>
                <p className="text-sm font-extrabold text-slate-700">
                  {formatDateTime(currentDueDate)}
                </p>
              </div>

              <div className="rounded-xl bg-white border border-amber-100 p-4">
                <p className="text-xs font-bold text-amber-500 mb-1">
                  Deadline đề xuất
                </p>
                <p className="text-sm font-extrabold text-amber-700">
                  {formatDateTime(requestedDueDate)}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-white border border-slate-100 p-4">
              <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1">
                <MessageSquareText size={14} />
                Lý do
              </p>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {reason}
              </p>
            </div>

            <div className="mt-4 text-xs text-slate-400">
              Hạn xử lý:{' '}
              <span className="font-bold text-rose-500">
                {formatDateTime(expiresAt)}
              </span>
              . Quá 3 ngày hệ thống sẽ tự động từ chối.
            </div>
          </div>

          {mode === 'reject' && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
              <label className="text-sm font-bold text-rose-700">
                Lý do từ chối
              </label>
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Nhập lý do từ chối yêu cầu dời deadline..."
                className="mt-2 w-full min-h-[100px] rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100 resize-y"
              />
            </div>
          )}

          {(approveMutation.isError || rejectMutation.isError) && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-semibold flex items-center gap-2">
              <AlertTriangle size={16} />
              Xử lý yêu cầu thất bại. Vui lòng thử lại.
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={openTaskDetail}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
            >
              <ExternalLink size={17} />
              Xem chi tiết task
            </button>

            <div className="flex items-center justify-end gap-3">
              {mode === 'reject' ? (
                <>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setMode('main')}
                    className="px-5 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 disabled:opacity-60"
                  >
                    Quay lại
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => rejectMutation.mutate()}
                    className="px-5 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {rejectMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                    Xác nhận từ chối
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setMode('reject')}
                    className="px-5 py-3 rounded-xl bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 disabled:opacity-60"
                  >
                    Từ chối
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => approveMutation.mutate()}
                    className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {approveMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                    Đồng ý dời hạn
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  const style = notificationStyles[String(notification.type)] || defaultStyle;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${
        selected
          ? 'border-indigo-300 bg-indigo-50/70 shadow-md shadow-indigo-100/50'
          : notification.isRead
            ? 'border-slate-200 bg-white'
            : 'border-indigo-100 bg-white shadow-sm'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${style.bg} ${style.border}`}
        >
          {style.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm md:text-base font-extrabold text-slate-800">
                {notification.title || 'Thông báo mới'}
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-1">
                {getTimeLabel(notification)}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!notification.isRead && (
                <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-indigo-100 text-indigo-700">
                  Mới
                </span>
              )}

              {isPendingExtension(notification) && (
                <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-amber-100 text-amber-700">
                  Chờ duyệt
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed mt-3">
            {notification.message}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${style.bg} ${style.text}`}
            >
              {notification.type}
            </span>

            {(readMeta(notification, 'taskTitle', 'task_title') ||
              readMeta(notification, 'taskId', 'task_id')) && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500">
                {readMeta(notification, 'taskTitle', 'task_title') ||
                  `Task ${readMeta(notification, 'taskId', 'task_id')}`}
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
  onOpenExtension,
  onOpenTask,
}: {
  notification: AppNotification | null;
  onOpenExtension: () => void;
  onOpenTask: () => void;
}) => {
  if (!notification) {
    return (
      <div className="h-full min-h-[400px] rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center p-10">
        <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
          <Bell size={28} className="text-indigo-400" />
        </div>
        <h3 className="text-lg font-extrabold text-slate-800">
          Chọn một thông báo
        </h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">
          Nội dung chi tiết, task liên quan và thao tác xử lý sẽ hiển thị ở đây.
        </p>
      </div>
    );
  }

  const style = notificationStyles[String(notification.type)] || defaultStyle;
  const currentDueDate = readMeta(notification, 'currentDueDate', 'current_due_date');
  const requestedDueDate = readMeta(notification, 'requestedDueDate', 'requested_due_date');
  const reason = readMeta(notification, 'reason', 'reason');
  const rejectReason = readMeta(notification, 'rejectReason', 'reject_reason');
  const expiresAt = readMeta(notification, 'expiresAt', 'expires_at');

  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden sticky top-6">
      <div className="p-6 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${style.bg} ${style.border}`}
          >
            {style.icon}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-extrabold text-slate-800">
              {notification.title || 'Thông báo'}
            </h2>
            <p className="text-xs text-slate-400 font-bold mt-1">
              {formatDateTime(String(readDate(notification)))}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
          {notification.message}
        </p>

        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-400 font-bold">Loại thông báo</span>
            <span className={`font-black ${style.text}`}>
              {notification.type}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-400 font-bold">Trạng thái</span>
            <span className="font-black text-slate-700">
              {notification.isRead ? 'Đã đọc' : 'Chưa đọc'}
            </span>
          </div>

          {(readMeta(notification, 'taskId', 'task_id') ||
            notification.referenceId ||
            notification.reference_id) && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-400 font-bold">Task</span>
              <span className="font-black text-slate-700 truncate max-w-[220px]">
                {readMeta(notification, 'taskTitle', 'task_title') ||
                  readMeta(notification, 'taskId', 'task_id') ||
                  notification.referenceId ||
                  notification.reference_id}
              </span>
            </div>
          )}
        </div>

        {(currentDueDate || requestedDueDate || reason || rejectReason) && (
          <div className="rounded-2xl bg-amber-50/70 border border-amber-100 p-4 space-y-3">
            <h3 className="text-sm font-extrabold text-amber-800 flex items-center gap-2">
              <CalendarClock size={16} />
              Thông tin dời deadline
            </h3>

            {currentDueDate && (
              <div className="text-sm flex justify-between gap-3">
                <span className="text-amber-700/70 font-bold">
                  Deadline hiện tại
                </span>
                <span className="text-amber-900 font-extrabold">
                  {formatDateTime(currentDueDate)}
                </span>
              </div>
            )}

            {requestedDueDate && (
              <div className="text-sm flex justify-between gap-3">
                <span className="text-amber-700/70 font-bold">
                  Deadline đề xuất
                </span>
                <span className="text-amber-900 font-extrabold">
                  {formatDateTime(requestedDueDate)}
                </span>
              </div>
            )}

            {expiresAt && (
              <div className="text-sm flex justify-between gap-3">
                <span className="text-amber-700/70 font-bold">
                  Hạn xử lý
                </span>
                <span className="text-rose-600 font-extrabold">
                  {formatDateTime(expiresAt)}
                </span>
              </div>
            )}

            {reason && (
              <div>
                <p className="text-xs font-black text-amber-700/70 uppercase mb-1">
                  Lý do
                </p>
                <p className="text-sm text-amber-900 whitespace-pre-wrap">
                  {reason}
                </p>
              </div>
            )}

            {rejectReason && (
              <div>
                <p className="text-xs font-black text-rose-700/70 uppercase mb-1">
                  Lý do từ chối
                </p>
                <p className="text-sm text-rose-700 whitespace-pre-wrap">
                  {rejectReason}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          {isPendingExtension(notification) && (
            <button
              type="button"
              onClick={onOpenExtension}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 text-white font-extrabold hover:bg-amber-600 transition-colors"
            >
              <Clock size={18} />
              Xử lý yêu cầu dời deadline
            </button>
          )}

          <button
            type="button"
            onClick={onOpenTask}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-extrabold hover:bg-indigo-700 transition-colors"
          >
            <ExternalLink size={18} />
            Đi tới task liên quan
          </button>
        </div>
      </div>
    </div>
  );
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    loadInitialNotifications,
  } = useNotificationStore();

  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [extensionModalNotification, setExtensionModalNotification] =
    useState<AppNotification | null>(null);

  useEffect(() => {
    loadInitialNotifications();
  }, [loadInitialNotifications]);

  useEffect(() => {
    const notificationId = searchParams.get('notificationId');
    if (notificationId) {
      setSelectedNotificationId(notificationId);
    }
  }, [searchParams]);

  const selectedNotification = useMemo(() => {
    if (selectedNotificationId) {
      return notifications.find((item) => item.id === selectedNotificationId) || null;
    }

    return notifications[0] || null;
  }, [notifications, selectedNotificationId]);

  useEffect(() => {
    const shouldOpenExtension = searchParams.get('extensionRequest') === '1';

    if (shouldOpenExtension && selectedNotification && isExtensionRequest(selectedNotification)) {
      setExtensionModalNotification(selectedNotification);
    }
  }, [searchParams, selectedNotification]);

  const handleSelectNotification = async (notification: AppNotification) => {
    setSelectedNotificationId(notification.id);

    const params = new URLSearchParams(searchParams);
    params.set('notificationId', notification.id);

    if (isExtensionRequest(notification)) {
      params.set('extensionRequest', '1');
    } else {
      params.delete('extensionRequest');
    }

    setSearchParams(params, { replace: true });

    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  };

  const handleOpenTask = async (notification: AppNotification | null) => {
    if (!notification) return;

    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    const handleOpenTask = async (notification: AppNotification | null) => {
  if (!notification) return;

  if (!notification.isRead) {
    await markAsRead(notification.id);
  }

  const targetUrl = getNotificationTargetUrl(notification);

  if (targetUrl === '/notifications') {
    return;
  }

  navigate(targetUrl);
};
  };

  const handleOpenExtension = async (notification: AppNotification | null) => {
    if (!notification) return;

    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    setExtensionModalNotification(notification);
  };

  const handleExtensionDone = () => {
    loadInitialNotifications();
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
              Bạn có{' '}
              <strong className="font-semibold text-indigo-600">
                {unreadCount}
              </strong>{' '}
              thông báo chưa đọc.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
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
              <Bell size={34} className="text-indigo-300" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800">
              Chưa có thông báo
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              Khi có task mới, deadline gần đến hạn hoặc yêu cầu dời deadline,
              thông báo sẽ xuất hiện ở đây.
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
              onOpenExtension={() => handleOpenExtension(selectedNotification)}
              onOpenTask={() => handleOpenTask(selectedNotification)}
            />
          </div>
        )}
      </div>

      {extensionModalNotification && (
        <ExtensionReviewModal
          notification={extensionModalNotification}
          onClose={() => {
            setExtensionModalNotification(null);

            const params = new URLSearchParams(searchParams);
            params.delete('extensionRequest');
            setSearchParams(params, { replace: true });
          }}
          onDone={handleExtensionDone}
        />
      )}
    </div>
  );
};

export default NotificationsPage;