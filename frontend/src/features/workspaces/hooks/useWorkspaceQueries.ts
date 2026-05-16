import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '../api/workspaceApi'; // 🚀 ĐÃ FIX TYPO: 'wokspaceApi' -> 'workspaceApi'
import { WorkspaceOverview } from '../types/workspaceTypes';
import { useUserStore } from '../../user/store/useUserStore';

export const WORKSPACE_KEYS = {
  all: ['workspaces'] as const,
};

export const useWorkspaces = () => {
  return useInfiniteQuery({
    queryKey: WORKSPACE_KEYS.all,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      // 🚀 Mỗi trang lấy đúng 2 project để test Infinite Scroll
      const response: any = await workspaceApi.getProjectOverviews(pageParam as number, 2);
      
      // Bọc lót mọi cấu trúc dữ liệu trả về từ API phân trang
      const rawData = response.content || response.data?.content || response.data || [];
      
      // Lọc bỏ các project đã bị đánh dấu xóa mờ (is_deleted === true)
      const activeProjects = rawData.filter((item: WorkspaceOverview) => {
        const p = item.project;
        return p && (p.is_deleted === false || p.is_deleted === undefined);
      }) as WorkspaceOverview[];

      // Lưu thông tin thành viên (User) vào Cache toàn cục trong Store để modal bốc ra dùng luôn
      activeProjects.forEach(item => {
        const pid = item.project?.id || item.project?._id;
        if (pid && item.members && item.members.length > 0) {
          useUserStore.getState().saveUsersToCache(item.members, String(pid));
        }
      });

      // 🚀 FIX LOGIC LẬT TRANG: 
      // Kiểm tra xem Backend có báo là trang cuối chưa (chuẩn Spring Data Pageable)
      // Nếu không có trường 'last', ta dự phòng bằng cách kiểm tra số lượng dữ liệu thô trả về
      const isLastPage = response.last !== undefined ? response.last : rawData.length < 2;
      
      return {
        data: activeProjects,
        nextPage: !isLastPage ? (pageParam as number) + 1 : undefined,
      };
    },
    // Trả về số trang kế tiếp, nếu là undefined thì Tanstack Query tự hiểu là hết trang để cuộn
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