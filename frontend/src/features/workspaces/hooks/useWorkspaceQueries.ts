import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '../api/wokspaceApi';
import { WorkspaceOverview } from '../types/workspaceTypes';

export const WORKSPACE_KEYS = {
  all: ['workspaces'] as const,
};

// 🚀 Hook Lấy dữ liệu (Tự động cache, tự động loading)
export const useWorkspaces = () => {
  return useQuery({
    queryKey: WORKSPACE_KEYS.all,
    queryFn: async () => {
      const res: any = await workspaceApi.getProjectOverviews();
      // Lấy mảng content hoặc data từ response
      const rawData = res.content || res.data?.content || res.data || [];
      
      // Lọc bỏ các project đã xóa
      return rawData.filter((item: WorkspaceOverview) => {
        const p = item.project;
        return p && (p.is_deleted === false || p.is_deleted === undefined);
      }) as WorkspaceOverview[];
    },
  });
};

// 🚀 Hook Tạo Workspace
export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workspaceApi.createProject,
    onSuccess: () => {
      // Thành công thì tự động bắt React Query fetch lại danh sách mới nhất
      queryClient.invalidateQueries({ queryKey: WORKSPACE_KEYS.all });
    }
  });
};

// 🚀 Hook Tạo Board
export const useCreateBoard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workspaceApi.createBoard,
    onSuccess: () => {
      // Tạo board xong cũng tự động fetch lại để cập nhật UI
      queryClient.invalidateQueries({ queryKey: WORKSPACE_KEYS.all });
    }
  });
};