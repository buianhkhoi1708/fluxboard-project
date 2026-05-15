import React, { memo } from "react";
import type { ReactNode } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { MoreVertical, Users, Building2, Network, ShieldAlert, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import type { AdminDashboardData } from "../api/dashboardApi";

// ==========================================
// STAT CARD COMPONENT
// ==========================================
interface StatCardProps {
  title: string;
  value?: string | number;
  icon?: ReactNode;
  subtitle?: string;
  className?: string;
}

const StatCard = ({ title, value, icon, subtitle, className = "" }: StatCardProps) => (
  <div className={`bg-white p-5 rounded-3xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/80 transition-all duration-300 hover:shadow-md flex flex-col ${className}`}>
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-2">
        {icon && <div className="p-2 bg-slate-50 text-slate-500 rounded-xl">{icon}</div>}
        <h3 className="font-bold text-[13px] uppercase tracking-wider text-slate-500">{title}</h3>
      </div>
      <button className="text-slate-300 hover:text-indigo-600 p-1 rounded-md transition-colors"><MoreVertical size={16} /></button>
    </div>
    
    <div className="mt-auto">
      {value !== undefined && <div className="text-[36px] leading-none font-black tracking-tight text-slate-800">{value}</div>}
      {subtitle && <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">{subtitle}</div>}
    </div>
  </div>
);

// ==========================================
// MAIN DASHBOARD COMPONENT
// ==========================================
interface AdminDashboardProps {
  data: AdminDashboardData | null;
}

const AdminDashboard = ({ data }: AdminDashboardProps) => {
  if (!data) return null;

  // 1. Lấy dữ liệu tổ chức (Organization KPI)
  const kpi = data.organization_kpi || { total_users: 0, total_departments: 0, total_teams: 0 };
  
  // 2. Lấy dữ liệu sức khỏe dự án (Deadline Health)
  const health = data.company_deadline_health || { on_track: 0, at_risk: 0, overdue: 0, total_extensions: 0 };
  
  // 3. Chuẩn bị dữ liệu cho Biểu đồ (Department Points)
  // Recharts cần mảng các object. Ta sẽ tính % hoàn thành để vẽ.
  const chartData = (data.department_points_distribution || []).map(dept => {
    // Sếp có thể thay dept.department_id thành Tên phòng ban nếu Backend join đủ dữ liệu
    const deptName = dept.department_id === "Unassigned" ? "Chưa gán" : `Dept ${dept.department_id.substring(0,4)}`;
    return {
      name: deptName,
      total: dept.total_points,
      completed: dept.completed_points,
      remaining: dept.total_points - dept.completed_points,
    };
  });

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-in fade-in zoom-in-95 duration-500 pb-10">
      
      {/* ================================== */}
      {/* ROW 1: TỔNG QUAN TỔ CHỨC (KPIs) */}
      {/* ================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard 
          title="Tổng Nhân Sự" 
          value={kpi.total_users.toLocaleString()} 
          icon={<Users size={20} />} 
          subtitle="Tài khoản hoạt động"
          className="border-b-4 border-b-indigo-500"
        />
        <StatCard 
          title="Phòng Ban" 
          value={kpi.total_departments.toLocaleString()} 
          icon={<Building2 size={20} />} 
          subtitle="Đang vận hành"
          className="border-b-4 border-b-emerald-500"
        />
        <StatCard 
          title="Đội Nhóm (Teams)" 
          value={kpi.total_teams.toLocaleString()} 
          icon={<Network size={20} />} 
          subtitle="Các dự án nhỏ"
          className="border-b-4 border-b-amber-500"
        />
      </div>

      {/* ================================== */}
      {/* ROW 2: BIỂU ĐỒ & DEADLINE HEALTH */}
      {/* ================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BẢNG THEO DÕI SỨC KHỎE DEADLINE (Bên Trái) */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col min-h-[380px]">
          <div className="flex justify-between items-start mb-6 shrink-0">
            <div>
              <h3 className="font-black text-lg text-slate-900 tracking-tight">Cảnh Báo Deadline</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">Sức khỏe toàn công ty</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><ShieldAlert size={20}/></div>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-4">
            {/* ON TRACK */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 transition-colors hover:bg-emerald-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm"><CheckCircle2 size={20}/></div>
                <div>
                  <div className="font-bold text-sm text-emerald-900">Đúng Tiến Độ</div>
                  <div className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest mt-0.5">On Track</div>
                </div>
              </div>
              <span className="text-2xl font-black text-emerald-600">{health.on_track}</span>
            </div>

            {/* AT RISK */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/50 border border-amber-100 transition-colors hover:bg-amber-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm"><AlertTriangle size={20}/></div>
                <div>
                  <div className="font-bold text-sm text-amber-900">Nguy Cơ Trễ</div>
                  <div className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest mt-0.5">At Risk</div>
                </div>
              </div>
              <span className="text-2xl font-black text-amber-600">{health.at_risk}</span>
            </div>

            {/* OVERDUE */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50/50 border border-rose-100 transition-colors hover:bg-rose-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm"><Clock size={20}/></div>
                <div>
                  <div className="font-bold text-sm text-rose-900">Đã Cháy Hạn</div>
                  <div className="text-[10px] font-bold text-rose-500/80 uppercase tracking-widest mt-0.5">Overdue</div>
                </div>
              </div>
              <span className="text-2xl font-black text-rose-600">{health.overdue}</span>
            </div>
            
            {/* THÔNG TIN PHỤ */}
            <div className="mt-2 text-center">
              <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                Tổng lượt xin gia hạn (Extensions): <strong className="text-indigo-600">{health.total_extensions}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* BIỂU ĐỒ STORY POINTS THEO PHÒNG BAN (Bên Phải) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col min-h-[380px]">
          <div className="flex justify-between items-start mb-6 shrink-0">
            <div>
              <h3 className="font-black text-lg text-slate-900 tracking-tight">Phân Bổ Điểm Số (Story Points)</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">So sánh điểm hoàn thành và điểm được giao theo phòng ban</p>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm font-bold text-slate-300 uppercase tracking-widest">
              Chưa có dữ liệu phòng ban
            </div>
          ) : (
            <div className="flex-1 w-full min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} 
                    dy={10} 
                  />
                  
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} 
                  />
                  
                  <Tooltip 
                    cursor={{ fill: "#f8fafc" }} 
                    contentStyle={{ borderRadius: "16px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px -5px rgba(0,0,0,0.1)", fontWeight: "bold", fontSize: "12px" }} 
                  />
                  
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", fontWeight: "bold", paddingTop: "20px" }} />
                  
                  {/* Cột Điểm Đã Hoàn Thành */}
                  <Bar dataKey="completed" name="Điểm hoàn thành" stackId="a" fill="#10b981" barSize={32} radius={[0, 0, 4, 4]} />
                  {/* Cột Điểm Còn Lại (Chưa xong) xếp chồng lên trên */}
                  <Bar dataKey="remaining" name="Điểm còn lại" stackId="a" fill="#e2e8f0" barSize={32} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default memo(AdminDashboard);