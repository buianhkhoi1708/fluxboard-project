import React, { useMemo } from 'react';
import { 
  BarChart, Bar, 
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { MoreVertical, AlertTriangle, ShieldAlert, Zap, Clock } from 'lucide-react';
import type { ManagerDashboardData } from '../api/dashboardApi';

interface ManagerDashboardProps {
  data: ManagerDashboardData | null;
}

const ManagerDashboard = ({ data }: ManagerDashboardProps) => {
  if (!data) return null;

  // 1. Rút data chuẩn từ API Backend
  const teamWorkload = data.team_workload_capacity || [];
  const atRiskTasks = data.at_risk_tasks || [];
  const aiEfficiency = data.ai_efficiency || [];

  // =====================================
  // XỬ LÝ DATA CHO DONUT CHART (WORKLOAD)
  // =====================================
  const workloadChartData = useMemo(() => {
    return teamWorkload.map(user => ({
      name: user.full_name,
      value: user.current_points,
      status: user.status
    }));
  }, [teamWorkload]);

  const totalPoints = workloadChartData.reduce((sum, item) => sum + item.value, 0);

  // Bộ màu cho Donut Chart
  const COLORS = ['#0284c7', '#f59e0b', '#be123c', '#10b981', '#8b5cf6', '#64748b', '#0ea5e9', '#f43f5e'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans animate-in fade-in zoom-in-95 duration-500 pb-10">
      
      {/* ================= CỘT 1: DONUT CHART (TEAM WORKLOAD) ================= */}
      <div className="bg-white p-6 rounded-3xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col min-h-[420px]">
        <div className="flex justify-between items-start mb-2 shrink-0">
          <div>
            <h3 className="font-black text-lg text-slate-800 tracking-tight">Khối lượng công việc</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Story points hiện tại của Team</p>
          </div>
          <button className="text-slate-300 hover:text-indigo-600 p-1"><MoreVertical size={18} /></button>
        </div>

        {workloadChartData.length === 0 ? (
           <div className="flex-1 flex items-center justify-center text-sm font-bold text-slate-300">Chưa có dữ liệu Team</div>
        ) : (
          <>
            <div className="flex-1 w-full relative flex items-center justify-center mt-2">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={workloadChartData}
                    cx="50%" cy="50%"
                    innerRadius={65} outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {workloadChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.status === 'OVERLOADED' ? '#ef4444' : COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value} Pts`, 'Đang gánh']} 
                    contentStyle={{borderRadius: '12px', border: '1px solid #f1f5f9', fontWeight: 'bold'}}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Text ở giữa Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1 text-center">
                <span className="text-[28px] font-black text-slate-800 leading-none">{totalPoints}</span>
                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Tổng Pts</span>
              </div>
            </div>

            {/* List User Workload */}
            <div className="shrink-0 pt-4 mt-2 border-t border-slate-50 h-[120px] overflow-y-auto pr-1 custom-scrollbar">
              <div className="space-y-3">
                {workloadChartData.map((user, idx) => (
                  <div key={idx} className="flex justify-between items-center group">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-sm ${user.status === 'OVERLOADED' ? 'bg-red-500 animate-pulse' : ''}`} style={user.status !== 'OVERLOADED' ? { backgroundColor: COLORS[idx % COLORS.length] } : {}}></div>
                      <span className="text-[13px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors line-clamp-1">{user.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                       {user.status === 'OVERLOADED' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-bold uppercase">Quá tải</span>}
                       <span className="text-[14px] font-black text-slate-800">{user.value} <span className="text-slate-400 text-[10px] font-medium">pts</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ================= CỘT 2: DANH SÁCH TASK CHÁY HẠN (THAY VÌ LINE CHART) ================= */}
      <div className="bg-white p-6 rounded-3xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col min-h-[420px]">
        <div className="flex justify-between items-start mb-4 shrink-0">
           <div>
            <h3 className="font-black text-lg text-slate-800 tracking-tight">Nguy Cơ Cháy Hạn</h3>
            <p className="text-xs text-rose-500 font-bold mt-0.5 flex items-center gap-1"><ShieldAlert size={12}/> Top 10 task khẩn cấp</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar">
           {atRiskTasks.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400"><Clock size={24}/></div>
                <p className="text-sm font-bold text-slate-500">Mọi thứ đang trong tầm kiểm soát</p>
             </div>
           ) : (
             <div className="space-y-3">
               {atRiskTasks.map((task, idx) => (
                 <div key={idx} className="p-3 bg-rose-50/50 border border-rose-100/50 rounded-2xl hover:bg-rose-50 transition-colors">
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                       <h4 className="text-[13px] font-bold text-slate-800 line-clamp-2 leading-tight">{task.title}</h4>
                       <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 uppercase">
                         {task.deadline_status === 'OVERDUE' ? 'Đã trễ' : 'Nguy hiểm'}
                       </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                       <span className="flex items-center gap-1"><AlertTriangle size={12} className="text-amber-500"/> Ưu tiên: <span className="text-slate-700">{task.priority}</span></span>
                       <span className="flex items-center gap-1">⏱️ Xin thêm: <span className="text-slate-700">{task.extension_count} lần</span></span>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>

      {/* ================= CỘT 3: BAR CHART (AI EFFICIENCY) ================= */}
      <div className="bg-white p-6 rounded-3xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col min-h-[420px]">
        <div className="flex justify-between items-start mb-6 shrink-0">
          <div>
            <h3 className="font-black text-lg text-slate-800 tracking-tight">AI vs Thực Tế</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">So sánh điểm AI gợi ý & điểm Chốt</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center"><Zap size={16}/></div>
        </div>

        {aiEfficiency.length === 0 ? (
           <div className="flex-1 flex items-center justify-center text-sm font-bold text-slate-300">AI chưa hoạt động</div>
        ) : (
          <>
            <div className="shrink-0 mb-4 space-y-2 flex justify-center gap-4">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div> AI Đoán
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div> Chốt
              </div>
            </div>

            <div className="flex-1 w-full relative -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aiEfficiency} margin={{top: 0, right: 0, left: -20, bottom: 0}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  
                  {/* Cắt ngắn Tên Task để hiển thị dưới trục X */}
                  <XAxis 
                    dataKey="task_title" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                    dy={10}
                    tickFormatter={(val) => val.substring(0, 5) + '..'} 
                  />
                  
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                  <Tooltip 
                     cursor={{fill: '#f8fafc'}} 
                     contentStyle={{borderRadius: '12px', border: '1px solid #f1f5f9', fontWeight: 'bold', fontSize: '12px'}}
                  />
                  
                  <Bar dataKey="ai_suggested_point" name="AI Dự Đoán" fill="#6366f1" barSize={14} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual_point" name="Điểm Chốt" fill="#34d399" barSize={14} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default ManagerDashboard;