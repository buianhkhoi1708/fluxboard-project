import { create } from 'zustand';
import { projectApi } from '../api/projectApi';
import { useUserStore, IncomingUser } from '../../user/store/useUserStore'; 

// ==========================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU (INTERFACES)
// ==========================================

export interface Project {
  id?: string;
  _id?: string;
  name?: string;
  is_deleted?: boolean;
  [key: string]: any; 
}

export interface Board {
  id?: string;
  _id?: string;
  name?: string;
  [key: string]: any;
}

export interface NormalizedProject {
  project: Project;
  boards: Board[];
  members: IncomingUser[]; 
}

interface ProjectStore {
  projects: NormalizedProject[];
  isLoading: boolean;
  currentPage: number;   // Thêm state lưu trang hiện tại
  hasMore: boolean;      // Thêm state kiểm tra còn data để tải không

  fetchProjects: (page?: number) => Promise<void>;
  loadMoreProjects: () => Promise<void>; // Action tải thêm
  addProject: (newProject: Project) => void;
  addBoardToProject: (projectId: string, newBoard: Board) => void;
  fetchProjectMembers: (projectId: string) => Promise<void>;
}

// ==========================================
// 2. LOGIC STORE
// ==========================================

const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [], 
  isLoading: false,
  currentPage: 0,
  hasMore: true,

  // Sửa lại fetchProjects có nhận tham số page (mặc định là 0)
  fetchProjects: async (page = 0) => {
    const { hasMore, isLoading } = get();
    
    // Nếu đang tải hoặc gọi trang tiếp theo nhưng đã hết data thì chặn luôn
    if (isLoading || (page > 0 && !hasMore)) return;

    set({ isLoading: true });
    try {
      // 🚀 CHỐT HẠ: Truyền size: 2 để mỗi lần chỉ lấy 2 projects
      const response = await projectApi.getProjectOverviews({ page, size: 2 });
      
      if (response.success) {
        const rawData: any[] = (response.data as any)?.content || response.data || [];
        
        const normalizedProjects: NormalizedProject[] = rawData.map(item => {
          if (item.project) return item; 
          return {
            project: item, 
            boards: item.boards || [],
            members: item.members || [] 
          };
        });

        const activeProjects = normalizedProjects.filter(item => {
          const p = item.project;
          return p && (p.is_deleted === false || p.is_deleted === undefined);
        });
        
        set((state) => ({ 
          // Nếu tải trang 0 (load lần đầu) thì ghi đè, nếu tải trang > 0 thì nối mảng (append)
          projects: page === 0 ? activeProjects : [...state.projects, ...activeProjects],
          currentPage: page,
          // Nếu BE trả về mảng có length = 2 (bằng với size) nghĩa là có thể còn trang sau. 
          // Nếu length < 2 nghĩa là đã lấy sạch data.
          hasMore: rawData.length === 2 
        }));

        // TỰ ĐỘNG GỌI MEMBER CHO TỪNG PROJECT
        activeProjects.forEach(item => {
          const pid = item.project?.id || item.project?._id;
          if (pid) {
            get().fetchProjectMembers(pid); 
          }
        });
      }
    } catch (error) {
      console.error("Store Fetch Error:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Action mới: Gọi hàm này khi cuộn chuột chạm đáy
  loadMoreProjects: async () => {
    const { currentPage, hasMore, isLoading, fetchProjects } = get();
    if (!isLoading && hasMore) {
      await fetchProjects(currentPage + 1);
    }
  },

  addProject: (newProject) => set((state) => ({ 
    projects: [{ project: newProject, boards: [], members: [] }, ...state.projects] 
  })),

  addBoardToProject: (projectId, newBoard) => set((state) => ({
    projects: state.projects.map((item) => {
      if (item.project && (item.project.id === projectId || item.project._id === projectId)) {
        return {
          ...item,
          boards: item.boards ? [...item.boards, newBoard] : [newBoard]
        };
      }
      return item;
    })
  })),

  fetchProjectMembers: async (projectId) => {
    try {
      const response = await projectApi.getProjectMembers(projectId);
      const membersData: IncomingUser[] = (response.data as any)?.content || (response.data as any)?.data || response.data || [];

      useUserStore.getState().saveUsersToCache(membersData, projectId);

      set((state) => ({
        projects: state.projects.map((item) => {
          if (item.project && (item.project.id === projectId || item.project._id === projectId)) {
            return { ...item, members: membersData };
          }
          return item; 
        })
      }));
    } catch (error) {
      console.error(`Lỗi lấy member cho project ${projectId}:`, error);
    }
  }

}));

export default useProjectStore;