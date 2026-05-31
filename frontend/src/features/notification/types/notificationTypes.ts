import type { Client } from '@stomp/stompjs';

export type NotificationType =
  | 'TASK_CREATE'
  | 'TASK_CREATE_BY_YOU'
  | 'TASK_ASSIGNED'
  | 'TASK_UPDATE'
  | 'TASK_UPDATE_BY_YOU'
  | 'TASK_MOVE'
  | 'TASK_MOVE_BY_YOU'
  | 'TASK_MOVED'
  | 'TASK_COMPLETED'
  | 'TASK_COMPLETED_BY_YOU'
  | 'TASK_DEADLINE_REMINDER'
  | 'DEADLINE_REMINDER'
  | 'DEADLINE_APPROACHING'
  | 'TASK_OVERDUE'
  | 'DEADLINE_UPDATED'
  | 'EXTENSION_REQUEST'
  | 'EXTENSION_REQUESTED'
  | 'EXTENSION_SUBMITTED'
  | 'EXTENSION_APPROVED'
  | 'EXTENSION_APPROVED_BY_YOU'
  | 'EXTENSION_REJECTED'
  | 'EXTENSION_REJECTED_BY_YOU'
  | string;

export interface NotificationMetadata {
  taskId?: string;
  task_id?: string;
  boardId?: string;
  board_id?: string;
  columnId?: string;
  column_id?: string;
  projectId?: string;
  project_id?: string;
  taskTitle?: string;
  task_title?: string;
  actionUrl?: string;
  action_url?: string;

  requesterId?: string;
  requester_id?: string;
  requesterName?: string;
  requester_name?: string;
  currentDueDate?: string;
  current_due_date?: string;
  requestedDueDate?: string;
  requested_due_date?: string;
  approvedDueDate?: string;
  approved_due_date?: string;
  reason?: string;
  rejectReason?: string;
  reject_reason?: string;
  extensionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  extension_status?: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  extensionRequestedAt?: string;
  extension_requested_at?: string;
  expiresAt?: string;
  expires_at?: string;
  canReview?: boolean;
  can_review?: boolean;

  dueDate?: string;
  due_date?: string;
  isOverdue?: boolean;
  is_overdue?: boolean;

  [key: string]: any;
}

export interface AppNotification {
  id: string;

  recipientId?: string;
  recipient_id?: string;
  senderId?: string | null;
  sender_id?: string | null;

  type: NotificationType;
  title: string;
  message: string;

  referenceId?: string | null;
  reference_id?: string | null;
  referenceType?: string | null;
  reference_type?: string | null;

  actionUrl?: string | null;
  action_url?: string | null;

  metadata: NotificationMetadata;

  isRead: boolean;
  is_read?: boolean;

  status?: string | null;
  timestamp?: string | number | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  sendAt?: string | null;
  send_at?: string | null;
}

export interface NotificationPageResponse {
  content: AppNotification[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext?: boolean;
}

export interface NotificationToast {
  id: string;
  notification: AppNotification;
  createdAt: number;
}

export interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  stompClient: Client | null;
  isConnected: boolean;
  isLongPolling: boolean;
  toastNotifications: NotificationToast[];

  hydrateNotifications: (notifications: AppNotification[]) => void;
  setUnreadCount: (count: number) => void;

  loadInitialNotifications: () => Promise<void>;

  connectWebSocket: (userId: string) => void;
  disconnectWebSocket: () => void;

  startLongPolling: () => void;
  stopLongPolling: () => void;

  addNotification: (rawNotification: any, options?: { showToast?: boolean }) => AppNotification | null;
  removeToast: (toastId: string) => void;

  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}