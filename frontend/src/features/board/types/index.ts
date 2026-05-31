export type PriorityLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL'
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Critical'
  | string;

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | string;

export interface TaskUserSummary {
  id?: string;
  user_id?: string;
  full_name?: string;
  fullName?: string;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  email?: string;
  [key: string]: any;
}

export interface TaskAttachment {
  attachment_id?: string;
  id?: string;
  file_name?: string;
  fileName?: string;
  file_url?: string;
  fileUrl?: string;
  content_type?: string;
  contentType?: string;
  file_size?: number;
  fileSize?: number;
  uploaded_by?: string;
  uploadedBy?: string;
  uploaded_at?: string;
  uploadedAt?: string;
  [key: string]: any;
}

export interface TaskComment {
  id?: string;
  comment_id?: string;
  task_id?: string;
  taskId?: string;
  user_id?: string;
  userId?: string;
  author_id?: string;
  authorId?: string;
  author_name?: string;
  authorName?: string;
  author_avatar_url?: string | null;
  authorAvatarUrl?: string | null;
  content: string;
  is_resolved?: boolean;
  isResolved?: boolean;
  resolved?: boolean;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface Task {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  priority?: PriorityLevel;
  status?: TaskStatus;

  story_points?: number;
  story_point?: number;
  storyPoint?: number;
  estimated_days?: number;
  estimated_date?: string | null;
  estimatedDate?: string | null;

  start_date?: string | null;
  startDate?: string | null;
  due_date?: string | null;
  dueDate?: string | null;

  parent_task_id?: string | null;
  parentTaskId?: string | null;
  column_id?: string;
  columnId?: string;
  board_id?: string;
  boardId?: string;
  project_id?: string;
  projectId?: string;

  assignees_user_id?: string[] | any[];
  assigneesUserId?: string[] | any[];
  assignees?: any[];

  subtasks?: Task[];
  is_done?: boolean;
  isDone?: boolean;

  ai_estimation_reason?: string;
  aiEstimatedReason?: string;
  ai_suggested_points?: number;
  ai_suggested_point?: number;
  aiSuggestedPoint?: number;

  attachments?: TaskAttachment[];
  comments?: TaskComment[];

  author?: TaskUserSummary | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface BoardColumn {
  id?: string;
  _id?: string;
  list_name: string;
  name?: string;
  order?: number;
  tasks: Task[];
  project_id?: string;
  projectId?: string;
}

export interface Board {
  id?: string;
  _id?: string;
  board_name: string;
  name?: string;
  projectId?: string;
  project_id?: string;
  columns: BoardColumn[];
}

export interface ColumnProps {
  list: BoardColumn;
}

export interface TaskItemProps {
  task: Task;
  listId: string;
  isOverlay?: boolean;
  onOpenTaskDetail?: (taskId: string, openCommentPanel?: boolean) => void;
}

export interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  listId: string;
  initialOpenComments?: boolean;
}

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  taskTitle: string;
}