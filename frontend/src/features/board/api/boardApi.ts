import axiosClient from '../../../lib/axiosClient';

export const boardApi = {
  // Lấy Board kèm chống Cache
  getBoard: async (boardId: string): Promise<any> => {
    const response: any = await axiosClient.get(`/boards/${boardId}?t=${Date.now()}`);
    return response.data || response; 
  },

  // 🚀 Gọi API Kéo Thả
  moveTask: async (taskId: string, columnId: string, order: number, boardId: string) => {
    return await axiosClient.patch(`/tasks/${taskId}/move`, {
      new_column_id: columnId, 
      new_order: order,
      board_id: boardId 
    });
  },

  // 🚀 Tạo Task mới
  createTask: async (taskData: any) => {
    const response: any = await axiosClient.post('/tasks', taskData);
    return response.data || response;
  },

  // 🚀 Cập nhật Task (Sửa lỗi thiếu hàm này)
  updateTask: async (taskId: string, updateData: any) => {
    // updateData đã được parse chuẩn snake_case từ useBoardStore
    const response: any = await axiosClient.put(`/tasks/${taskId}`, updateData);
    return response.data || response;
  },

  // 🚀 Xóa Task
  deleteTask: async (taskId: string) => {
    const response: any = await axiosClient.delete(`/tasks/${taskId}`);
    return response.data || response;
  },
};