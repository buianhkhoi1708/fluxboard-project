import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, LayoutDashboard, ShieldAlert, Activity } from 'lucide-react';

const AdminDashboard = ({ data }: { data: any }) => {
  if (!data) return null;

  // Bọc áo giáp: Nếu không có data thì lấy mảng rỗng [] hoặc số 0
  const projectStatus = data?.projectStatus || [];
  const auditLogs = data?.auditLogs || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><Users size={24} /></div>
          <div><p className="text-sm text-slate-500 font-medium">Total Users</p><p className="text-2xl font-bold text-slate-800">{data?.totalUsers || 0}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><LayoutDashboard size={24} /></div>
          <div><p className="text-sm text-slate-500 font-medium">Active Projects</p><p className="text-2xl font-bold text-slate-800">{data?.activeProjects || 0}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-xl"><ShieldAlert size={24} /></div>
          <div><p className="text-sm text-slate-500 font-medium">Security Alerts</p><p className="text-2xl font-bold text-rose-600">{data?.securityAlerts || 0}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Project Status</h2>
          {projectStatus.length === 0 ? (
            <div className="flex justify-center items-center h-[300px] text-slate-400">Chưa có dữ liệu dự án</div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectStatus} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontWeight: 600}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px'}} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={30}>
                    {projectStatus.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-500" /> Audit Logs</h2>
          <div className="space-y-4">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có bản ghi nào.</p>
            ) : (
              auditLogs.map((log: any) => (
                <div key={log.id} className="border-b border-slate-100 pb-3 last:border-0">
                  <p className="text-sm font-semibold text-slate-700">{log.action}</p>
                  <p className="text-xs text-slate-500 mt-1"><span className="font-medium text-slate-600">{log.user}</span> → {log.target}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;