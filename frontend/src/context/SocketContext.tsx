import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { useAuthStore } from '../features/auth/store/useAuthStore'; // HOẶC lấy token từ localStorage

const SocketContext = createContext<any>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const stompClient = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 🚀 Lấy token để xác thực với Spring Boot
    const token = localStorage.getItem('token');
    
    const socket = new SockJS('http://localhost:8080/api/v1/ws-fluxboard');
    const client = Stomp.over(socket);
    client.debug = () => {}; 

    // 🚀 Nhét Token vào Header
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    client.connect(headers, () => {
      console.log("🔌 [Socket Module]: Đã thông kết nối tổng!");
      stompClient.current = client;
      setIsConnected(true);
    }, (err: any) => {
      console.error("❌ [Socket Module]: Lỗi kết nối:", err);
    });

    return () => {
      if (stompClient.current?.connected) {
        stompClient.current.disconnect();
      }
    };
  }, []);

  const subscribe = (topic: string, callback: (msg: any) => void) => {
    if (!stompClient.current || !isConnected) {
      console.warn(`⚠️ Đang đợi kết nối để subscribe topic: ${topic}`);
      return null;
    }
    return stompClient.current.subscribe(topic, (msg: any) => {
      // 🚀 Parse JSON luôn ở đây để ra ngoài Component đỡ phải parse lại
      try {
         const data = JSON.parse(msg.body);
         callback(data);
      } catch {
         callback(msg.body);
      }
    });
  };

  return (
    <SocketContext.Provider value={{ subscribe, isConnected }}>
      {isConnected ? children : (
        <div className="flex justify-center items-center h-screen bg-slate-50 text-slate-500 font-medium">
          <p>Đang thiết lập kết nối Real-time...</p>
        </div>
      )}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);