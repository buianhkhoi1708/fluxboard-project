import axiosClient from '../../../lib/axiosClient';
import { IBoard } from '../types/index';

export interface IApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T;          // Là phần lõi chứa dữ liệu (Board, Card...)
  meta?: any;       // Dùng optional (?) vì BE có hàm set null cho meta
  timestamp: string; // Java Instant khi parse sang JSON sẽ biến thành chuỗi ISO string
}

export const boardApi = {
  // Lấy dữ liệu Bảng (GET)
  getBoard: async (boardId: string): Promise<IBoard> => {
    const response: IApiResponse<IBoard> = await axiosClient.get(`/boards/${boardId}`);
    return  response.data || response; 
  },

  // Cập nhật vị trí thẻ (PATCH)
  moveCard: async (cardId: string, newColumnId: string, newOrder: number) => {
    const response: IApiResponse<any> = await axiosClient.patch(`/cards/${cardId}/move`, {
      new_column_id: newColumnId,
      new_order: newOrder
    });
    return response.data || response;
  }
};