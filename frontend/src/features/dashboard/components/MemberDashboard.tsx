import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { MoreVertical, Target, CheckCircle2, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { MemberDashboardData } from '../api/dashboardApi';

interface MemberDashboardProps {
  data: MemberDashboardData | null;
}

const MemberDashboard = ({ data }: MemberDashboardProps) => {
  if (!data) return null;

  // ==========================================
  // 🧠 RÚT TRÍCH DATA TỪ BACKEND DTO
  // ==========================================
  const contribution = data.my_contribution || { completed_tasks: 0, total_assigned: 0 };
  const focusBoard = data.my_focus_board || [];

  // Tính % hoàn thành
  const contributionPercent = useMemo(() => {
    if (!contribution.total_assigned) return 0;
    return Math.round((contribution.completed_tasks / contribution.total_assigned) * 100);
  }, [contribution]);

  // Sinh màu Badge cho Priority
  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Format ngày tháng cho gọn
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Chưa có hạn';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans animate-in fade-in zoom-in-95 duration-500 pb-10">
      
      {/* ================= CỘT TRÁI: TIẾN ĐỘ & DANH SÁCH TASK ================= */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        
        {/* BOX 1: MY CONTRIBUTION */}
        <div className="bg-white p-6 rounded-3xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-black text-lg text-slate-800 tracking-tight flex items-center gap-2">
                <Target size={20} className="text-indigo-600" /> Tiến Độ Của Tôi
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Task hoàn thành / Tổng được giao</p>
            </div>
            <button className="text-slate-300 hover:text-indigo-600 p-1"><MoreVertical size={18} /></button>
          </div>
          
          <div className="flex items-end gap-2 mb-3">
            <span className="text-[42px] font-black leading-none text-slate-800">{contribution.completed_tasks}</span>
            <span className="text-[16px] font-bold text-slate-400 mb-1">/ {contribution.total_assigned}</span>
          </div>
          
          <div className="w-full bg-slate-100 rounded-full h-3.5 mb-2 overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-1000 ease-out relative" 
              style={{ width: `${contributionPercent}%` }}
            >
              <div className="absolute inset-0 bg-white/20 w-full h-full rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-right text-[12px] font-bold text-indigo-600">Hoàn thành {contributionPercent}%</p>
        </div>

        {/* BOX 2: MY FOCUS BOARD */}
        <div className="bg-white p-6 rounded-3xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex-1 flex flex-col min-h-[300px] max-h-[500px]">
          <div className="flex justify-between items-start mb-5 shrink-0">
            <div>
              <h3 className="font-black text-lg text-slate-800 tracking-tight">Việc Cần Ưu Tiên</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Nhiệm vụ cấp bách sắp tới hạn</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-3">
            {focusBoard.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-70">
                 <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3 text-emerald-500"><CheckCircle2 size={24} /></div>
                 <p className="text-sm font-bold text-slate-600">Tuyệt vời! Bạn không có task tồn đọng.</p>
               </div>
            ) : (
              focusBoard.map((task) => (
                <div key={task.task_id} className="group p-3.5 border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all bg-slate-50/50 hover:bg-white cursor-pointer flex flex-col gap-2.5">
                  <div className="flex justify-between items-start gap-3">
                    <p className="text-[14px] font-bold text-slate-700 group-hover:text-indigo-700 leading-snug line-clamp-2">
                      {task.title}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                    <span className={`px-2 py-1 rounded-md border uppercase tracking-wider ${getPriorityStyles(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                      <Clock size={12} className={task.deadline_status === 'AT_RISK' ? 'text-amber-500' : 'text-slate-400'} /> 
                      {formatDate(task.due_date)}
                    </span>
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 shadow-sm">
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
      <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col min-h-[450px]">
        <div className="flex justify-between items-start mb-6 shrink-0">
          <div>
            <h3 className="font-black text-lg text-slate-800 tracking-tight">Sức Nặng Công Việc (Story Points)</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Khối lượng điểm của các task đang Focus</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500"><ShieldAlert size={20}/></div>
        </div>

        {focusBoard.length === 0 ? (
           <div className="flex-1 flex items-center justify-center text-sm font-bold text-slate-300 uppercase tracking-widest">
             Không có dữ liệu biểu đồ
           </div>
        ) : (
          <div className="flex-1 w-full relative -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={focusBoard} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                
                {/* Tên Task cắt ngắn để hiển thị trục X */}
                <XAxis 
                  dataKey="title" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} 
                  dy={10} 
                  tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val}
                />
                
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} 
                />
                
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.1)', fontWeight: 'bold' }} 
                  formatter={(value: number) => [`${value} Points`, 'Độ khó']}
                />
                
                {/* Thanh Bar đổi màu theo Priority của Task */}
                <Bar dataKey="story_point" radius={[6, 6, 0, 0]} barSize={40}>
                  {focusBoard.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.priority === 'CRITICAL' ? '#f43f5e' : entry.priority === 'HIGH' ? '#f59e0b' : '#6366f1'} 
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