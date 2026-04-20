import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MoreVertical, UserCog, Trash2 } from 'lucide-react';

// ==========================================
// 🚀 SUB-COMPONENT: Thẻ thống kê tái sử dụng
// ==========================================
const StatCard = ({ title, value, children, className = "" }: any) => (
  <div className={`bg-white p-5 rounded-2xl shadow-sm hover:shadow-md border border-slate-200/80 hover:border-slate-300 transition-all duration-300 flex flex-col justify-between ${className}`}>
    <div className="flex justify-between items-start mb-2">
      <h3 className="font-bold text-[15px] text-slate-700">{title}</h3>
      <button className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100 p-1 rounded-md transition-colors">
        <MoreVertical size={18} />
      </button>
    </div>
    {value !== undefined && <div className="text-[40px] leading-none font-bold tracking-tight text-slate-800">{value}</div>}
    {children}
  </div>
);

// ==========================================
// 🚀 MAIN COMPONENT
// ==========================================
const AdminDashboard = ({ data }: { data: any }) => {
  if (!data) return null;

  // 1. RÚT DỮ LIỆU THẬT TỪ API TRUYỀN VÀO
  const cards = data?.cards || {};
  const projectStatusDistribution = Array.isArray(data?.project_status_distribution) ? data.project_status_distribution : [];
  const atRiskProjects = Array.isArray(data?.at_risk_projects) ? data.at_risk_projects : [];
  const auditLogs = Array.isArray(data?.audit_logs) ? data.audit_logs : [];

  // 2. MAP DỮ LIỆU CHO BIỂU ĐỒ BAR CHART (Tự nhận diện màu sắc từ API)
  const chartData = useMemo(() => {
    // Lấy tổng số dự án để vẽ cột Total đầu tiên
    const totalValue = cards?.projects?.total || 0;
    const totalBar = { 
      name: 'Total', 
      value: totalValue > 0 ? totalValue : 55, 
      color: '#93c5fd' // Xanh nhạt cố định cho cột Total
    }; 
    
    // Ánh xạ mảng dữ liệu thật
    const dynamicBars = projectStatusDistribution.map((item: any) => ({
      name: item.status,
      value: item.count,
      color: item.color || '#3b82f6' // Lấy màu trực tiếp từ JSON sếp đưa
    }));

    // Fallback nếu API chưa trả về
    if (dynamicBars.length === 0) {
       return [
         { name: 'Total', value: 8, color: '#93c5fd' },
         { name: 'Active', value: 22, color: '#2563eb' },
         { name: 'At Risk', value: 25, color: '#10b981' },
         { name: 'Delayed', value: 5, color: '#f59e0b' },
         { name: 'Archived', value: 10, color: '#64748b' }
       ];
    }

    return [totalBar, ...dynamicBars];
  }, [projectStatusDistribution, cards]);

  // 3. MAP DỮ LIỆU CHO DANH SÁCH PROJECT STATUS
  const projectStatusList = useMemo(() => {
    if (atRiskProjects.length === 0) {
      // Fallback nếu API chưa có
      return [
        { name: 'Domnimors', value: 'At Risk', isBadge: true },
        { name: 'Department', value: '15', isBadge: false }
      ];
    }

    return atRiskProjects.map((project: any) => ({
      name: project.name,
      value: project.status, 
      // Tự động tô màu Badge (viền màu) nếu nó là trạng thái báo động
      isBadge: project.status === 'At Risk' || project.status === 'Delayed'
    }));
  }, [atRiskProjects]);

  return (
    <div className="space-y-5 font-sans text-slate-800 animate-in fade-in zoom-in-95 duration-500 pb-10">
      
      {/* ================= ROW 1: TỔNG QUAN ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <StatCard title="Total Users" value={cards.total_users?.toLocaleString() || '0'} className="h-[140px]" />
        
        <StatCard title="Active Projects" className="h-[140px]">
          <div className="flex items-end gap-6 pb-1">
            <div className="flex flex-col">
              <span className="text-[36px] leading-none font-bold text-slate-800">{cards.projects?.active || 0}</span>
              <span className="text-sm font-semibold text-slate-500 mt-1">Active</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[22px] leading-none font-bold text-slate-800">{cards.projects?.archived || 0}</span>
              <span className="text-sm font-semibold text-slate-500 mt-1">Archived</span>
            </div>
          </div>
        </StatCard>

        <StatCard title="Departments" value={cards.total_departments || '0'} className="h-[140px]" />

        {/* Audit Log tự động render từ JSON */}
        <StatCard title="Audit Log" className="h-[140px]">
          <div className="flex-1 overflow-hidden space-y-3 mt-1">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-slate-400">Không có hoạt động.</p>
            ) : (
              auditLogs.slice(0, 2).map((log: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2.5 group cursor-pointer">
                  {/* Fake icon dựa vào index cho giống hình */}
                  {idx === 0 ? (
                    <UserCog size={16} className="text-slate-400 group-hover:text-indigo-500 shrink-0 mt-0.5 transition-colors" />
                  ) : (
                    <Trash2 size={16} className="text-slate-400 group-hover:text-rose-500 shrink-0 mt-0.5 transition-colors" />
                  )}
                  <p className="text-[13px] leading-snug font-medium text-slate-600 group-hover:text-slate-800 line-clamp-2">
                    {log.action}
                  </p>
                </div>
              ))
            )}
          </div>
        </StatCard>
      </div>

      {/* ================= ROW 2: CHI TIẾT & BIỂU ĐỒ ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        
        {/* Cột 1: Thành viên & Báo cáo phụ */}
        <div className="flex flex-col gap-5">
          <StatCard title="Members" value={cards.total_members?.toLocaleString() || '0'} className="h-[140px]" />
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col justify-center">
             <div className="space-y-4">
               <div className="flex justify-between items-center text-[14px] font-bold text-slate-700">
                 <span className="text-slate-500">Users</span><span>{cards.total_users?.toLocaleString() || '0'}</span>
               </div>
               <div className="flex justify-between items-center text-[14px] font-bold text-slate-700">
                 <span className="text-slate-500">Active:</span><span className="text-emerald-600">{(cards.total_users - cards.total_members)?.toLocaleString() || '0'}</span>
               </div>
               <div className="flex justify-between items-center text-[14px] font-bold text-slate-700">
                 <span className="text-slate-500">Archived</span><span>{cards.projects?.archived || '0'}</span>
               </div>
             </div>
          </div>
        </div>

        {/* Cột 2: Danh sách Trạng thái Dự án */}
        <div className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md border border-slate-200 transition-all duration-300 flex flex-col min-h-[300px]">
          <div className="flex justify-between items-start mb-5 shrink-0">
            <h3 className="font-bold text-[15px] text-slate-700">Project Status</h3>
            <button className="text-slate-400 hover:text-indigo-600 p-1"><MoreVertical size={18} /></button>
          </div>
          <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
            {projectStatusList.map((item: any, idx: number) => (
              <div key={idx} className="group flex justify-between items-center py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-2 -mx-2 rounded-lg transition-colors cursor-pointer">
                <span className="text-[13px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors truncate pr-2">{item.name}</span>
                {item.isBadge ? (
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-black tracking-wide uppercase shadow-sm shrink-0 ${item.value === 'At Risk' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.value}
                  </span>
                ) : (
                  <span className="text-[14px] font-black text-slate-800 shrink-0">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cột 3 & 4: Biểu đồ Project Status Distribution */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm hover:shadow-md border border-slate-200 transition-all duration-300 flex flex-col min-h-[300px]">
          <div className="flex justify-between items-start mb-6 shrink-0">
            <h3 className="font-bold text-[15px] text-slate-700">Project Status Distribution</h3>
            <button className="text-slate-400 hover:text-indigo-600 p-1"><MoreVertical size={18} /></button>
          </div>
          
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} 
                  ticks={[0, 10, 20, 50]} 
                  domain={[0, 50]}
                />
                
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                />
                
                <Bar dataKey="value" barSize={45} radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;