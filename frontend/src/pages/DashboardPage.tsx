import React, { useMemo } from 'react';
import { useDashboardMetrics } from '../features/dashboard/hooks/useDashBoardQueries'; 
import { useAuthStore } from '../features/auth/store/useAuthStore'; 

// 🚀 IMPORT HOOK TỪ ĐIỂN ROLE CỦA SẾP VÀO
import { useRolesDictionary } from '../features/rbac/hooks/useRbacQueries'; // Thay đường dẫn cho đúng nhé sếp

import AdminDashboard from '../features/dashboard/components/AdminDashboard';
import ManagerDashboard from '../features/dashboard/components/ManagerDashboard';
import MemberDashboard from '../features/dashboard/components/MemberDashboard';

const DashboardPage = () => {
  const { user } = useAuthStore();
  const { data, isLoading: isDashboardLoading, isError, error } = useDashboardMetrics();
  
  // 🚀 GỌI TỪ ĐIỂN ROLE
  const { data: rolesList, isLoading: isRolesLoading } = useRolesDictionary();

  // 🛡️ BÓC TÁCH VÀ DỊCH ROLE TỪ ID SANG TÊN CHUẨN
  const currentRoleName = useMemo(() => {
    if (!user) return "MEMBER";

    // 1. Tìm cái dữ liệu role đang bị giấu trong user
    const rawRole = 
      user.system_role || 
      user.systemRole ||
      user.role_id || 
      user.role?.id ||
      user.role_name || 
      user.role?.name || 
      user.role || 
      "MEMBER";

    const roleString = String(rawRole).toUpperCase().trim();

    // 2. Tra từ điển: Nếu cái roleString là một cái ID (vd: 69cfd3be...), mình lôi cái tên "MANAGER" ra
    if (rolesList && rolesList.length > 0) {
      const matchedRole = rolesList.find(r => r.id.toUpperCase() === roleString);
      if (matchedRole) {
        return matchedRole.name.toUpperCase();
      }
    }

    // 3. Nếu nó vốn dĩ đã là chữ (hoặc ko tìm thấy), trả về nguyên gốc
    return roleString;
  }, [user, rolesList]);

  // 3. Hàm render component (Bây giờ chỉ cần check tên chữ, không cần quan tâm ID nữa)
  const renderDashboardByRole = () => {
    // ⚔️ Nhóm Admin
    if (currentRoleName.includes('ADMIN') || currentRoleName === 'SYSTEM_ADMIN' || currentRoleName === 'PROJECT_ADMIN') {
      return <AdminDashboard data={data || null} />;
    }
    
    // ⚔️ Nhóm Manager / PM / Lead
    if (currentRoleName.includes('MANAGER') || currentRoleName.includes('PM') || currentRoleName.includes('LEAD')) {
      return <ManagerDashboard data={data || null} />;
    }

    // ⚔️ Mặc định
    return <MemberDashboard data={data || null} />;
  };

  const isLoading = isDashboardLoading || isRolesLoading;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full h-full overflow-y-auto bg-slate-50 transition-all duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col mb-8 gap-1">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard</h1>
        <p className="text-sm font-medium text-slate-400">
          Chào mừng trở lại, <span className="text-indigo-600 font-bold">{user?.full_name || 'Khách'}</span>. 
          {/* Sếp có thể in thử currentRoleName ra đây để test xem nó dịch chuẩn chưa */}
          {/* (Role hiện tại: {currentRoleName}) */}
        </p>
      </div>

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
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
           {renderDashboardByRole()}
        </div>
      )}

    </div>
  );
};

export default DashboardPage;