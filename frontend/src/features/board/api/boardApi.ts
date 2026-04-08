import axiosClient from '../../../lib/axiosClient';
import { IBoard } from '../types/index';

export interface IApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T;          
  meta?: any;       
  timestamp: string; 
}

export const boardApi = {
  // Lấy dữ liệu Bảng (GET)
  getBoard: async (boardId: string): Promise<any> => {
    const response: any = await axiosClient.get(`/boards/${boardId}`);
    return response.data || response; 
  },

  // Cập nhật vị trí thẻ (API cũ - cứ để dự phòng)
  moveCard: async (cardId: string, newColumnId: string, newOrder: number) => {
    const response: any = await axiosClient.patch(`/cards/${cardId}/move`, {
      new_column_id: newColumnId,
      new_order: newOrder
    });
    return response.data || response;
  },

  // 🚀 👉 HÀM MỚI CHÍNH LÀ ĐÂY: Hàm moveTask gọi sang API của Mạnh
  moveTask: async (taskId: string, newColumnId: string, newOrder: number) => {
    const response: any = await axiosClient.patch(`/tasks/${taskId}/move`, {
      newColumnId: newColumnId, // Mạnh đang dùng camelCase trong DTO
      newOrder: newOrder
    });
    return response.data || response;
  },

  // Trong boardApi.ts
createTask: async (taskData: any) => {
  const response: any = await axiosClient.post('/tasks', taskData);
  return response.data || response;
},
// Xóa Task (DELETE)
  deleteTask: async (taskId: string) => {
    const response: any = await axiosClient.delete(`/tasks/${taskId}`);
    return response.data || response;
  },
  // Cập nhật Task (PATCH)
  updateTask: async (taskId: string, updates: any) => {
    const response: any = await axiosClient.put(`/tasks/${taskId}`, updates);
    return response.data || response;
  },
};