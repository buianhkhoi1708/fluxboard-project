import axiosClient from '../../../lib/axiosClient';

export interface CreateBoardPayload {
  name: string;
  projectId: string;
  status: string;
}

export const boardApi = {
  // --- BOARD ---
  createBoard: async (payload: CreateBoardPayload): Promise<any> => {
    const response: any = await axiosClient.post('/boards', payload);
    return response.data || response;
  },

  getBoardsByProject: async (projectId: string): Promise<any> => {
    const response: any = await axiosClient.get(`/boards/projects/${projectId}`);
    return response.data || response;
  },

  getBoard: async (boardId: string): Promise<any> => {
    // Đã xóa ?t=${Date.now()} vì TanStack Query sẽ lo vụ cache
    const response: any = await axiosClient.get(`/boards/${boardId}`);
    return response.data || response; 
  },

// --- COLUMN ---
  createColumn: async (payload: { list_name: string; project_id: string; order: number }) => {
    // 🚀 Sửa '/columns' thành '/board-columns'
    const response: any = await axiosClient.post('/board-columns', payload);
    return response.data || response;
  },

  updateColumn: async (columnId: string, payload: { list_name: string }) => {
    // 🚀 Sửa '/columns' thành '/board-columns'
    const response: any = await axiosClient.put(`/board-columns/${columnId}`, payload);
    return response.data || response;
  },

  deleteColumn: async (columnId: string) => {
    // 🚀 Sửa '/columns' thành '/board-columns'
    const response: any = await axiosClient.delete(`/board-columns/${columnId}`);
    return response.data || response;
  },

  createTask: async (taskData: any) => {
    const response: any = await axiosClient.post('/tasks', taskData);
    return response.data || response;
  },

  updateTask: async (taskId: string, updateData: any) => {
    const response: any = await axiosClient.put(`/tasks/${taskId}`, updateData);
    return response.data || response;
  },

  deleteTask: async (taskId: string) => {
    const response: any = await axiosClient.delete(`/tasks/${taskId}`);
    return response.data || response;
  },

  moveTask: async (taskId: string, columnId: string, order: number, boardId: string) => {
    // Đảm bảo Backend nhận đúng snake_case như sếp đã viết
    return await axiosClient.patch(`/tasks/${taskId}/move`, {
      new_column_id: columnId, 
      new_order: order,
      board_id: boardId 
    });
  },


  // --- PROJECT MEMBERS ---
  addProjectMember: async (projectId: string, userId: string, roleIds: string[] = ["MEMBER"]) => {
    const payload = {
      user_id: userId,
      role_ids: roleIds
    };
    const response: any = await axiosClient.post(`/projects/${projectId}/members`, payload);
    return response.data || response;
  },

  getProjectMembers: (projectId: string) => {
    return axiosClient.get(`/projects/${projectId}/members`);
  },
};