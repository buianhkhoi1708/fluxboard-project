import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { AlertCircle, MessageSquare } from 'lucide-react';

const LeadDashboard = ({ data }: { data: any }) => {
  // Nếu data chưa có, không render gì cả để chống sập web
  if (!data) return null;

  // Đảm bảo có giá trị mặc định nếu API trả về thiếu
  const threshold = data?.overloadThreshold || 80;
  const workloadData = data?.teamWorkload || [];
  const hotspotsData = data?.hotspots || [];
  const activitiesData = data?.activities || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      
      {/* Biểu đồ Workload */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
        <h2 className="text-lg font-bold text-slate-800 mb-6">Team Workload</h2>
        
        {workloadData.length === 0 ? (
          <div className="flex justify-center items-center h-[350px] text-slate-400">Chưa có dữ liệu Workload</div>
        ) : (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px'}} />
                <ReferenceLine y={threshold} stroke="#ef4444" strokeDasharray="4 4" label={{ position: 'top', value: 'Quá tải', fill: '#ef4444' }} />
                <Bar dataKey="points" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {workloadData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.points > threshold ? '#f43f5e' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Cột bên phải: Hotspots & Activity */}
      <div className="space-y-6">
        
        {/* Hotspots */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 text-rose-600">
            <AlertCircle className="w-5 h-5" /> At-Risk Hotspots
          </h2>
          <div className="space-y-3">
            {hotspotsData.length === 0 ? (
              <p className="text-sm text-slate-500">Mọi thứ đang ổn định.</p>
            ) : (
              hotspotsData.map((spot: any) => (
                <div key={spot.id} className="p-3 border border-rose-200 bg-rose-50 rounded-xl">
                  <p className="font-bold text-slate-800 text-sm">{spot.title}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] font-bold bg-white text-rose-600 px-2 py-0.5 rounded border border-rose-100">{spot.status}</span>
                    <span className="text-[10px] font-bold bg-white text-amber-600 px-2 py-0.5 rounded border border-amber-100">{spot.priority}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Comments */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-500" /> Recent Activity
          </h2>
          <div className="text-sm text-slate-600 space-y-4">
            {activitiesData.length === 0 ? (
              <p className="text-slate-500">Chưa có hoạt động nào.</p>
            ) : (
              activitiesData.map((act: any) => (
                <p key={act.id}>💬 <span className="font-bold text-slate-800">{act.user}</span>: "{act.text}"</p>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default LeadDashboard;