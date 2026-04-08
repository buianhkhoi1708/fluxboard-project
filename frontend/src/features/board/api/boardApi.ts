import axiosClient from '../../../lib/axiosClient';

export const boardApi = {
  // Lấy Board kèm chống Cache
  getBoard: async (boardId: string): Promise<any> => {
    const response: any = await axiosClient.get(`/boards/${boardId}?t=${Date.now()}`);
    return response.data || response; 
  },

  // 🚀 Gọi API Kéo Thả (Phải gửi đủ columnId, order, boardId)
moveTask: async (taskId: string, columnId: string, order: number, boardId: string) => {
  return await axiosClient.patch(`/tasks/${taskId}/move`, {
    new_column_id: columnId, 
    new_order: order,
    board_id: boardId // 👉 PHẢI LÀ board_id (có gạch dưới)
  });
},

  // 🚀 Tạo Task mới
  createTask: async (taskData: any) => {
    // taskData phải chứa boardId
    const response: any = await axiosClient.post('/tasks', taskData);
    return response.data || response;
  },

  deleteTask: async (taskId: string) => {
    const response: any = await axiosClient.delete(`/tasks/${taskId}`);
    return response.data || response;
  },
};