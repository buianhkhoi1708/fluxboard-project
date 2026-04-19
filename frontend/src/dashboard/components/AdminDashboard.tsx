import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, LayoutDashboard, Building2, Activity } from 'lucide-react';

const AdminDashboard = ({ data }: { data: any }) => {
  if (!data) return null;

  const cards = data?.cards || {};
  const projectStatus = Array.isArray(data?.project_status_distribution) ? data.project_status_distribution : [];
  const auditLogs = Array.isArray(data?.audit_logs) ? data.audit_logs : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 3 Thẻ Metric */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><Users size={24} /></div>
          <div><p className="text-sm text-slate-500 font-medium">Tổng Users</p><p className="text-2xl font-bold text-slate-800">{cards.total_users || 0}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><LayoutDashboard size={24} /></div>
          <div><p className="text-sm text-slate-500 font-medium">Dự án Active</p><p className="text-2xl font-bold text-slate-800">{cards.active_projects || 0}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><Building2 size={24} /></div>
          <div><p className="text-sm text-slate-500 font-medium">Phòng ban</p><p className="text-2xl font-bold text-slate-800">{cards.total_departments || 0}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ Project Status */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Trạng thái Dự án</h2>
          {projectStatus.length === 0 ? <p className="text-slate-400 text-center">Chưa có dữ liệu</p> : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectStatus} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="status" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontWeight: 600, fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px'}} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={30}>
                    {projectStatus.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Audit Logs */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-500" /> Lịch sử hệ thống</h2>
          <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2">
            {auditLogs.length === 0 ? <p className="text-sm text-slate-500">Chưa có bản ghi nào.</p> : auditLogs.map((log: any) => (
              <div key={log.id} className="border-b border-slate-100 pb-3 last:border-0">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-semibold text-slate-700">{log.action}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${log.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                    {log.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1"><span className="font-medium text-slate-600">{log.actor_name}</span> → {log.target}</p>
                <p className="text-[10px] text-slate-400 mt-1">{new Date(log.created_at).toLocaleString('vi-VN')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;