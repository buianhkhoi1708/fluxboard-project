import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

// 🚀 Nâng cấp type cho onMessage nhận payload
export const useRealtimeEvent = (topic: string, onMessage: (message: any) => void, delay = 300) => {
  const { subscribe, isConnected } = useSocket();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // 🚀 BÍ KÍP CHỐNG LỖI STALE CLOSURE
  const latestOnMessage = useRef(onMessage);
  useEffect(() => {
    latestOnMessage.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!isConnected || !topic || !subscribe) return;

    const subscription = subscribe(topic, (message: any) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      
      debounceTimer.current = setTimeout(() => {
        // 🚀 Bơm dữ liệu ra ngoài Component
        latestOnMessage.current(message);
      }, delay);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [topic, isConnected, subscribe]); 
};