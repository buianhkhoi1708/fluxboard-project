import React from 'react';
import { PieChart, Pie, ResponsiveContainer, Cell } from 'recharts';
import { Clock } from 'lucide-react';

const MemberDashboard = ({ data }: { data: any }) => {
  // 1. Chống sập nếu không có prop data truyền vào
  if (!data) {
    return (
      <div className="flex justify-center items-center h-[300px] text-slate-400 font-medium">
        Đang chờ dữ liệu thành viên...
      </div>
    );
  }

  // 2. Bọc áo giáp cho Mảng (Bảo vệ hàm .map)
  const focusTasks = Array.isArray(data?.focusTasks) ? data.focusTasks : [];

  // 3. Bọc áo giáp cực mạnh cho Số (Chống NaN làm sập PieChart)
  const rawPercent = Number(data?.completionPercentage);
  const percent = isNaN(rawPercent) ? 0 : rawPercent; // Nếu không phải số, ép về 0 ngay lập tức
  
  // Đảm bảo số phần trăm luôn nằm trong khoảng 0 đến 100
  const safePercent = Math.max(0, Math.min(100, percent)); 

  const pieData = [ 
    { name: 'Done', value: safePercent, fill: '#6366f1' }, 
    { name: 'Left', value: 100 - safePercent, fill: '#e2e8f0' } 
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      
      {/* CỘT TRÁI: DANH SÁCH TASK */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-indigo-500" /> My Focus
        </h2>
        
        <div className="space-y-3">
          {focusTasks.length === 0 ? (
             <p className="text-slate-500 p-4 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200">
               Bạn không có task nào đang chờ.
             </p>
          ) : (
            focusTasks.map((task: any, index: number) => (
              // Thêm dự phòng index nếu task.id bị trùng hoặc không có
              <div key={task?.id || index} className="p-4 rounded-xl border flex justify-between bg-slate-50 border-slate-200 hover:border-indigo-300 transition-colors">
                <p className="font-bold text-slate-700">{task?.title || 'Không có tiêu đề'}</p>
                {task?.urgent && (
                   <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded-md">Gấp</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* CỘT PHẢI: BIỂU ĐỒ ĐỒNG HỒ ĐO */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 text-center mb-6">Contribution</h2>
        <div className="h-[200px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={pieData} 
                cx="50%" 
                cy="70%" 
                startAngle={180} 
                endAngle={0} 
                innerRadius={70} 
                outerRadius={90} 
                dataKey="value" 
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Chữ % ở giữa biểu đồ */}
          <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-4xl font-black text-slate-800">{safePercent}%</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default MemberDashboard;