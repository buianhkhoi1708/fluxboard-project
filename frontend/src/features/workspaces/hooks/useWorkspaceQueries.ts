import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '../api/wokspaceApi';
import { WorkspaceOverview } from '../types/workspaceTypes';
import { useUserStore } from '../../user/store/useUserStore';

export const WORKSPACE_KEYS = {
  all: ['workspaces'] as const,
};

// 🚀 Nâng cấp lên Cấu trúc Cuộn vô hạn (Infinite Query)
export const useWorkspaces = () => {
  return useInfiniteQuery({
    queryKey: WORKSPACE_KEYS.all,
    initialPageParam: 0, // Bắt đầu từ trang 0 (chuẩn Spring Boot)
    queryFn: async ({ pageParam }) => {
      // Gọi API: Lấy trang hiện tại (pageParam), số lượng 2 project (size = 2)
      const response = await workspaceApi.getProjectOverviews(pageParam as number, 2);
      
      const rawData = (response as any).content || (response as any).data?.content || (response as any).data || [];
      
      const activeProjects = rawData.filter((item: WorkspaceOverview) => {
        const p = item.project;
        return p && (p.is_deleted === false || p.is_deleted === undefined);
      }) as WorkspaceOverview[];

      // Bơm data users vào cache
      activeProjects.forEach(item => {
        const pid = item.project?.id || item.project?._id;
        if (pid && item.members?.length > 0) {
          useUserStore.getState().saveUsersToCache(item.members, pid);
        }
      });

      // Nếu backend trả về đủ 2 phần tử, nghĩa là có thể còn trang tiếp theo
      const hasNext = rawData.length === 2;

      return {
        data: activeProjects,
        nextPage: hasNext ? (pageParam as number) + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
};

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workspaceApi.createProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKSPACE_KEYS.all })
  });
};

export const useCreateBoard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workspaceApi.createBoard,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKSPACE_KEYS.all })
  });
};