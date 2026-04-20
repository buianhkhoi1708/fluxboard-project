import React from 'react';
import { PieChart, Pie, ResponsiveContainer, Cell } from 'recharts';
import { Clock } from 'lucide-react';

const MemberDashboard = ({ data }: { data: any }) => {
  if (!data) return null;

  const focusTasks = Array.isArray(data?.my_focus) ? data.my_focus : [];
  
  // Xử lý an toàn cho phép chia
  const completed = Number(data?.my_contribution?.completed) || 0;
  const total = Number(data?.my_contribution?.total) || 1; 
  const rawPercent = Math.round((completed / total) * 100);
  const safePercent = Math.max(0, Math.min(100, rawPercent)); 

  const pieData = [ 
    { name: 'Done', value: safePercent, fill: '#6366f1' }, 
    { name: 'Left', value: 100 - safePercent, fill: '#e2e8f0' } 
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6"><Clock className="w-5 h-5 text-indigo-500" /> Công việc của tôi</h2>
        <div className="space-y-3">
          {focusTasks.length === 0 ? (
             <p className="text-slate-500 p-4 bg-slate-50 rounded-xl text-center">Xong hết việc rồi! Nghỉ tay thôi.</p>
          ) : focusTasks.map((task: any) => (
            <div key={task.id} className={`p-4 rounded-xl border flex justify-between bg-slate-50 ${task.priority === 'HIGH' || task.priority === 'CRITICAL' ? 'border-rose-300' : 'border-slate-200'}`}>
              <div>
                <p className="font-bold text-slate-700">{task.title}</p>
                <p className="text-xs text-slate-500 mt-1">Hạn: <span className="font-medium text-slate-600">{task.due_date}</span></p>
              </div>
              {(task.priority === 'HIGH' || task.priority === 'CRITICAL') && (
                 <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded-md h-fit">Gấp</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 text-center mb-6">Tiến độ Sprint</h2>
        <div className="h-[200px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="70%" startAngle={180} endAngle={0} innerRadius={70} outerRadius={90} dataKey="value" stroke="none">
                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-4xl font-black text-slate-800">{safePercent}%</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default MemberDashboard;