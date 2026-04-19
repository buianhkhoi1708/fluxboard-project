import React, { useEffect, useState } from 'react';
import { useDashboardStore } from '../dashboard/store/useDashboardStore';

import { useAuthStore } from '../features/auth/store/useAuthStore';

import AdminDashboard from '../dashboard/components/AdminDashboard';
import ManagerDashboard from '../dashboard/components/ManagerDashboard';
import LeadDashboard from '../dashboard/components/LeadDashboard';
import MemberDashboard from '../dashboard/components/MemberDashboard';

const DashboardPage = () => {
  // const { user } = useAuthStore();
  const [activeRole, setActiveRole] = useState('MANAGER'); // Test tool
  
  const { data, isLoading, error, fetchData } = useDashboardStore();

  useEffect(() => {
    // Gọi API thông qua Zustand store mỗi khi Role thay đổi
    fetchData(activeRole);
  }, [activeRole, fetchData]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full h-full overflow-y-auto bg-slate-50">
      
      {/* Test Role Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-black text-slate-800">Dashboard</h1>
        <div className="flex bg-slate-200 p-1.5 rounded-xl gap-1">
          {['ADMIN', 'MANAGER', 'LEAD', 'MEMBER'].map((r) => (
            <button 
              key={r} onClick={() => setActiveRole(r)} 
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeRole === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Xử lý UI Loading / Error / Thành công */}
      {isLoading ? (
        <div className="flex justify-center items-center h-[400px]">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="text-center text-rose-500 p-10 font-bold bg-rose-50 rounded-2xl">{error}</div>
      ) : (
        <>
          {activeRole.includes('ADMIN') && <AdminDashboard data={data} />}
          {activeRole.includes('MANAGER') && <ManagerDashboard data={data} />}
          {activeRole === 'LEAD' && <LeadDashboard data={data} />}
          {activeRole === 'MEMBER' && <MemberDashboard data={data} />}
        </>
      )}

    </div>
  );
};

export default DashboardPage;