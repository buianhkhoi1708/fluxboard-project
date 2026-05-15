import React, { useMemo } from 'react';
import { useDashboardMetrics } from '../features/dashboard/hooks/useDashBoardQueries'; 
import { useAuthStore } from '../features/auth/store/useAuthStore'; 

import AdminDashboard from '../features/dashboard/components/AdminDashboard';
import ManagerDashboard from '../features/dashboard/components/ManagerDashboard';
import MemberDashboard from '../features/dashboard/components/MemberDashboard';

const DashboardPage = () => {
  const { user } = useAuthStore();
  
  // 1. TanStack Query lo phần lấy dữ liệu từ Backend
  const { data, isLoading, isError, error } = useDashboardMetrics();

  // 2. 🛡️ CƠ CHẾ ĐỒNG BỘ: Bóc tách Role chuẩn từ Profile/Sidebar
  const currentRole = useMemo(() => {
    const role = 
      user?.system_role || 
      user?.role_name || 
      user?.role?.name || 
      user?.role || 
      user?.role_id || 
      "MEMBER";

    return String(role).toUpperCase().trim();
  }, [user]);

  // Mã ID dự phòng cho Admin (Phòng hờ Backend vẫn trả về ID)
  const ADMIN_ID = "69CFD39A34353F3CA08D52CE";

  // 3. Hàm render component dựa trên quyền thực tế
  const renderDashboardByRole = () => {
    // ⚔️ Ưu tiên Admin
    if (currentRole.includes('ADMIN') || currentRole === ADMIN_ID) {
      return <AdminDashboard data={data || null} />;
    }
    
    // ⚔️ Nhóm Manager / Lead / PM
    if (
      currentRole.includes('MANAGER') || 
      currentRole.includes('LEAD') || 
      currentRole.includes('PM')
    ) {
      return <ManagerDashboard data={data || null} />;
    }

    // ⚔️ Mặc định là Member
    return <MemberDashboard data={data || null} />;
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full h-full overflow-y-auto bg-slate-50 transition-all duration-500">
      
      {/* HEADER TỐI GIẢN & LỊCH SỰ */}
      <div className="flex flex-col mb-8 gap-1">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard</h1>
        <p className="text-sm font-medium text-slate-400">
          Chào mừng trở lại, <span className="text-indigo-600 font-bold">{user?.full_name || 'Khách'}</span>.
        </p>
      </div>

      {/* TRẠNG THÁI LOADING TỪ TANSTACK */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center h-[400px] gap-4">
           <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-indigo-600"></div>
           <p className="text-slate-400 font-bold animate-pulse">Đang đồng bộ dữ liệu hệ thống...</p>
        </div>
      ) : isError ? (
        <div className="text-center p-12 bg-rose-50 rounded-3xl border-2 border-dashed border-rose-200 animate-in fade-in zoom-in-95">
          <div className="text-rose-500 font-black text-xl mb-2">Hệ thống đang bận</div>
          <p className="text-rose-400 font-medium">
            {(error as any)?.response?.data?.message || (error as Error)?.message || "Không thể lấy dữ liệu Dashboard."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-8 py-2.5 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
          >
            Thử kết nối lại
          </button>
        </div>
      ) : (
        /* HIỂN THỊ BIỂU ĐỒ THEO ROLE VỚI HIỆU ỨNG MƯỢT MÀ */
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
           {renderDashboardByRole()}
        </div>
      )}

    </div>
  );
};

export default DashboardPage;