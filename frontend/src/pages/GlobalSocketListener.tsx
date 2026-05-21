import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../hooks/useRealtimeEvent';
import { WORKSPACE_KEYS } from '../features/workspaces/hooks/useWorkspaceQueries';
import { SETTING_KEYS } from '../features/settings/hooks/useSettingQueries';

export const GlobalSocketListener = () => {
  const queryClient = useQueryClient();

  // 1. 📡 Lắng nghe thông báo cá nhân (Ví dụ: có người tag tên sếp)
  useRealtimeEvent('/user/queue/notifications', (message) => {
    console.log("🔔 [Global] Có thông báo mới:", message);
    queryClient.invalidateQueries({ queryKey: SETTING_KEYS.notifications });
  });

  // 2. 📡 Lắng nghe cập nhật toàn cục của Workspace (Ví dụ: ai đó tạo Board mới)
  useRealtimeEvent('/topic/workspaces/updates', (message) => {
    console.log("🏢 [Global] Có cập nhật ở Workspace:", message);
    queryClient.invalidateQueries({ queryKey: WORKSPACE_KEYS.all });
  });

  // 3. 📡 Kênh tổng hợp các thay đổi (Nếu Backend của sếp gộp chung vào 1 topic)
  useRealtimeEvent('/topic/system', (message) => {
    const { action, payload } = message;
    
    switch (action) {
      case 'PROJECT_DELETED':
        queryClient.invalidateQueries({ queryKey: WORKSPACE_KEYS.all });
        break;

      case 'TASK_ASSIGNED':
        queryClient.invalidateQueries({ queryKey: ['tasks', 'my-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
        break;
        
      default:
        break;
      // ... Thêm các kịch bản khác ở đây
    }
  });

  // Trạm này chạy ngầm, tàng hình 100% trên giao diện
  return null; 
};