import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { Clock, AlertCircle, LayoutDashboard, Server, Users, FolderX } from 'lucide-react';

const THRESHOLD = 80;

const mockWorkloadData = [
  { name: 'Hán Long', points: 65 },
  { name: 'Dev Frontend', points: 95 }, // Quá tải (> 80)
  { name: 'Dev Backend', points: 40 },
  { name: 'Tester', points: 85 },     // Quá tải (> 80)
];

const mockTasks = [
  { id: 1, title: 'Fix bug Login', dueDate: new Date(Date.now() + 10 * 3600 * 1000).toISOString() }, // Còn 10h (Sắp hạn)
  { id: 2, title: 'Dựng API Tạo Task', dueDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString() }, // Còn 48h (Bình thường)
  { id: 3, title: 'Thiết kế Database', dueDate: new Date(Date.now() + 2 * 3600 * 1000).toISOString() }, // Còn 2h (Cực gấp)
];

const mockEmptyTasks: any[] = []; // Dùng để test Empty State

// Hàm tính toán xem task có sắp đến hạn (< 24h) không
const isUrgent = (dateString: string) => {
  const hoursLeft = (new Date(dateString).getTime() - Date.now()) / (1000 * 60 * 60);
  return hoursLeft > 0 && hoursLeft < 24;
};

// ==========================================
// 2. COMPONENT: EMPTY STATE
// ==========================================
const EmptyState = ({ title, message }: { title: string, message: string }) => (
  <div className="flex flex-col items-center justify-center p-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center w-full h-full min-h-[200px]">
    <div className="bg-white p-4 rounded-full shadow-sm border border-slate-100 mb-4">
      <FolderX className="w-8 h-8 text-slate-400" />
    </div>
    <h3 className="text-lg font-bold text-slate-700 mb-1">{title}</h3>
    <p className="text-sm text-slate-500 max-w-xs">{message}</p>
  </div>
);

// ==========================================
// 3. WIDGETS
// ==========================================

// Widget: My Focus (Hiển thị cho tất cả)
const MyFocusWidget = ({ tasks }: { tasks: any[] }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Clock className="w-5 h-5 text-indigo-500" /> My Focus
    </h2>
    
    {tasks.length === 0 ? (
      <EmptyState title="Không có công việc" message="Bạn đã hoàn thành mọi task. Hãy tận hưởng ngày làm việc!" />
    ) : (
      <div className="space-y-3 overflow-y-auto pr-2">
        {tasks.map(task => {
          const urgent = isUrgent(task.dueDate);
          return (
            <div 
              key={task.id} 
              // Gắn viền đỏ nếu < 24h
              className={`p-4 rounded-xl border transition-all flex justify-between items-center bg-slate-50
                ${urgent ? 'border-rose-400 shadow-sm shadow-rose-100' : 'border-slate-200 hover:border-indigo-300'}`}
            >
              <div>
                <p className="font-semibold text-slate-700 text-sm">{task.title}</p>
                <p className={`text-xs mt-1 ${urgent ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>
                  Hạn: {new Date(task.dueDate).toLocaleString('vi-VN')}
                </p>
              </div>
              {/* Badge cảnh báo */}
              {urgent && (
                <span className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded-md">
                  <AlertCircle className="w-3.5 h-3.5" /> Gấp
                </span>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
);

// Widget: Workload Chart (Dùng Recharts - Đổi màu đỏ nếu > Threshold)
const WorkloadChartWidget = () => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <Users className="w-5 h-5 text-indigo-500" /> Biểu đồ Workload
      </h2>
      <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
        Ngưỡng cảnh báo: {THRESHOLD} pts
      </span>
    </div>

    {mockWorkloadData.length === 0 ? (
      <EmptyState title="Chưa có dữ liệu" message="Không có thông số thành viên nào để vẽ biểu đồ." />
    ) : (
      <div className="flex-1 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mockWorkloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="points" radius={[6, 6, 0, 0]} maxBarSize={50}>
              {/* Xử lý đổi màu Bar sang Đỏ (rose-500) nếu điểm > ngưỡng */}
              {mockWorkloadData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.points > THRESHOLD ? '#f43f5e' : '#6366f1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

// Widget: System Stats (Chỉ dành cho Admin)
const SystemStatsWidget = () => (
  <div className="grid grid-cols-2 gap-4">
    <div className="bg-indigo-600 p-5 rounded-2xl shadow-md text-white">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-white/20 rounded-lg"><Server className="w-5 h-5" /></div>
        <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded">Live</span>
      </div>
      <p className="text-3xl font-bold">99.9%</p>
      <p className="text-indigo-200 text-sm mt-1">Uptime Server</p>
    </div>
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><LayoutDashboard className="w-5 h-5" /></div>
      </div>
      <p className="text-3xl font-bold text-slate-800">124</p>
      <p className="text-slate-500 text-sm mt-1">Total Projects</p>
    </div>
  </div>
);

// ==========================================
// 4. MAIN PAGE & TRẠM KIỂM SOÁT (RBAC)
// ==========================================
const DashboardPage = () => {
  // GIẢ LẬP STORE: (Trong thực tế bạn lấy từ useAuthStore)
  // const { role } = useAuthStore();
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('ADMIN'); // Tool test nhanh quyền

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full h-full overflow-y-auto bg-slate-50">
      
      {/* HEADER & TEST TOOL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        
        {/* Nút giả lập quyền để bạn dễ test (Sau này có thể xóa) */}
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button onClick={() => setRole('MEMBER')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${role === 'MEMBER' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            View as MEMBER
          </button>
          <button onClick={() => setRole('ADMIN')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${role === 'ADMIN' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            View as ADMIN
          </button>
        </div>
      </div>

      {/* ==================================================
        TRẠM KIỂM SOÁT PHÂN QUYỀN (RBAC LOGIC)
        Dùng toán tử && để bọc các Widget theo yêu cầu
        ==================================================
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cột trái (Chiếm 2 phần): Thống kê toàn cảnh (CHỈ ADMIN THẤY) */}
        {role === 'ADMIN' && (
          <div className="lg:col-span-2 space-y-6 flex flex-col">
            <SystemStatsWidget />
            <div className="flex-1 min-h-[350px]">
              <WorkloadChartWidget />
            </div>
          </div>
        )}

        {/* Cột phải (Hoặc Full ngang nếu là MEMBER): My Focus (AI CŨNG THẤY) */}
        <div className={`${role === 'MEMBER' ? 'lg:col-span-3' : 'lg:col-span-1'} min-h-[500px]`}>
          <MyFocusWidget tasks={mockTasks} /> 
          {/* Để test Empty State, bạn đổi mockTasks thành mockEmptyTasks */}
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;