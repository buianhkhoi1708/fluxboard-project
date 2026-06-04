import React, { useState, useEffect, useRef, useMemo, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  AlignLeft,
  CheckSquare,
  Clock,
  Calendar,
  Flag,
  Target,
  Sparkles,
  Plus,
  Square,
  Save,
  Trash2,
  User,
  ChevronDown,
  KanbanSquare,
  Check,
  Paperclip,
  File,
  Download,
  Loader2,
  MessageSquare,
  Send,
  CheckCircle2,
  CalendarPlus,
  AlertTriangle,
  ShieldAlert,
  XCircle
} from 'lucide-react';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { vi } from 'date-fns/locale/vi';

import { useBoardStore } from '../stores/useBoardStore';
import { useUserStore } from '../../user/store/useUserStore';
import { useAuthStore } from '../../auth/store/useAuthStore';
import {
  BOARD_QUERY_KEYS,
  useAddAttachmentToTask,
  useAddCommentToTask,
  useCreateTask,
  useDeleteTask,
  useGetBoardDetail,
  useGetProjectMembers,
  useGetTaskDeadline,
  useRequestDeadlineExtension,
  useApproveDeadlineExtension,
  useRejectDeadlineExtension,
  useResolveTaskComment,
  useUpdateTask,
  getPresignedUrl
} from '../hooks/useBoardQueries';
import { Task, TaskAttachment, TaskComment, TaskDetailModalProps } from '../types/index';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../../hooks/useRealtimeEvent';

registerLocale('vi', vi);

const priorityColors: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700'
};

interface CustomDateInputProps {
  value?: string;
  onClick?: () => void;
  placeholder?: string;
}

const CustomDateInput = forwardRef<HTMLButtonElement, CustomDateInputProps>(({ value, onClick, placeholder }, ref) => (
  <button
    type="button"
    onClick={onClick}
    ref={ref}
    className="w-full text-[13px] md:text-sm border border-slate-200/80 rounded-xl px-3 md:px-3.5 py-2 md:py-2.5 outline-none hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 transition-all bg-white flex items-center justify-between shadow-sm group"
  >
    <div className="flex items-center gap-2 min-w-0">
      <Calendar size={14} className={`md:w-[15px] md:h-[15px] shrink-0 ${value ? 'text-indigo-500' : 'text-slate-400 group-hover:text-indigo-400 transition-colors'}`} />
      <span className={`truncate ${value ? 'font-bold text-slate-800' : 'text-slate-400 font-medium'}`}>{value || placeholder}</span>
    </div>
    <ChevronDown size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0 ml-1" />
  </button>
));

CustomDateInput.displayName = 'CustomDateInput';

const getTaskId = (task: Task | null) => String(task?.id || task?._id || '');
const getCommentId = (comment: TaskComment) => String(comment.comment_id || comment.id || '');
const getCommentAuthorName = (comment: TaskComment) => comment.author_name || comment.authorName || 'Người dùng';
const getCommentAvatar = (comment: TaskComment) => comment.author_avatar_url || comment.authorAvatarUrl || null;
const getCommentCreatedAt = (comment: TaskComment) => comment.created_at || comment.createdAt || '';
const isActiveComment = (comment: TaskComment) => !comment.is_resolved && !comment.isResolved && !comment.resolved;

const normalizeRole = (value?: string | null) => String(value || '').trim().toUpperCase();

const getCurrentUserRole = (user: any) => {
  return normalizeRole(
    user?.role ||
      user?.role_name ||
      user?.roleName ||
      user?.system_role ||
      user?.systemRole ||
      user?.authorities?.[0] ||
      user?.roles?.[0]?.name ||
      user?.roles?.[0]
  );
};

const isManagerLikeRole = (role: string) => {
  return ['SYSTEM_ADMIN', 'ADMIN', 'PM', 'PROJECT_ADMIN'].includes(normalizeRole(role));
};

const canReviewExtensionRole = (role: string) => {
  return ['SYSTEM_ADMIN', 'ADMIN', 'MANAGER', 'PM', 'PROJECT_ADMIN'].includes(normalizeRole(role));
};

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return 'Không rõ';
  try {
    return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(value);
  }
};

const read = (obj: any, camelKey: string, snakeKey: string) => obj?.[camelKey] ?? obj?.[snakeKey];

const getIncomingTaskFromRealtime = (message: any): Task | null => {
  const candidate = message?.task || message?.data?.task || message?.payload?.task || null;
  if (!candidate) return null;
  return getTaskId(candidate as Task) ? candidate as Task : null;
};

