import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { MoreVertical, Target, CheckCircle2, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { MemberDashboardData } from '../api/dashboardApi';

interface MemberDashboardProps {
  data: MemberDashboardData | null;
}

export const MemberDashboardSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 pb-10 md:pb-12 animate-pulse">
    {/* Cột trái */}
    <div className="lg:col-span-1 flex flex-col gap-5 md:gap-6 lg:gap-8">
      {/* Contribution skeleton */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 md:p-6 space-y-4">
        <div className="h-5 w-40 bg-slate-200 rounded-md" />
        <div className="h-10 md:h-12 w-20 md:w-24 bg-slate-200 rounded-md" />
        <div className="h-3 bg-slate-200 rounded-full" />
        <div className="h-3 w-16 bg-slate-200 rounded-md ml-auto" />
      </div>
      {/* Focus list skeleton */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 md:p-6 flex-1 space-y-4">
        <div className="h-5 w-36 bg-slate-200 rounded-md" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-3 md:p-4 rounded-xl bg-slate-100 space-y-2">
            <div className="h-4 w-3/4 bg-slate-200 rounded-md" />
            <div className="flex gap-2">
              <div className="h-3 w-14 bg-slate-200 rounded-md" />
              <div className="h-3 w-10 bg-slate-200 rounded-md" />
              <div className="h-3 w-10 bg-slate-200 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
    {/* Cột phải: Bar chart skeleton */}
    <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 md:p-6 space-y-4">
      <div className="h-5 w-48 bg-slate-200 rounded-md" />
      <div className="h-48 md:h-64 bg-slate-100 rounded-2xl" />
    </div>
  </div>
);

const MemberDashboard = ({ data }: MemberDashboardProps) => {
  if (!data) return <MemberDashboardSkeleton />;

  // ==========================================
  // 🧠 RÚT TRÍCH DATA TỪ BACKEND DTO
  // ==========================================
  const contribution = data.my_contribution || { completed_tasks: 0, total_assigned: 0 };
  const focusBoard = data.my_focus_board || [];

  const contributionPercent = useMemo(() => {
    if (!contribution.total_assigned) return 0;
    return Math.round((contribution.completed_tasks / contribution.total_assigned) * 100);
  }, [contribution]);

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Chưa có hạn';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 font-sans animate-in fade-in zoom-in-95 duration-700 pb-10 md:pb-12">
      
      {/* ================= CỘT TRÁI: TIẾN ĐỘ & DANH SÁCH TASK ================= */}
      <div className="lg:col-span-1 flex flex-col gap-5 md:gap-6 lg:gap-8">
        
        {/* BOX 1: MY CONTRIBUTION */}
        <div className="bg-gradient-to-b from-white to-indigo-50/20 p-5 md:p-6 lg:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="flex justify-between items-start mb-5 md:mb-6">
            <div>
              <h3 className="font-black text-lg md:text-xl text-slate-800 tracking-tight flex items-center gap-2">
                <Target size={22} className="text-indigo-600 md:w-6 md:h-6" /> Tiến Độ Của Tôi
              </h3>
              <p className="text-[12px] md:text-[13px] text-slate-400 font-medium mt-1">Task hoàn thành / Tổng được giao</p>
            </div>
            <button className="text-slate-300 hover:text-indigo-600 p-1 md:p-1.5 rounded-xl hover:bg-indigo-50 transition-colors">
              <MoreVertical size={18} className="md:w-5 md:h-5" />
            </button>
          </div>
          
          <div className="flex items-end gap-2 mb-3 md:mb-4">
            <span className="text-[42px] md:text-[52px] font-black leading-none tracking-tighter text-slate-800">{contribution.completed_tasks}</span>
            <span className="text-base md:text-lg font-bold text-slate-400 mb-1 md:mb-1.5">/ {contribution.total_assigned}</span>
          </div>
          
          <div className="w-full bg-slate-100 rounded-full h-3 md:h-4 mb-2.5 md:mb-3 overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-1000 ease-out relative" 
              style={{ width: `${contributionPercent}%` }}
            >
              <div className="absolute inset-0 bg-white/20 w-full h-full rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-right text-[12px] md:text-[13px] font-black text-indigo-600">Hoàn thành {contributionPercent}%</p>
        </div>

        {/* BOX 2: MY FOCUS BOARD */}
        <div className="bg-gradient-to-b from-white to-slate-50/40 p-5 md:p-6 lg:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex-1 flex flex-col min-h-[300px] md:min-h-[360px] max-h-[450px] md:max-h-[550px] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="flex justify-between items-start mb-4 md:mb-6 shrink-0">
            <div>
              <h3 className="font-black text-lg md:text-xl text-slate-800 tracking-tight">Việc Cần Ưu Tiên</h3>
              <p className="text-[12px] md:text-[13px] text-slate-400 font-medium mt-1">Nhiệm vụ cấp bách sắp tới hạn</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 md:pr-2 -mr-1 md:-mr-2 space-y-3 md:space-y-4">
            {focusBoard.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center opacity-70 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 py-6">
                 <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 text-emerald-500 shadow-sm"><CheckCircle2 size={28} className="md:w-8 md:h-8" strokeWidth={1.5} /></div>
                 <p className="text-[13px] md:text-[15px] font-bold text-slate-600 px-4">Tuyệt vời! Bạn không có task tồn đọng.</p>
               </div>
            ) : (
              focusBoard.map((task) => (
                <div key={task.task_id} className="group p-3 md:p-4 bg-white border border-slate-100 shadow-sm rounded-xl md:rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer flex flex-col gap-2.5 md:gap-3">
                  <div className="flex justify-between items-start gap-2 md:gap-3">
                    <p className="text-[13px] md:text-[15px] font-bold text-slate-800 group-hover:text-indigo-600 leading-snug line-clamp-2 transition-colors">
                      {task.title}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-[10px] md:text-[11px] font-bold">
                    <span className={`px-2 md:px-2.5 py-0.5 md:py-1 rounded-md border uppercase tracking-wider ${getPriorityStyles(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className="flex items-center gap-1 md:gap-1.5 text-slate-500 bg-slate-50 px-2 md:px-2.5 py-0.5 md:py-1 rounded-md border border-slate-100">
                      <Clock size={12} className={`md:w-3.5 md:h-3.5 ${task.deadline_status === 'AT_RISK' ? 'text-amber-500' : 'text-slate-400'}`} strokeWidth={2.5} /> 
                      {formatDate(task.due_date)}
                    </span>
                    <span className="text-indigo-700 bg-indigo-50 px-2 md:px-2.5 py-0.5 md:py-1 rounded-md border border-indigo-100">
                      {task.story_point} Pts
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ================= CỘT PHẢI: BIỂU ĐỒ SỨC NẶNG TASK ================= */}
      <div className="lg:col-span-2 bg-gradient-to-b from-white to-blue-50/10 p-5 md:p-6 lg:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col min-h-[380px] md:min-h-[480px] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <div className="flex justify-between items-start mb-6 md:mb-8 shrink-0">
          <div>
            <h3 className="font-black text-lg md:text-xl text-slate-800 tracking-tight">Sức Nặng Công Việc</h3>
            <p className="text-[12px] md:text-[13px] text-slate-400 font-medium mt-0.5 md:mt-1">Khối lượng điểm (Story Points) của các task đang Focus</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100 shrink-0">
            <ShieldAlert size={20} className="md:w-6 md:h-6" strokeWidth={2.5}/>
          </div>
        </div>

        {focusBoard.length === 0 ? (
           <div className="flex-1 flex items-center justify-center text-xs md:text-sm font-bold text-slate-300 uppercase tracking-widest bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 py-10">
             Không có dữ liệu biểu đồ
           </div>
        ) : (
          <div className="flex-1 w-full relative -ml-4 mt-1 md:mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={focusBoard} margin={{ top: 10, right: 0, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                
                <XAxis 
                  dataKey="title" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: isMobile ? 10 : 12, fontWeight: 700 }} 
                  dy={12} 
                  tickFormatter={(val) => val.length > (isMobile ? 5 : 8) ? val.substring(0, (isMobile ? 5 : 8)) + '...' : val}
                />
                
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: isMobile ? 10 : 12, fontWeight: 700 }} 
                  dx={-5}
                />
                
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: isMobile ? '12px' : '13px', padding: '10px 14px' }} 
                  formatter={(value: number) => [`${value} Points`, 'Độ khó']}
                />
                
                <Bar dataKey="story_point" radius={[8, 8, 0, 0]} barSize={isMobile ? 32 : 56}>
                  {focusBoard.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.priority === 'CRITICAL' ? '#f43f5e' : entry.priority === 'HIGH' ? '#f59e0b' : '#6366f1'} 
                      className="transition-all duration-300 hover:opacity-80 outline-none"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
};

export default MemberDashboard;