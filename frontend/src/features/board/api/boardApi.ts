import axiosClient from '../../../lib/axiosClient';

export interface CreateBoardPayload {
  name: string;
  projectId: string;
  status: string;
}

const unwrap = (res: any) => {
  if (!res) return res;
  if (res.data?.data !== undefined) return res.data.data;
  if (res.data !== undefined) return res.data;
  return res;
};

export const boardApi = {
  createBoard: async (payload: CreateBoardPayload): Promise<any> => {
    const res: any = await axiosClient.post('/boards', {
      name: payload.name,
      project_id: payload.projectId,
      status: payload.status
    });
    return unwrap(res);
  },

  getBoardsByProject: async (projectId: string): Promise<any> => {
    const res: any = await axiosClient.get(`/boards/projects/${projectId}`);
    return unwrap(res);
  },

  getBoard: async (boardId: string): Promise<any> => {
    const res: any = await axiosClient.get(`/boards/${boardId}`);
    return unwrap(res);
  },

  createColumn: async (payload: { name: string; board_id: string; order?: number }) => {
    const res: any = await axiosClient.post('/board-columns', {
      name: payload.name,
      board_id: payload.board_id,
    });
    return unwrap(res);
  },

  updateColumn: async (columnId: string, payload: { name: string }) => {
    const res: any = await axiosClient.put(`/board-columns/${columnId}`, payload);
    return unwrap(res);
  },

  deleteColumn: async (columnId: string) => {
    const res: any = await axiosClient.delete(`/board-columns/${columnId}`);
    return unwrap(res);
  },

  createTask: async (taskData: any) => {
    const res: any = await axiosClient.post('/tasks', taskData);
    return unwrap(res);
  },

  updateTask: async (taskId: string, updateData: any) => {
    const res: any = await axiosClient.put(`/tasks/${taskId}`, updateData);
    return unwrap(res);
  },

  deleteTask: async (taskId: string) => {
    const res: any = await axiosClient.delete(`/tasks/${taskId}`);
    return unwrap(res);
  },

  moveTask: async (taskId: string, columnId: string, order: number, boardId: string) => {
    const res: any = await axiosClient.patch(`/tasks/${taskId}/move`, {
      new_column_id: columnId,
      new_order: order,
      board_id: boardId
    });
    return unwrap(res);
  },

  addCommentToTask: async (taskId: string, payload: { content: string }) => {
    const res: any = await axiosClient.post(`/tasks/${taskId}/comments`, {
      content: payload.content
    });
    return unwrap(res);
  },

  resolveTaskComment: async (taskId: string, commentId: string) => {
    const res: any = await axiosClient.patch(`/tasks/${taskId}/comments/${commentId}/resolve`);
    return unwrap(res);
  },

  getTaskDeadline: async (taskId: string) => {
    const res: any = await axiosClient.get(`/tasks/${taskId}/deadline`);
    return unwrap(res);
  },

  requestDeadlineExtension: async (
    taskId: string,
    payload: { requested_due_date: string; reason: string }
  ) => {
    const res: any = await axiosClient.post(`/tasks/${taskId}/deadline/extensions`, {
      requested_due_date: payload.requested_due_date,
      reason: payload.reason
    });
    return unwrap(res);
  },

  approveDeadlineExtension: async (taskId: string) => {
    const res: any = await axiosClient.post(`/tasks/${taskId}/deadline/extensions/approve`);
    return unwrap(res);
  },

  rejectDeadlineExtension: async (taskId: string, payload: { reject_reason?: string }) => {
    const res: any = await axiosClient.post(`/tasks/${taskId}/deadline/extensions/reject`, {
      reject_reason: payload.reject_reason || ''
    });
    return unwrap(res);
  },

  addProjectMember: async (projectId: string, userId: string, roleIds: string[] = ['MEMBER']) => {
    const res: any = await axiosClient.post(`/projects/${projectId}/members`, {
      user_id: userId,
      role_ids: roleIds
    });
    return unwrap(res);
  },

  getProjectMembers: async (projectId: string) => {
    const res: any = await axiosClient.get(`/projects/${projectId}/members`);
    return unwrap(res);
  },

  getPresignedUrl: async (fileName: string, contentType: string): Promise<any> => {
    const res: any = await axiosClient.get('/media/presigned-url', {
      params: { fileName, contentType }
    });
    return unwrap(res);
  },

  addAttachmentToTask: async (taskId: string, payload: any): Promise<any> => {
    const res: any = await axiosClient.post(`/tasks/${taskId}/attachments`, payload);
    return unwrap(res);
  }
};