const mergeIncomingTask = (previous: Task | null, incoming: Task | null): Task | null => {
  if (!incoming) return previous;
  const previousId = getTaskId(previous);
  const incomingId = getTaskId(incoming);
  if (previousId && incomingId && previousId !== incomingId) return previous;

  return {
    ...(previous || {}),
    ...incoming,
    comments: Array.isArray((incoming as any).comments) ? (incoming as any).comments : ((previous as any)?.comments || []),
    attachments: Array.isArray((incoming as any).attachments) ? (incoming as any).attachments : ((previous as any)?.attachments || []),
    subtasks: Array.isArray((incoming as any).subtasks) ? (incoming as any).subtasks : ((previous as any)?.subtasks || [])
  } as Task;
};

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ isOpen, onClose, task, listId, initialOpenComments = false }) => {
  const queryClient = useQueryClient();
  const { activeBoardId } = useBoardStore();
  const { user } = useAuthStore();
  const { data: board } = useGetBoardDetail(activeBoardId as string);
  const getUser = useUserStore((state) => state.getUser);

  const taskId = getTaskId(task);
  const { data: deadlineInfo, refetch: refetchDeadline } = useGetTaskDeadline(taskId);

  const projectId = board?.projectId || board?.project_id;
  const { data: apiMembers, isLoading: isMembersLoading } = useGetProjectMembers(projectId as string);

  const { mutateAsync: updateApiTask } = useUpdateTask();
  const { mutateAsync: deleteApiTask } = useDeleteTask();
  const { mutateAsync: createApiTask } = useCreateTask();
  const { mutateAsync: addAttachment } = useAddAttachmentToTask();
  const { mutateAsync: addComment } = useAddCommentToTask();
  const { mutateAsync: resolveComment } = useResolveTaskComment();
  
  // 🚀 CÁC HOOK LIÊN QUAN ĐẾN DEADLINE
  const { mutateAsync: requestDeadlineExtension } = useRequestDeadlineExtension();
  const { mutateAsync: approveExtension } = useApproveDeadlineExtension();
  const { mutateAsync: rejectExtension } = useRejectDeadlineExtension();

  const [localTask, setLocalTask] = useState<Task | null>(task);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState('MEDIUM');
  const [editColumnId, setEditColumnId] = useState(listId);
  const [editStoryPoints, setEditStoryPoints] = useState<number | string>(0);
  const [editStartDate, setEditStartDate] = useState<Date | null>(null);
  const [editDueDate, setEditDueDate] = useState<Date | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [editAssignees, setEditAssignees] = useState<string[]>([]);
  const [isAssigneePopupOpen, setIsAssigneePopupOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommentPanelOpen, setIsCommentPanelOpen] = useState(initialOpenComments);
  const [newComment, setNewComment] = useState('');
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [resolvingCommentId, setResolvingCommentId] = useState<string | null>(null);
  
  // States cho Extension
  const [isExtensionFormOpen, setIsExtensionFormOpen] = useState(false);
  const [requestedDueDate, setRequestedDueDate] = useState<Date | null>(null);
  const [extensionReason, setExtensionReason] = useState('');
  const [isRequestingExtension, setIsRequestingExtension] = useState(false);
  const [extensionMessage, setExtensionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // 🚀 States cho Approval (Manager)
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReasonManager, setRejectReasonManager] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUserRole = getCurrentUserRole(user);
  const canRequestExtensionByRole = !isManagerLikeRole(currentUserRole);
  const canReviewExtension = canReviewExtensionRole(currentUserRole);

  const taskDueDateValue = localTask?.due_date || localTask?.dueDate || deadlineInfo?.due_date || deadlineInfo?.dueDate || null;
  const taskDueDate = taskDueDateValue ? new Date(taskDueDateValue) : null;

  const isExtensionPending = Boolean(read(deadlineInfo, 'isExtensionPending', 'is_extension_pending'));
  const extensionStatus = String(read(deadlineInfo, 'extensionStatus', 'extension_status') || '').toUpperCase();
  const pendingRequestedDate = read(deadlineInfo, 'pendingRequestedDate', 'pending_requested_date');
  const extensionReasonFromServer = read(deadlineInfo, 'extensionReason', 'extension_reason');
  const extensionRejectReason = read(deadlineInfo, 'extensionRejectReason', 'extension_reject_reason');
  const extensionRequestedAt = read(deadlineInfo, 'extensionRequestedAt', 'extension_requested_at');
  const extensionExpiresAt = read(deadlineInfo, 'extensionExpiresAt', 'extension_expires_at');

  const taskAttachments = useMemo<TaskAttachment[]>(() => Array.isArray(localTask?.attachments) ? localTask.attachments : [], [localTask?.attachments]);
  const taskComments = useMemo<TaskComment[]>(() => Array.isArray(localTask?.comments) ? localTask.comments.filter(isActiveComment) : [], [localTask?.comments]);

  const projectMembers = useMemo(() => {
    if (!apiMembers) return [];
    if (Array.isArray(apiMembers)) return apiMembers;
    if (apiMembers.data && Array.isArray(apiMembers.data)) return apiMembers.data;
    return apiMembers.content || [];
  }, [apiMembers]);

  const calculatedDays = useMemo(() => {
    if (editStartDate && editDueDate) {
      if (editDueDate >= editStartDate) {
        const diffTime = editDueDate.getTime() - editStartDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays === 0 ? 1 : diffDays;
      }
      return 0;
    }
    return '';
  }, [editStartDate, editDueDate]);

  useEffect(() => {
    setLocalTask((prev) => mergeIncomingTask(prev, task));
  }, [task]);

  const realtimeTaskTopic = taskId ? `/topic/tasks/${taskId}` : '';

  useRealtimeEvent(realtimeTaskTopic, async (message) => {
    const action = String(message?.action || message?.type || '').toUpperCase();
    const incomingTask = getIncomingTaskFromRealtime(message);

    if (incomingTask && getTaskId(incomingTask) === taskId) {
      setLocalTask((prev) => mergeIncomingTask(prev, incomingTask));

      const nextDueDate = (incomingTask as any).due_date || (incomingTask as any).dueDate;
      if (nextDueDate) setEditDueDate(new Date(nextDueDate));

      const nextStatus = String((incomingTask as any).status || '').toUpperCase();
      if (nextStatus) setIsDone(nextStatus === 'DONE');
    }

    if (activeBoardId) {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(activeBoardId) });
    }

    queryClient.invalidateQueries({ queryKey: ['task-deadline', taskId] });
    queryClient.invalidateQueries({ queryKey: ['my-tasks'] });

    if (action.includes('DEADLINE') || action.includes('EXTENSION')) {
      const latest = await refetchDeadline();
      const nextDueDate =
        latest.data?.due_date ||
        latest.data?.dueDate ||
        message?.deadline?.due_date ||
        message?.deadline?.dueDate ||
        message?.new_due_date ||
        message?.newDueDate;

      if (nextDueDate) {
        setEditDueDate(new Date(nextDueDate));
        setLocalTask((prev) => prev ? ({ ...prev, due_date: nextDueDate, dueDate: nextDueDate } as any) : prev);
      }

      if (action === 'EXTENSION_APPROVED') {
        setIsExtensionFormOpen(false);
        setRequestedDueDate(null);
        setExtensionReason('');
        setShowRejectInput(false);
        setExtensionMessage({ type: 'success', text: 'Yêu cầu dời deadline đã được duyệt và đồng bộ realtime.' });
      } else if (action === 'EXTENSION_REJECTED' || action === 'EXTENSION_AUTO_REJECTED') {
        setIsExtensionFormOpen(false);
        setShowRejectInput(false);
        setExtensionMessage({
          type: 'error',
          text: action === 'EXTENSION_AUTO_REJECTED'
            ? 'Yêu cầu dời deadline đã bị hệ thống tự động từ chối.'
            : 'Yêu cầu dời deadline đã bị từ chối.'
        });
      } else if (action === 'EXTENSION_REQUESTED') {
        setIsExtensionFormOpen(false);
        setExtensionMessage({ type: 'success', text: 'Yêu cầu dời deadline đang chờ duyệt và đã được đồng bộ realtime.' });
      }
    }
  }, 0);

  useEffect(() => {
    if (isOpen && localTask) {
      setEditTitle(localTask.title || '');
      setEditDesc(localTask.description || '');
      setEditPriority(localTask.priority ? String(localTask.priority).toUpperCase() : 'MEDIUM');
      setEditColumnId(listId);
      setEditStoryPoints(localTask.story_points || localTask.story_point || localTask.storyPoint || 0);
      setEditStartDate(localTask.start_date || localTask.startDate ? new Date(localTask.start_date || localTask.startDate || '') : null);
      setEditDueDate(localTask.due_date || localTask.dueDate ? new Date(localTask.due_date || localTask.dueDate || '') : null);
      setIsDone(localTask.status === 'DONE' || localTask.is_done || localTask.isDone || false);

      const assigneesList = localTask.assignees_user_id || localTask.assigneesUserId || localTask.assignees || [];
      const normalizedIds = assigneesList
        .map((item: any) => typeof item === 'object' ? item.user_id || item.id || item._id : item)
        .filter((id: any) => id !== undefined && id !== null && String(id) !== 'undefined' && String(id) !== '')
        .map((id: any) => String(id));

      setEditAssignees(normalizedIds);
      setIsSaving(false);
      setIsAssigneePopupOpen(false);
      setIsCommentPanelOpen(initialOpenComments);
      setNewComment('');
      setIsExtensionFormOpen(false);
      setRequestedDueDate(null);
      setExtensionReason('');
      setExtensionMessage(null);
      setShowRejectInput(false);
      setRejectReasonManager('');
    }
  }, [isOpen, localTask?.id, localTask?._id, listId, initialOpenComments]);

  const toggleAssignee = (userId: string) => {
    if (!userId || userId.startsWith('temp-') || userId === 'undefined') return;
    setEditAssignees((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  const syncBoardAfterTaskMutation = async () => {
    if (activeBoardId) {
      await queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(activeBoardId) });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeBoardId || !localTask) return;

    setIsUploading(true);
    try {
      const urls = await getPresignedUrl(file.name, file.type);
      const uploadUrl = urls.uploadUrl || urls.upload_url || urls.url;
      const finalPublicUrl = urls.publicUrl || urls.public_url || uploadUrl.split('?')[0];

      await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } });

      await addAttachment({
        taskId,
        boardId: activeBoardId,
        payload: {
          file_name: file.name,
          file_url: finalPublicUrl,
          content_type: file.type,
          file_size: file.size
        }
      });

      await syncBoardAfterTaskMutation();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Lỗi upload:', error);
      alert('Tải lên thất bại. Vui lòng thử lại!');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!activeBoardId || !board) return;
    setIsSaving(true);

    const cleanAssignees = editAssignees.filter((id) => id && id !== 'undefined' && !id.startsWith('temp-'));

    let finalStartDate = null;
    if (editStartDate) {
      finalStartDate = new Date(editStartDate);
      finalStartDate.setHours(12, 0, 0, 0); 
    }

    let finalDueDate = null;
    if (editDueDate) {
      finalDueDate = new Date(editDueDate);
      finalDueDate.setHours(23, 59, 59, 999); 
    }

    try {
      const updated = await updateApiTask({
        taskId,
        boardId: activeBoardId,
        updateData: {
          title: editTitle.trim() || 'Công việc không tên',
          description: editDesc,
          priority: editPriority ? editPriority.toUpperCase() : 'MEDIUM',
          status: isDone ? 'DONE' : (localTask?.status === 'DONE' ? 'TODO' : localTask?.status || 'TODO'),
          story_point: Number(editStoryPoints) || 0,
          start_date: finalStartDate ? finalStartDate.toISOString() : null, 
          due_date: finalDueDate ? finalDueDate.toISOString() : null,       
          assignees_user_id: cleanAssignees,
          column_id: String(editColumnId),
          parent_task_id: localTask?.parent_task_id || localTask?.parentTaskId
        }
      });

      setLocalTask(updated);
      await refetchDeadline();
      onClose();
      await syncBoardAfterTaskMutation(); 
    } catch (error) {
      console.error('Lỗi khi cập nhật công việc:', error);
      alert('Lưu thất bại! Vui lòng kiểm tra lại dữ liệu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeBoardId) return;

    if (window.confirm(`Bạn có chắc muốn xóa công việc "${localTask?.title}"?`)) {
      try {
        await deleteApiTask({ taskId, boardId: activeBoardId });
        onClose();
      } catch (error) {
        console.error('Lỗi khi xóa công việc:', error);
      }
    }
  };

  const handleToggleSubtask = async (subtask: Task) => {
    if (!activeBoardId) return;

    const subtaskId = String(subtask.id || subtask._id);
    const newStatus = (subtask.status === 'DONE' || subtask.is_done) ? 'TODO' : 'DONE';
    const rawAssignees = subtask.assignees_user_id || subtask.assigneesUserId || subtask.assignees || [];
    const cleanSubAssignees = rawAssignees
      .map((item: any) => typeof item === 'object' ? item.user_id || item.id || item._id : item)
      .filter((id: any) => id && String(id) !== 'undefined' && !String(id).startsWith('temp-'))
      .map((id: any) => String(id));

    try {
      await updateApiTask({
        taskId: subtaskId,
        boardId: activeBoardId,
        updateData: {
          title: subtask.title,
          description: subtask.description || '',
          priority: subtask.priority ? String(subtask.priority).toUpperCase() : 'MEDIUM',
          status: newStatus,
          story_point: Number(subtask.story_point || subtask.story_points || subtask.storyPoint) || 0,
          start_date: subtask.start_date || subtask.startDate || null,
          due_date: subtask.due_date || subtask.dueDate || null,
          assignees_user_id: cleanSubAssignees,
          column_id: String(listId),
          parent_task_id: taskId
        }
      });

      await syncBoardAfterTaskMutation();
    } catch (error) {
      console.error('Lỗi khi cập nhật việc con:', error);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !activeBoardId) return;

    try {
      await createApiTask({
        boardId: activeBoardId,
        taskData: {
          title: newSubtaskTitle.trim(),
          description: '',
          priority: 'MEDIUM',
          status: 'TODO',
          story_point: 0,
          assignees_user_id: [],
          column_id: String(listId),
          parent_task_id: taskId
        }
      });

      setNewSubtaskTitle('');
      await syncBoardAfterTaskMutation();
    } catch (error) {
      console.error('Lỗi tạo việc con:', error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!activeBoardId || String(subtaskId) === 'undefined' || String(subtaskId).startsWith('temp-')) return;

    try {
      await deleteApiTask({ taskId: subtaskId, boardId: activeBoardId });
      await syncBoardAfterTaskMutation();
    } catch (error) {
      console.error('Lỗi xóa việc con:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!activeBoardId || !newComment.trim()) return;

    setIsCommentSubmitting(true);
    try {
      const updatedTask = await addComment({ taskId, boardId: activeBoardId, content: newComment.trim() });
      if (updatedTask) setLocalTask((prev) => ({ ...(prev || localTask), ...updatedTask } as any));
      setNewComment('');
      setIsCommentPanelOpen(true);
      await syncBoardAfterTaskMutation();
    } catch (error) {
      console.error('Lỗi thêm bình luận:', error);
      alert('Không thể thêm bình luận. Vui lòng thử lại.');
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const handleResolveComment = async (commentId: string) => {
    if (!activeBoardId || !commentId) return;

    setResolvingCommentId(commentId);
    try {
      setLocalTask((prev) => {
        if (!prev) return prev;
        return { ...prev, comments: (prev.comments || []).filter((comment) => getCommentId(comment) !== commentId) };
      });

      const updatedTask = await resolveComment({ taskId, boardId: activeBoardId, commentId });
      if (updatedTask) setLocalTask((prev) => ({ ...(prev || localTask), ...updatedTask } as any));
      await syncBoardAfterTaskMutation();
    } catch (error) {
      console.error('Lỗi giải quyết bình luận:', error);
      alert('Không thể giải quyết bình luận. Vui lòng thử lại.');
      await syncBoardAfterTaskMutation();
    } finally {
      setResolvingCommentId(null);
    }
  };

  const handleRequestDeadlineExtension = async () => {
    if (!activeBoardId) return;

    setExtensionMessage(null);

    if (!canRequestExtensionByRole) {
      setExtensionMessage({ type: 'error', text: 'Role PM/Project Admin/Admin/System Admin không tự gửi yêu cầu dời deadline. Manager vẫn có thể gửi nếu đang là người được giao task.' });
      return;
    }

    if (isExtensionPending) {
      setExtensionMessage({ type: 'error', text: 'Công việc này đang có yêu cầu dời deadline chờ duyệt.' });
      return;
    }

    if (!taskDueDate) {
      setExtensionMessage({ type: 'error', text: 'Công việc này chưa có deadline nên không thể xin dời hạn.' });
      return;
    }

    if (!requestedDueDate) {
      setExtensionMessage({ type: 'error', text: 'Vui lòng chọn deadline mới.' });
      return;
    }

    const finalRequestedDate = new Date(requestedDueDate);
    finalRequestedDate.setHours(23, 59, 59, 999);

    if (finalRequestedDate.getTime() <= taskDueDate.getTime()) {
      setExtensionMessage({ type: 'error', text: 'Deadline mới phải sau deadline hiện tại.' });
      return;
    }

    if (!extensionReason.trim()) {
      setExtensionMessage({ type: 'error', text: 'Vui lòng nhập lý do xin dời deadline.' });
      return;
    }

    setIsRequestingExtension(true);
    try {
      await requestDeadlineExtension({
        taskId,
        boardId: activeBoardId,
        requestedDueDate: finalRequestedDate.toISOString(),
        reason: extensionReason.trim()
      });

      setExtensionMessage({ type: 'success', text: 'Đã gửi yêu cầu dời deadline tới người tạo task hoặc quản lý.' });
      setRequestedDueDate(null);
      setExtensionReason('');
      setIsExtensionFormOpen(false);
      await refetchDeadline();
      await syncBoardAfterTaskMutation();
    } catch (error: any) {
      console.error('Lỗi xin dời deadline:', error);
      setExtensionMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Không thể gửi yêu cầu dời deadline. Vui lòng thử lại.'
      });
    } finally {
      setIsRequestingExtension(false);
    }
  };

  const handleApproveExtension = async () => {
    if (!activeBoardId) return;
    setIsApproving(true);
    try {
      await approveExtension({ taskId, boardId: activeBoardId });
      await refetchDeadline();
      await syncBoardAfterTaskMutation();
      setExtensionMessage({ type: 'success', text: 'Đã phê duyệt dời deadline thành công!' });
      
      if (pendingRequestedDate) {
        setEditDueDate(new Date(pendingRequestedDate));
        setLocalTask((prev) => prev ? ({ ...prev, due_date: pendingRequestedDate, dueDate: pendingRequestedDate } as any) : prev);
      }
    } catch (error: any) {
      console.error('Lỗi duyệt deadline:', error);
      setExtensionMessage({ type: 'error', text: error?.response?.data?.message || 'Lỗi khi duyệt yêu cầu.' });
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectExtension = async () => {
    if (!activeBoardId) return;
    if (!rejectReasonManager.trim()) {
      setExtensionMessage({ type: 'error', text: 'Vui lòng nhập lý do từ chối.' });
      return;
    }
    setIsRejecting(true);
    try {
      await rejectExtension({ taskId, boardId: activeBoardId, rejectReason: rejectReasonManager.trim() });
      await refetchDeadline();
      await syncBoardAfterTaskMutation();
      setShowRejectInput(false);
      setRejectReasonManager('');
      setExtensionMessage({ type: 'success', text: 'Đã từ chối yêu cầu dời deadline.' });
    } catch (error: any) {
      console.error('Lỗi từ chối deadline:', error);
      setExtensionMessage({ type: 'error', text: error?.response?.data?.message || 'Lỗi khi từ chối yêu cầu.' });
    } finally {
      setIsRejecting(false);
    }
  };

  if (!isOpen || !localTask) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 md:p-12">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

      <div className={`relative w-full ${isCommentPanelOpen ? 'max-w-[1380px]' : 'max-w-[1100px]'} bg-slate-50/95 backdrop-blur-xl rounded-2xl md:rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col max-h-[90vh] md:max-h-[95vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-white/50`}>
        
        {/* Header Responsive */}
        <div className="bg-white/80 backdrop-blur-sm px-4 py-3 md:px-6 md:py-4 border-b border-slate-200/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-6 sticky top-0 z-20 shrink-0">
          <div className="flex-1 w-full min-w-0">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-lg md:text-2xl font-extrabold text-slate-800 bg-transparent border-2 border-transparent hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 rounded-xl px-2 py-1 md:px-3 md:py-1.5 outline-none transition-all placeholder:text-slate-300 truncate"
              placeholder="Nhập tên công việc..."
            />
            <p className="text-[11px] md:text-[13px] text-slate-500 px-2 md:px-3 mt-1 font-medium flex items-center gap-1.5 flex-wrap">
              Vị trí hiện tại:
              <span className="font-bold px-1.5 md:px-2 py-0.5 rounded-md border border-slate-200/60 bg-indigo-50 text-indigo-700 max-w-[150px] md:max-w-[200px] truncate">
                {board?.columns?.find((c: any) => String(c.id || c._id) === String(editColumnId))?.list_name || 'Không rõ'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setIsCommentPanelOpen((prev) => !prev)}
              className={`relative flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl text-[12px] md:text-sm font-bold transition-all border shrink-0 ${isCommentPanelOpen ? 'bg-violet-50 text-violet-600 border-violet-200 ring-2 ring-violet-100' : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600'}`}
            >
              <MessageSquare size={16} className="w-4 h-4 md:w-[18px] md:h-[18px]" />
              <span className="inline">Bình luận</span>
              {taskComments.length > 0 && <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-violet-600 text-white text-[10px]">{taskComments.length}</span>}
            </button>

            <button
              type="button"
              onClick={() => setIsDone(!isDone)}
              className={`flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl text-[12px] md:text-sm font-bold transition-all border shrink-0 ${isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm ring-2 ring-emerald-100 ring-offset-1' : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-300 hover:text-emerald-500'}`}
            >
              <CheckSquare size={16} className={`w-4 h-4 md:w-[18px] md:h-[18px] ${isDone ? 'text-emerald-500' : 'text-slate-300'}`} />
              <span className="inline">{isDone ? 'Đã hoàn thành' : 'Đánh dấu xong'}</span>
            </button>

            <button type="button" onClick={onClose} className="p-1.5 md:p-2.5 ml-auto bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-lg md:rounded-full transition-all shrink-0">
              <X size={18} className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Bọc nội dung có thể cuộn dọc hoàn toàn trên Mobile, hoặc tách 2 scroll độc lập trên PC */}
        <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row">
          
          <div className="flex-1 md:overflow-y-auto custom-scrollbar p-3 md:p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row gap-5 lg:gap-10">
              {/* CỘT TRÁI */}
              <div className="flex-1 flex flex-col gap-5 md:gap-8 min-w-0">
                <section>
                  <div className="flex items-center gap-2 md:gap-2.5 text-slate-800 mb-2 md:mb-4 font-bold text-[15px] md:text-lg">
                    <div className="p-1.5 md:p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0"><AlignLeft size={16} className="md:w-[18px] md:h-[18px]" /></div>
                    <h3 className="truncate">Mô tả chi tiết</h3>
                  </div>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Thêm mô tả chi tiết hơn cho công việc này..."
                    className="w-full min-h-[100px] md:min-h-[140px] p-3.5 md:p-5 bg-white border border-slate-200/80 rounded-xl md:rounded-2xl text-[13px] md:text-[15px] leading-relaxed text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all resize-y custom-scrollbar shadow-sm"
                  />
                </section>

                <section>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2 md:mb-4">
                    <div className="flex items-center gap-2 md:gap-2.5 text-slate-800 font-bold text-[15px] md:text-lg">
                      <div className="p-1.5 md:p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0"><Paperclip size={16} className="md:w-[18px] md:h-[18px]" /></div>
                      <h3 className="truncate">Tài liệu đính kèm</h3>
                      <span className="ml-1 md:ml-1.5 text-[10px] md:text-xs font-black bg-slate-200 text-slate-600 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">{taskAttachments.length}</span>
                    </div>

                    <div>
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg md:rounded-xl text-[12px] md:text-sm font-bold transition-all shadow-sm disabled:opacity-50"
                      >
                        {isUploading ? <Loader2 size={14} className="md:w-4 md:h-4 animate-spin text-indigo-500" /> : <Plus size={14} className="md:w-4 md:h-4" />}
                        {isUploading ? 'Đang tải...' : 'Thêm file'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
                    {taskAttachments.length === 0 ? (
                      <div className="col-span-full p-4 md:p-6 border-2 border-dashed border-slate-200 rounded-xl md:rounded-[1.5rem] text-center text-[12px] md:text-sm font-medium text-slate-400 bg-slate-50/30">
                        Chưa có file nào. Hãy nhấn "Thêm file" để nộp tài liệu.
                      </div>
                    ) : (
                      taskAttachments.map((file, idx) => (
                        <div
                          key={file.attachment_id || file.id || idx}
                          className="flex items-center gap-2.5 md:gap-3 p-2.5 md:p-3.5 bg-white border border-slate-200 rounded-xl md:rounded-2xl hover:border-indigo-400 hover:shadow-md transition-all group cursor-pointer"
                          onClick={() => window.open(file.file_url || file.fileUrl, '_blank')}
                        >
                          <div className="w-8 h-8 md:w-11 md:h-11 shrink-0 rounded-lg md:rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm"><File size={16} className="md:w-5 md:h-5" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] md:text-[13px] font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors" title={file.file_name || file.fileName}>
                              {file.file_name || file.fileName}
                            </p>
                            <p className="text-[10px] md:text-[11px] font-medium text-slate-400 mt-0.5 uppercase tracking-tighter">
                              {(file.content_type || file.contentType)?.split('/')[1] || 'FILE'} • {((file.file_size || file.fileSize || 0) / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <div className="w-7 h-7 md:w-8 md:h-8 shrink-0 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all"><Download size={14} className="md:w-4 md:h-4" /></div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 md:gap-2.5 text-slate-800 mb-2 md:mb-4 font-bold text-[15px] md:text-lg">
                    <div className="p-1.5 md:p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0"><CheckSquare size={16} className="md:w-[18px] md:h-[18px]" /></div>
                    <h3 className="truncate">Checklist việc con</h3>
                    <span className="ml-1 md:ml-1.5 text-[10px] md:text-xs font-black bg-slate-200 text-slate-600 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">{(localTask.subtasks || []).length}</span>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-xl md:rounded-2xl p-2 md:p-2.5 shadow-sm">
                    <div className="flex flex-col gap-1 max-h-48 md:max-h-64 overflow-y-auto custom-scrollbar pr-1">
                      {(localTask.subtasks || []).map((st: Task, idx: number) => {
                        const subtaskId = st.id || st._id;
                        return (
                          <div key={`subtask-${subtaskId || idx}`} className="group/st flex items-center gap-2 md:gap-3 p-1.5 md:p-2.5 hover:bg-slate-50/80 rounded-lg md:rounded-xl transition-all border border-transparent hover:border-slate-100">
                            <button type="button" onClick={() => handleToggleSubtask(st)} className="shrink-0 transition-transform active:scale-90">
                              {st.status === 'DONE' ? <CheckSquare size={14} className="md:w-[18px] md:h-[18px] text-emerald-500" /> : <Square size={14} className="md:w-[18px] md:h-[18px] text-slate-300 hover:text-indigo-400 transition-colors" />}
                            </button>
                            <span className={`text-[13px] md:text-[15px] flex-1 truncate ${st.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>{st.title}</span>
                            <button type="button" onClick={() => handleDeleteSubtask(String(subtaskId))} className="opacity-100 md:opacity-0 group-hover/st:opacity-100 p-1 md:p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0">
                              <X size={14} className="md:w-[16px] md:h-[16px]" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-1.5 md:mt-2 p-1 md:p-1.5 pt-2 md:pt-3 border-t border-slate-100 flex items-center gap-2 md:gap-3">
                      <div className="p-1 md:p-1.5 bg-slate-100 rounded-md md:rounded-lg text-slate-400 shrink-0"><Plus size={14} className="md:w-[16px] md:h-[16px]" /></div>
                      <input
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                            e.preventDefault();
                            handleAddSubtask();
                          }
                        }}
                        placeholder="Thêm một việc con..."
                        className="flex-1 text-[13px] md:text-[15px] font-medium bg-transparent outline-none text-slate-700 placeholder:text-slate-400 min-w-0"
                      />
                    </div>
                  </div>
                </section>

              </div>

              {/* CỘT PHẢI (Thuộc tính) */}
              <aside className="w-full lg:w-[260px] xl:w-[280px] flex flex-col gap-4 md:gap-6 shrink-0 mt-2 md:mt-0">
                <div className="bg-white p-3.5 md:p-5 rounded-xl md:rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-3 md:gap-5">
                  <h4 className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 md:gap-2">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-indigo-500 shrink-0" /> Thông số
                  </h4>

                  <div className="flex flex-col gap-1.5 md:gap-2">
                    <label className="text-[12px] md:text-[13px] font-bold text-slate-600 flex items-center gap-1.5 md:gap-2"><KanbanSquare size={14} className="text-slate-400 md:w-[15px] md:h-[15px] shrink-0" /> Cột / Giai đoạn</label>
                    <div className="relative">
                      <select
                        value={editColumnId}
                        onChange={(e) => setEditColumnId(e.target.value)}
                        className="w-full text-[12px] md:text-sm font-bold border border-slate-200/80 rounded-lg md:rounded-xl px-2.5 md:px-3.5 py-2 md:py-2.5 outline-none text-slate-700 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 appearance-none bg-white transition-all shadow-sm"
                      >
                        {board?.columns?.map((col: any, idx: number) => {
                          const colId = col.id || col._id;
                          return <option key={`col-${colId || idx}`} value={String(colId)}>{col.list_name}</option>;
                        })}
                      </select>
                      <div className="absolute right-2 md:right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronDown size={14} className="md:w-4 md:h-4" /></div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:gap-3 mt-1 md:mt-2">
                    <label className="text-[12px] md:text-[13px] font-bold text-slate-600 flex items-center gap-1.5 md:gap-2"><User size={14} className="text-slate-400 md:w-[15px] md:h-[15px] shrink-0" /> Người thực hiện</label>
                    <div className="flex flex-wrap gap-1.5 md:gap-2 relative">
                      {editAssignees.filter((id) => id && id !== 'undefined' && !id.startsWith('temp-')).length > 0 ? (
                        editAssignees.filter((id) => id && id !== 'undefined' && !id.startsWith('temp-')).map((userId, idx) => {
                          const member = getUser(userId, projectId);
                          const displayName = member?.full_name || member?.full_name || 'Không rõ';
                          const avatarUrl = member?.avatar_url || member?.avatar_url;
                          const initial = String(displayName).charAt(0).toUpperCase();

                          return (
                            <div key={`assignee-${userId || idx}`} className="flex items-center gap-1.5 md:gap-2 px-1.5 md:px-2 py-1 md:py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg md:rounded-xl shadow-sm group/name">
                              {avatarUrl ? <img src={avatarUrl} alt={displayName} className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover border border-indigo-200 shadow-sm shrink-0" /> : <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] md:text-[10px] font-black text-white shadow-sm shrink-0">{initial}</div>}
                              <span className="text-[11px] md:text-[12px] font-bold text-indigo-700 pr-0.5 md:pr-1 truncate max-w-[80px] md:max-w-[120px]">{displayName}</span>
                              <button type="button" onClick={() => toggleAssignee(userId)} className="opacity-100 md:opacity-0 group-hover/name:opacity-100 p-0.5 hover:bg-indigo-200 rounded-full transition-all text-indigo-400 hover:text-indigo-600 shrink-0">
                                <X size={10} />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <span className="w-full text-[11px] md:text-[13px] text-slate-400 italic bg-slate-50 px-2 md:px-3.5 py-2 md:py-2.5 rounded-lg md:rounded-xl border border-slate-200 border-dashed font-medium text-center">Chưa có ai nhận việc</span>
                      )}

                      <button
                        type="button"
                        onClick={() => setIsAssigneePopupOpen(!isAssigneePopupOpen)}
                        className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-[10px] md:text-[12px]"
                      >
                        <Plus size={12} className="md:w-3.5 md:h-3.5 shrink-0" /> <span>Thêm người</span>
                      </button>

                      {/* Dropdown Fix Overflow cho Điện thoại */}
                      {isAssigneePopupOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsAssigneePopupOpen(false)} />
                          <div className="absolute top-full mt-1.5 md:mt-2 left-0 w-[calc(100vw-3rem)] sm:w-64 md:w-72 md:left-auto md:right-0 bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-1.5 md:p-2 max-h-48 md:max-h-60 overflow-y-auto custom-scrollbar">
                            <h5 className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Thành viên dự án</h5>
                            {isMembersLoading ? (
                              <div className="text-[11px] md:text-xs text-center text-slate-400 p-2 md:p-3 italic">Đang tải danh sách...</div>
                            ) : projectMembers.length > 0 ? (
                              projectMembers.map((member: any) => {
                                const rawId = member.user_id || member.id || member._id;
                                if (!rawId) return null;

                                const safeMemberId = String(rawId);
                                const isSelected = editAssignees.includes(safeMemberId);
                                const displayName = member.full_name || member.fullName || member.name || 'Không rõ';
                                const initial = String(displayName).charAt(0).toUpperCase();

                                return (
                                  <div
                                    key={`member-${safeMemberId}`}
                                    onClick={() => toggleAssignee(safeMemberId)}
                                    className={`flex items-center justify-between p-1.5 md:p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-slate-50'}`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                      {member.avatar_url || member.avatarUrl ? (
                                        <img src={member.avatar_url || member.avatarUrl} className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover shrink-0" alt={displayName} />
                                      ) : (
                                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-600 shrink-0">{initial}</div>
                                      )}
                                      <span className={`text-[12px] md:text-[13px] truncate ${isSelected ? 'font-bold text-indigo-700' : 'font-medium text-slate-700'}`}>{displayName}</span>
                                    </div>
                                    {isSelected && <Check size={14} className="md:w-4 md:h-4 text-indigo-600 shrink-0" />}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-[11px] md:text-xs text-center text-slate-400 p-2 md:p-3 italic">Dự án chưa có thành viên nào.</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4 mt-1 md:mt-0">
                    <div className="flex flex-col gap-1.5 md:gap-2">
                      <label className="text-[12px] md:text-[13px] font-bold text-slate-600 flex items-center gap-1.5 md:gap-2"><Flag size={14} className="text-slate-400 md:w-[15px] md:h-[15px] shrink-0" /> Mức ưu tiên</label>
                      <div className="relative">
                        <select
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value)}
                          className="w-full text-[12px] md:text-sm font-bold border border-slate-200/80 rounded-lg md:rounded-xl px-2.5 md:px-3.5 py-2 md:py-2.5 outline-none text-slate-700 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 appearance-none bg-white transition-all shadow-sm"
                        >
                          <option value="LOW">Low (Thấp)</option>
                          <option value="MEDIUM">Medium (Trung bình)</option>
                          <option value="HIGH">High (Cao)</option>
                          <option value="CRITICAL">Critical (Khẩn cấp)</option>
                        </select>
                        <div className="absolute right-2 md:right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronDown size={14} className="md:w-4 md:h-4" /></div>
                      </div>
                      <span className={`w-fit text-[10px] md:text-[11px] font-black px-2 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg mt-0.5 md:mt-1 ${priorityColors[editPriority] || priorityColors.MEDIUM}`}>{editPriority}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 md:gap-2">
                      <label className="text-[12px] md:text-[13px] font-bold text-slate-600 flex items-center gap-1.5 md:gap-2"><Target size={14} className="text-slate-400 md:w-[15px] md:h-[15px] shrink-0" /> Story Points</label>
                      <input
                        type="number"
                        min="0"
                        value={editStoryPoints}
                        onChange={(e) => setEditStoryPoints(e.target.value)}
                        className="w-full text-[12px] md:text-sm font-black text-indigo-600 border border-slate-200/80 rounded-lg md:rounded-xl px-2.5 md:px-3.5 py-2 md:py-2.5 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all bg-white shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3.5 md:p-5 rounded-xl md:rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-3 md:gap-5">
                  <h4 className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 md:gap-2">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 shrink-0" /> Thời gian
                  </h4>

                  <div className="flex flex-col gap-1.5 md:gap-2 relative w-full">
                    <label className="text-[12px] md:text-[13px] font-bold text-slate-600 flex items-center gap-1.5 md:gap-2"><Calendar size={14} className="text-slate-400 md:w-[15px] md:h-[15px] shrink-0" /> Bắt đầu</label>
                    <div className="w-full"><DatePicker selected={editStartDate} onChange={(date: Date | null) => setEditStartDate(date)} selectsStart startDate={editStartDate} endDate={editDueDate} locale="vi" dateFormat="dd/MM/yyyy" placeholderText="Chưa chọn ngày" customInput={<CustomDateInput />} isClearable wrapperClassName="w-full" /></div>
                  </div>

                  <div className="flex flex-col gap-1.5 md:gap-2 relative w-full">
                    <label className="text-[12px] md:text-[13px] font-bold text-slate-600 flex items-center gap-1.5 md:gap-2"><Calendar size={14} className="text-slate-400 md:w-[15px] md:h-[15px] shrink-0" /> Kết thúc</label>
                    <div className="w-full"><DatePicker selected={editDueDate} onChange={(date: Date | null) => setEditDueDate(date)} selectsEnd startDate={editStartDate} endDate={editDueDate} minDate={editStartDate || undefined} locale="vi" dateFormat="dd/MM/yyyy" placeholderText="Chưa chọn ngày" customInput={<CustomDateInput />} isClearable wrapperClassName="w-full" /></div>
                  </div>

                  <div className="flex flex-col gap-1.5 md:gap-2 pt-0.5 md:pt-1">
                    <label className="text-[12px] md:text-[13px] font-bold text-slate-600 flex items-center gap-1.5 md:gap-2"><Clock size={14} className="text-slate-400 md:w-[15px] md:h-[15px] shrink-0" /> Thời lượng dự kiến</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={calculatedDays}
                        readOnly
                        title="Tính tự động dựa trên ngày bắt đầu và kết thúc"
                        className="w-full text-[12px] md:text-sm font-black text-amber-700 border border-amber-200/60 rounded-lg md:rounded-xl px-2.5 md:px-3.5 py-2 md:py-2.5 outline-none bg-amber-50/50 cursor-not-allowed transition-all"
                      />
                      <span className="absolute right-2 md:right-3.5 top-1/2 -translate-y-1/2 text-[9px] md:text-[11px] font-bold text-amber-600 bg-amber-100/80 px-1.5 md:px-2 py-0.5 rounded-md">Ngày</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3.5 md:p-5 rounded-xl md:rounded-2xl border border-amber-200/70 shadow-sm flex flex-col gap-3 md:gap-4 mb-4 md:mb-0">
                  <div>
                    <h4 className="text-[10px] md:text-[11px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5 md:gap-2">
                      <CalendarPlus size={14} className="md:w-4 md:h-4 shrink-0" /> Xin dời deadline
                    </h4>
                    <p className="text-[11px] md:text-xs text-slate-500 mt-1.5 md:mt-2">
                      Deadline hiện tại: <span className="font-bold text-slate-700">{formatDateTime(taskDueDateValue)}</span>
                    </p>
                  </div>

                  {extensionStatus === 'APPROVED' && (
                    <div className="rounded-lg md:rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 md:p-3 text-[11px] md:text-xs text-emerald-700 font-bold flex gap-1.5 md:gap-2">
                      <CheckCircle2 size={14} className="md:w-4 md:h-4 shrink-0" />
                      Yêu cầu dời deadline gần nhất đã được đồng ý.
                    </div>
                  )}

                  {extensionStatus === 'REJECTED' && (
                    <div className="rounded-lg md:rounded-xl bg-rose-50 border border-rose-200 p-2.5 md:p-3 text-[11px] md:text-xs text-rose-700 font-bold flex gap-1.5 md:gap-2">
                      <XCircle size={14} className="md:w-4 md:h-4 shrink-0" />
                      Yêu cầu dời deadline gần nhất đã bị từ chối{extensionRejectReason ? `: ${extensionRejectReason}` : '.'}
                    </div>
                  )}

                  {isExtensionPending && (
                    <div className="rounded-lg md:rounded-xl bg-amber-50 border border-amber-200 p-2.5 md:p-3 text-[11px] md:text-xs text-amber-800 font-semibold space-y-1.5 md:space-y-2">
                      <div className="flex gap-1.5 md:gap-2">
                        <Clock size={14} className="md:w-4 md:h-4 shrink-0 text-amber-600" />
                        <span className="font-black">Yêu cầu dời deadline đang chờ duyệt.</span>
                      </div>
                      <div>Deadline đề xuất: <b>{formatDateTime(pendingRequestedDate)}</b></div>
                      {extensionReasonFromServer && <div>Lý do: <b>{extensionReasonFromServer}</b></div>}
                      {extensionRequestedAt && <div>Đã gửi lúc: <b>{formatDateTime(extensionRequestedAt)}</b></div>}
                      {extensionExpiresAt && <div>Tự từ chối sau: <b>{formatDateTime(extensionExpiresAt)}</b></div>}
                      
                      {canReviewExtension && (
                        <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-amber-200/50 space-y-1.5 md:space-y-2">
                          {!showRejectInput ? (
                            <div className="flex flex-col sm:flex-row gap-2 mt-1.5 md:mt-2">
                              <button
                                type="button"
                                onClick={() => setShowRejectInput(true)}
                                className="flex-1 w-full px-3 py-2.5 md:py-2 bg-white border border-rose-200 text-rose-600 text-[11px] md:text-xs rounded-lg hover:bg-rose-50 font-bold transition-all text-center"
                              >
                                Từ chối
                              </button>
                              <button
                                type="button"
                                onClick={handleApproveExtension}
                                disabled={isApproving}
                                className="flex-1 w-full px-3 py-2.5 md:py-2 bg-emerald-500 text-white text-[11px] md:text-xs rounded-lg hover:bg-emerald-600 flex justify-center items-center gap-1.5 md:gap-2 font-bold shadow-sm transition-all"
                              >
                                {isApproving && <Loader2 size={12} className="md:w-3.5 md:h-3.5 animate-spin" />}
                                Phê duyệt
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1.5 md:space-y-2 mt-1.5 md:mt-2 animate-in fade-in zoom-in-95 duration-200">
                              <input
                                type="text"
                                value={rejectReasonManager}
                                onChange={(e) => setRejectReasonManager(e.target.value)}
                                placeholder="Nhập lý do từ chối..."
                                className="w-full px-2.5 md:px-3 py-2 md:py-2 rounded-lg border border-rose-200 outline-none focus:border-rose-400 text-[11px] md:text-xs text-slate-700"
                              />
                              <div className="flex flex-col sm:flex-row gap-2">
                                <button type="button" onClick={() => setShowRejectInput(false)} className="w-full sm:w-auto px-3 py-2.5 md:py-2 text-slate-500 text-[11px] md:text-xs hover:bg-slate-100 rounded-lg font-bold text-center">Hủy</button>
                                <button type="button" onClick={handleRejectExtension} disabled={isRejecting} className="flex-1 w-full px-3 py-2.5 md:py-2 bg-rose-500 text-white text-[11px] md:text-xs rounded-lg hover:bg-rose-600 flex justify-center items-center gap-1.5 md:gap-2 font-bold shadow-sm">
                                  {isRejecting && <Loader2 size={12} className="md:w-3.5 md:h-3.5 animate-spin" />}
                                  Xác nhận từ chối
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {canReviewExtension && !isExtensionPending && (
                    <div className="rounded-lg md:rounded-xl bg-slate-50 border border-slate-200 p-2.5 md:p-3 text-[11px] md:text-xs text-slate-500 font-semibold flex gap-1.5 md:gap-2">
                      <ShieldAlert size={14} className="md:w-4 md:h-4 text-slate-400 shrink-0" />
                      Bạn có quyền quản lý công việc này.
                    </div>
                  )}

                  {!taskDueDate ? (
                    <div className="rounded-lg md:rounded-xl bg-slate-50 border border-slate-200 p-2.5 md:p-3 text-[11px] md:text-xs text-slate-500 font-semibold flex gap-1.5 md:gap-2">
                      <AlertTriangle size={14} className="md:w-4 md:h-4 text-slate-400 shrink-0" />
                      Công việc chưa có deadline nên chưa thể xin dời hạn.
                    </div>
                  ) : canRequestExtensionByRole && !isExtensionPending ? (
                    <>
                      {!isExtensionFormOpen ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsExtensionFormOpen(true);
                            setExtensionMessage(null);
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-2.5 rounded-xl bg-amber-500 text-white text-[12px] md:text-sm font-bold hover:bg-amber-600 transition-colors"
                        >
                          <CalendarPlus size={15} className="md:w-[17px] md:h-[17px]" />
                          Xin dời deadline
                        </button>
                      ) : (
                        <div className="space-y-2.5 md:space-y-3">
                          <div className="flex flex-col gap-1.5 md:gap-2 w-full">
                            <label className="text-[11px] md:text-xs font-bold text-slate-600">Deadline mới</label>
                            <div className="w-full">
                              <DatePicker
                                selected={requestedDueDate}
                                onChange={(date: Date | null) => setRequestedDueDate(date)}
                                minDate={taskDueDate || undefined}
                                locale="vi"
                                dateFormat="dd/MM/yyyy"
                                placeholderText="Chọn ngày mới"
                                customInput={<CustomDateInput />}
                                isClearable
                                wrapperClassName="w-full"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5 md:gap-2">
                            <label className="text-[11px] md:text-xs font-bold text-slate-600">Lý do</label>
                            <textarea
                              value={extensionReason}
                              onChange={(e) => setExtensionReason(e.target.value)}
                              placeholder="Nhập lý do cần dời deadline..."
                              className="w-full min-h-[70px] md:min-h-[90px] rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 px-2.5 md:px-3 py-2 md:py-2.5 text-[12px] md:text-sm text-slate-700 outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100 resize-none"
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsExtensionFormOpen(false);
                                setRequestedDueDate(null);
                                setExtensionReason('');
                                setExtensionMessage(null);
                              }}
                              className="w-full sm:flex-1 px-3 py-2.5 md:py-2.5 rounded-lg md:rounded-xl bg-slate-100 text-slate-600 text-[12px] md:text-sm font-bold hover:bg-slate-200 text-center"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={handleRequestDeadlineExtension}
                              disabled={isRequestingExtension}
                              className="w-full sm:flex-1 px-3 py-2.5 md:py-2.5 rounded-lg md:rounded-xl bg-amber-500 text-white text-[12px] md:text-sm font-bold hover:bg-amber-600 disabled:opacity-60 inline-flex items-center justify-center gap-1.5 md:gap-2"
                            >
                              {isRequestingExtension && <Loader2 size={14} className="md:w-[15px] md:h-[15px] animate-spin" />}
                              Gửi
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}

                  {extensionMessage && (
                    <div className={`rounded-lg md:rounded-xl border p-2.5 md:p-3 text-[11px] md:text-xs font-bold ${extensionMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                      {extensionMessage.text}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>

          {/* Panel Comment - Sẽ trượt xuống thay vì ép ngang trên mobile */}
          {isCommentPanelOpen && (
            <aside className="w-full md:w-[360px] lg:w-[400px] shrink-0 border-t md:border-t-0 md:border-l border-slate-200 bg-white/95 flex flex-col h-[60vh] md:h-auto md:max-h-full">
              <div className="px-4 md:px-5 py-3 md:py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-[15px] md:text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <MessageSquare size={16} className="md:w-[18px] md:h-[18px] text-violet-600" />
                    Bình luận
                  </h3>
                  <p className="text-[10px] md:text-[11px] text-slate-400 font-semibold mt-0.5">{taskComments.length} bình luận đang mở</p>
                </div>
                <button type="button" onClick={() => setIsCommentPanelOpen(false)} className="p-1.5 md:p-2 rounded-lg md:rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0">
                  <X size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 space-y-2.5 md:space-y-3 bg-slate-50/30">
                {taskComments.length === 0 ? (
                  <div className="h-full min-h-[150px] md:min-h-[260px] flex flex-col items-center justify-center text-center text-slate-400">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center mb-2 md:mb-3">
                      <MessageSquare size={18} className="text-violet-300 md:w-6 md:h-6" />
                    </div>
                    <p className="text-[13px] md:text-sm font-bold text-slate-500">Chưa có bình luận</p>
                  </div>
                ) : (
                  taskComments.map((comment) => {
                    const commentId = getCommentId(comment);
                    const authorName = getCommentAuthorName(comment);
                    const avatarUrl = getCommentAvatar(comment);
                    const initial = authorName.charAt(0).toUpperCase();

                    return (
                      <div key={commentId} className="group/comment rounded-xl md:rounded-2xl border border-slate-200 bg-white p-2.5 md:p-3.5 hover:border-violet-200 hover:bg-violet-50/30 transition-colors shadow-sm">
                        <div className="flex items-start gap-2 md:gap-3">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={authorName} className="w-7 h-7 md:w-9 md:h-9 rounded-full object-cover border border-white shadow-sm shrink-0" />
                          ) : (
                            <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] md:text-[11px] font-black shadow-sm shrink-0">{initial}</div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-1.5 md:gap-2">
                              <div className="min-w-0 pr-1">
                                <p className="text-[12px] md:text-[13px] font-extrabold text-slate-800 truncate">{authorName}</p>
                                <p className="text-[9px] md:text-[10px] font-semibold text-slate-400">{formatDateTime(getCommentCreatedAt(comment))}</p>
                              </div>

                              <button
                                type="button"
                                disabled={resolvingCommentId === commentId}
                                onClick={() => handleResolveComment(commentId)}
                                className="p-1 md:p-1.5 rounded-md md:rounded-lg bg-slate-50 border border-slate-100 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all disabled:opacity-60 shrink-0"
                                title="Đánh dấu đã giải quyết"
                              >
                                {resolvingCommentId === commentId ? <Loader2 size={12} className="md:w-3.5 md:h-3.5 animate-spin" /> : <CheckCircle2 size={12} className="md:w-3.5 md:h-3.5" />}
                              </button>
                            </div>

                            <p className="mt-1 md:mt-1.5 text-[12px] md:text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 md:p-4 border-t border-slate-100 bg-white shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.05)] shrink-0">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                  placeholder="Nhập bình luận..."
                  className="w-full min-h-[60px] md:min-h-[80px] rounded-xl md:rounded-2xl border border-slate-200 bg-slate-50/60 px-3 md:px-4 py-2 md:py-2.5 text-[13px] md:text-sm text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 resize-none custom-scrollbar"
                />
                <div className="mt-2 md:mt-2.5 flex flex-col sm:flex-row items-center justify-end md:justify-between gap-2.5 md:gap-3">
                  <p className="hidden md:block text-[10px] md:text-[11px] text-slate-400 font-medium">Ctrl + Enter để gửi nhanh</p>
                  <button
                    type="button"
                    onClick={handleSubmitComment}
                    disabled={isCommentSubmitting || !newComment.trim()}
                    className="w-full sm:w-auto inline-flex justify-center items-center gap-1.5 md:gap-2 px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl bg-violet-600 text-white text-[12px] md:text-[13px] font-bold hover:bg-violet-700 disabled:opacity-60 transition-colors"
                  >
                    {isCommentSubmitting ? <Loader2 size={14} className="md:w-4 md:h-4 animate-spin" /> : <Send size={14} className="md:w-4 md:h-4" />} Gửi
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* Footer Responsive - Fixed at Bottom */}
        <div className="bg-white/90 backdrop-blur-md px-4 py-3 md:px-6 md:py-4 border-t border-slate-200/60 flex flex-col md:flex-row justify-between items-center gap-2.5 md:gap-4 z-10 shrink-0">
          <button type="button" onClick={handleDelete} className="w-full md:w-auto order-last md:order-first flex items-center justify-center gap-1.5 md:gap-2 px-4 py-2.5 md:py-2 text-rose-600 hover:bg-rose-50 rounded-lg md:rounded-xl text-[13px] md:text-sm font-bold transition-all border border-slate-200 md:border-transparent hover:border-rose-100 bg-white md:bg-transparent shadow-sm md:shadow-none">
            <Trash2 size={16} className="w-4 h-4 md:w-[18px] md:h-[18px]" /> <span className="inline">Xóa công việc</span>
          </button>

          <div className="flex gap-2.5 md:gap-3 w-full md:w-auto">
            <button type="button" onClick={onClose} className="flex-1 md:flex-none px-4 py-2.5 md:px-6 md:py-2 text-slate-600 hover:text-slate-800 bg-slate-100 border border-slate-200/80 rounded-lg md:rounded-xl text-[13px] md:text-[14px] font-bold transition-all text-center">Đóng</button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 md:flex-none flex justify-center items-center gap-1.5 md:gap-2 px-4 py-2.5 md:px-8 md:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg md:rounded-xl text-[13px] md:text-[14px] font-bold shadow-md md:shadow-lg shadow-indigo-200 disabled:opacity-70 transition-all active:scale-95 border border-indigo-500"
            >
              <Save size={16} className="w-4 h-4 md:w-[18px] md:h-[18px]" /> {isSaving ? 'Lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .react-datepicker-wrapper {
          width: 100%;
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TaskDetailModal;