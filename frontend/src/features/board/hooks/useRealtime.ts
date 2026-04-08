import { useEffect } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { useBoardStore } from '../stores/useBoardStore';

export const useRealtime = (boardId: string | undefined) => {
  const { fetchBoardData } = useBoardStore();

  useEffect(() => {
    if (!boardId) return;

    // 1. Kết nối tới cổng bưu điện của Mạnh
    const socket = new SockJS('http://localhost:8080/api/v1/ws-fluxboard', null, {
        transports: ['websocket', 'xhr-streaming', 'xhr-polling']
    });
    const stompClient = Stomp.over(socket);

    stompClient.connect({}, () => {
      console.log("🔌 Đã thông kết nối Real-time!");
      
      // 2. Đăng ký lắng nghe biến động của Board này
      stompClient.subscribe(`/topic/board/${boardId}`, (message) => {
        if (message.body === "CHANGED") {
          console.log("🔔 Có biến! Cập nhật lại Board ngay...");
          fetchBoardData(boardId); // Tự động load lại dữ liệu mới nhất
        }
      });
    });

    return () => {
      if (stompClient.connected) { 
        stompClient.disconnect(() => {});
      }
    };
  }, [boardId]);
};