import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boardApi, CreateBoardPayload } from '../api/boardApi';
import { useUserStore } from '../../user/store/useUserStore';
import { Board, Task } from '../types/index';

export const BOARD_QUERY_KEYS = {
  boardsByProject: (projectId: string) => ['boards', 'project', projectId] as const,
  boardDetail: (boardId: string) => ['board', boardId] as const,
  projectMembers: (projectId: string) => ['members', 'project', projectId] as const,
  taskDeadline: (taskId: string) => ['task-deadline', taskId] as const
};

const unwrapPageData = (res: any) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  if (Array.isArray(res.content)) return res.content;
  if (Array.isArray(res.data?.content)) return res.data.content;
  if (Array.isArray(res.data?.data?.content)) return res.data.data.content;
  return [];
};

export const useGetBoardsByProject = (projectId: string) => {
  return useQuery({
    queryKey: BOARD_QUERY_KEYS.boardsByProject(projectId),
    queryFn: () => boardApi.getBoardsByProject(projectId),
    enabled: !!projectId
  });
};

export const useGetBoardDetail = (boardId: string) => {
  return useQuery({
    queryKey: BOARD_QUERY_KEYS.boardDetail(boardId),
    queryFn: async () => {
      const response = await boardApi.getBoard(boardId);
      let coreData = response;

      while (coreData?.data && !coreData.projectId && !coreData.project_id && !coreData.columns) {
        coreData = coreData.data;
      }

      const projectId = coreData?.projectId || coreData?.project_id;
      if (projectId) {
        boardApi.getProjectMembers(projectId)
          .then((res: any) => {
            const members = unwrapPageData(res);
            useUserStore.getState().saveUsersToCache(members, projectId);
          })
          .catch((err: any) => console.error('Lỗi đồng bộ danh bạ dự án:', err));
      }

      return coreData as Board;
    },
    enabled: !!boardId
  });
};

export const useGetProjectMembers = (projectId: string) => {
  return useQuery({
    queryKey: BOARD_QUERY_KEYS.projectMembers(projectId),
    queryFn: async () => {
      const res: any = await boardApi.getProjectMembers(projectId);
      return unwrapPageData(res);
    },
    enabled: !!projectId
  });
};

export const useGetTaskDeadline = (taskId: string) => {
  return useQuery({
    queryKey: BOARD_QUERY_KEYS.taskDeadline(taskId),
    queryFn: () => boardApi.getTaskDeadline(taskId),
    enabled: !!taskId,
    retry: false,
    refetchOnWindowFocus: false
  });
};

export const useCreateBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBoardPayload) => boardApi.createBoard(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardsByProject(variables.projectId) });
    }
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskData }: { taskData: Partial<Task>; boardId: string }) => boardApi.createTask(taskData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    }
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, updateData }: { taskId: string; updateData: Partial<Task>; boardId: string }) =>
      boardApi.updateTask(taskId, updateData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.taskDeadline(variables.taskId) });
    }
  });
};

export const useMoveTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, columnId, order, boardId }: { taskId: string; columnId: string; order: number; boardId: string }) =>
      boardApi.moveTask(taskId, columnId, order, boardId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    }
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId }: { taskId: string; boardId: string }) => boardApi.deleteTask(taskId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.removeQueries({ queryKey: BOARD_QUERY_KEYS.taskDeadline(variables.taskId) });
    }
  });
};

export const useAddCommentToTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; boardId: string; content: string }) =>
      boardApi.addCommentToTask(taskId, { content }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    }
  });
};

export const useResolveTaskComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, commentId }: { taskId: string; boardId: string; commentId: string }) =>
      boardApi.resolveTaskComment(taskId, commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    }
  });
};

export const useRequestDeadlineExtension = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      requestedDueDate,
      reason
    }: {
      taskId: string;
      boardId: string;
      requestedDueDate: string;
      reason: string;
    }) =>
      boardApi.requestDeadlineExtension(taskId, {
        requested_due_date: requestedDueDate,
        reason
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.taskDeadline(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    }
  });
};

export const useApproveDeadlineExtension = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId }: { taskId: string; boardId?: string }) => boardApi.approveDeadlineExtension(taskId),
    onSuccess: (_, variables) => {
      if (variables.boardId) queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.taskDeadline(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    }
  });
};

export const useRejectDeadlineExtension = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, rejectReason }: { taskId: string; boardId?: string; rejectReason?: string }) =>
      boardApi.rejectDeadlineExtension(taskId, { reject_reason: rejectReason || '' }),
    onSuccess: (_, variables) => {
      if (variables.boardId) queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.taskDeadline(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    }
  });
};

export const useCreateColumn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ list_name, order, boardId }: { list_name: string; project_id: string; order: number; boardId: string }) =>
      boardApi.createColumn({ name: list_name, board_id: boardId, order }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    }
  });
};

export const useUpdateColumn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ columnId, list_name }: { columnId: string; list_name: string; boardId: string }) =>
      boardApi.updateColumn(columnId, { name: list_name }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    }
  });
};

export const useDeleteColumn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ columnId }: { columnId: string; boardId: string }) => boardApi.deleteColumn(columnId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    }
  });
};

export const getPresignedUrl = async (fileName: string, contentType: string) => {
  const res: any = await boardApi.getPresignedUrl(fileName, contentType);
  return res?.data || res;
};

export const useAddAttachmentToTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, payload }: { taskId: string; boardId: string; payload: any }) => {
      const res: any = await boardApi.addAttachmentToTask(taskId, payload);
      return res?.data || res;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    }
  });
};