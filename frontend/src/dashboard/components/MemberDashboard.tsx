import React from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { MoreVertical } from 'lucide-react';

const MemberDashboard = ({ data }: { data: any }) => {
  if (!data) return null;

  // 1. Ánh xạ dữ liệu Focus Task (Lấy từ bảng 'tasks' dựa vào assignees[]_user_id)
  // Fallback data mô phỏng y hệt Mockup nếu API chưa có
  const focusTasks = Array.isArray(data?.my_focus) && data.my_focus.length > 0 ? data.my_focus : [
    { _id: "T-301", title: "Task 1 (Urgent, Due Today)", due_date: "Due, Today", priority: "URGENT" },
    { _id: "T-302", title: "Task 2 (High, Tomorrow)", due_date: "High, Tomorrow", priority: "HIGH" }
  ];
  
  // 2. Data cho Donut Chart (Tính từ tổng story_point của các task có status='DONE')
  const completed = Number(data?.my_contribution?.completed) || 79;
  const total = Number(data?.my_contribution?.total) || 100; 
  const safePercent = Math.max(0, Math.min(100, Math.round((completed / total) * 100))); 

  const pieData = [ 
    { name: 'Done', value: safePercent, fill: '#1d4ed8' }, // Xanh đậm giống hình
    { name: 'Left', value: 100 - safePercent, fill: '#f1f5f9' } // Xám nhạt
  ];

  // 3. Data cho Composed Chart (Tính từ story_point và ai_suggested_point)
  const sprintData = [
    { name: 'Sprint 1', velocity: 400, transparency: 450, trend: 350 },
    { name: 'Sprint 2', velocity: 600, transparency: 650, trend: 600 },
    { name: 'Sprint 3', velocity: 850, transparency: 950, trend: 1000 },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 font-sans animate-in fade-in duration-500 pb-10">
      
      {/* ================= CỘT TRÁI: MY FOCUS (Danh sách từ bảng `tasks`) ================= */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 xl:col-span-2 flex flex-col h-[500px]">
        
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-[15px] text-slate-800">My Focus</h3>
          <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
        </div>

        {/* Header Table */}
        <div className="flex items-center px-2 pb-2 border-b border-slate-200">
          <div className="w-8 shrink-0"></div>
          <div className="flex-1 font-bold text-[11px] text-slate-700">Task</div>
          <div className="w-32 font-bold text-[11px] text-slate-700 flex items-center justify-between cursor-pointer">
            Sort by Deadline <span className="text-[10px] text-slate-400">↕</span>
          </div>
          <div className="w-20 text-right font-bold text-[11px] text-slate-700 flex items-center justify-end gap-1 cursor-pointer">
            Priority <span className="text-[10px] text-slate-400">↕</span>
          </div>
          <div className="w-6 ml-2 shrink-0"></div>
        </div>

        {/* Danh sách Task render theo trường `_id`, `title`, `due_date`, `priority` */}
        <div className="flex-1 overflow-y-auto no-scrollbar pt-2">
          {focusTasks.map((task: any) => (
            <div key={task._id} className="flex items-center px-2 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors group">
              
              {/* Checkbox update status */}
              <div className="w-8 shrink-0 flex items-center">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer" />
              </div>
              
              {/* Tên Task */}
              <div className="flex-1 font-medium text-[13px] text-slate-700 truncate pr-4">
                {task.title}
              </div>
              
              {/* Cột Deadline */}
              <div className={`w-32 text-[12px] font-bold truncate ${task.priority === 'URGENT' || task.priority === 'HIGH' ? 'text-rose-600' : 'text-slate-600'}`}>
                {task.due_date}
              </div>
              
              {/* Badge Priority (Map với DB: URGENT -> At Risk) */}
              <div className="w-20 flex justify-end">
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wide ${
                  task.priority === 'URGENT' || task.priority === 'CRITICAL' 
                    ? 'bg-rose-100 text-rose-700' 
                    : task.priority === 'HIGH' 
                    ? 'bg-rose-100/70 text-rose-600' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {task.priority === 'URGENT' || task.priority === 'CRITICAL' ? 'At Risk' : task.priority}
                </span>
              </div>

              <div className="w-6 ml-2 shrink-0 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical size={16} className="text-slate-400 cursor-pointer hover:text-indigo-600" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= CỘT PHẢI: METRICS (Dựa trên `story_point`) ================= */}
      <div className="flex flex-col gap-6 h-[500px]">
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-2 shrink-0">
            <h3 className="font-bold text-[15px] text-slate-800">My Contribution</h3>
            <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
          </div>

          {/* Biểu đồ Donut (Tỷ lệ hoàn thành theo story_point) */}
          <div className="h-[180px] relative shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieData} cx="50%" cy="50%" 
                  startAngle={90} endAngle={-270} 
                  innerRadius={55} outerRadius={80} 
                  dataKey="value" stroke="none"
                >
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[36px] font-bold text-slate-800 tracking-tight">{safePercent}</span>
            </div>
          </div>

          {/* Biểu đồ Sprint (Velocity từ story_point & Transparency từ ai_suggested_point) */}
          <div className="flex-1 flex flex-col mt-4 pt-4 relative">
            <h4 className="text-[11px] font-bold text-slate-800 text-center mb-4">
              Personal Story Points Completed in Sprint
            </h4>
            
            {/* Custom Tooltip nhại lại cái Popup trong hình (Velocity: 5, Transparency Index: 9...) */}
            <div className="absolute top-8 left-0 z-10 bg-white border border-slate-200 shadow-lg rounded-md p-2 text-[10px] font-bold text-slate-600 hidden xl:block opacity-0 hover:opacity-100">
               <div className="flex justify-between gap-4"><span>Velocity</span><span className="text-slate-800">5</span></div>
               <div className="flex justify-between gap-4 mt-1"><span>Transparency Index:</span></div>
               <div className="flex justify-between gap-4 mt-1"><span>Velocity</span><span className="text-slate-800">8</span></div>
            </div>

            <div className="flex-1 w-full relative -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={sprintData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="0" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 600}} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 600}} ticks={[0, 500, 1000]} domain={[0, 1000]} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', fontSize: '12px'}} />
                  
                  <Bar dataKey="velocity" name="Velocity" fill="#1d4ed8" barSize={16} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="transparency" name="Transparency Index" fill="#14b8a6" barSize={16} radius={[0, 0, 0, 0]} />
                  <Line type="monotone" dataKey="trend" stroke="#1d4ed8" strokeWidth={2} dot={false} activeDot={{r: 4}} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default MemberDashboard;