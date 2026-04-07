// Định nghĩa URL gốc, nhớ đổi port nếu BE của bạn dùng port khác
const BASE_URL = 'http://localhost:8080';

// 1. API lấy dữ liệu Board 
export const fetchBoardAPI = async (boardId: string) => {
  const response = await fetch(`${BASE_URL}/boards/${boardId}`);
  if (!response.ok) throw new Error('Lỗi khi lấy dữ liệu Bảng');
  
  const json = await response.json();
  // Dựa vào code BE, bọc data trong ApiResponse
  return json.data; 
};

// 2. API Cập nhật vị trí thẻ khi kéo thả
export const moveTaskAPI = async (taskId: string, newColumnId: string, newOrder: number) => {

  const response = await fetch(`${BASE_URL}/tasks/${taskId}/move`, {
    method: 'PATCH', // Checklist yêu cầu PATCH
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      newColumnId: newColumnId, 
      newOrder: newOrder 
    }),
  });

  if (!response.ok) throw new Error('Lỗi khi lưu vị trí kéo thả');
  return response.json();
};