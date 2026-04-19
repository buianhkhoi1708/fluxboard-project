// src/features/dashboard/store/useDashboardStore.ts
import { create } from 'zustand';
import { dashboardApi } from '../api/dashboardApi';

interface DashboardState {
  data: any;
  isLoading: boolean;
  error: string | null;
  fetchData: (role: string) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  isLoading: true,
  error: null,
  
  fetchData: async (role: string) => {
    set({ isLoading: true, error: null });
    try {
      // 🚀 SỬA LỖI Ở ĐÂY: Thêm type ": any" để TypeScript không báo lỗi 'unknown'
      let response: any; 
      
      if (role.includes('ADMIN')) {
        response = await dashboardApi.getAdminMetrics();
      } else if (role.includes('MANAGER')) {
        response = await dashboardApi.getManagerMetrics();
      } else if (role === 'LEAD') {
        response = await dashboardApi.getLeadMetrics();
      } else {
        response = await dashboardApi.getMemberMetrics();
      }
      
      set({ data: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Lỗi tải dữ liệu', isLoading: false });
    }
  }
}));