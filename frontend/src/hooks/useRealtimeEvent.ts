import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

export const useRealtimeEvent = (topic: string, onMessage: (message: any) => void, delay = 0) => {
  const { subscribe, isConnected } = useSocket();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestOnMessage = useRef(onMessage);

  useEffect(() => {
    latestOnMessage.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!isConnected || !topic || !subscribe) return;

    const subscription = subscribe(topic, (message: any) => {
      if (delay <= 0) {
        latestOnMessage.current(message);
        return;
      }

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        latestOnMessage.current(message);
      }, delay);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [topic, isConnected, subscribe, delay]);
};