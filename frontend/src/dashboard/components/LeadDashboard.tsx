import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { AlertCircle, MessageSquare } from 'lucide-react';

const LeadDashboard = ({ data }: { data: any }) => {
  if (!data) return null;

  const threshold = 80; 
  const workloadData = Array.isArray(data?.team_workload) ? data.team_workload : [];
  const hotspotsData = Array.isArray(data?.at_risk_tasks) ? data.at_risk_tasks : [];
  const activitiesData = Array.isArray(data?.recent_activities) ? data.recent_activities : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800">Khối lượng công việc (Workload)</h2>
          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">Ngưỡng: {threshold}pts</span>
        </div>
        
        {workloadData.length === 0 ? <p className="text-center text-slate-400">Chưa có dữ liệu</p> : (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px'}} />
                <ReferenceLine y={threshold} stroke="#ef4444" strokeDasharray="4 4" label={{ position: 'top', value: 'Quá tải', fill: '#ef4444', fontSize: 12 }} />
                <Bar dataKey="total_points" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {workloadData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.total_points > threshold ? '#f43f5e' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 text-rose-600">
            <AlertCircle className="w-5 h-5" /> Cảnh báo Task
          </h2>
          <div className="space-y-3">
            {hotspotsData.length === 0 ? <p className="text-sm text-slate-500">Mọi thứ ổn định.</p> : hotspotsData.map((spot: any) => (
              <div key={spot.id} className="p-3 border border-rose-200 bg-rose-50 rounded-xl">
                <p className="font-bold text-slate-800 text-sm">{spot.title}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] font-bold bg-white text-rose-600 px-2 py-0.5 rounded border border-rose-100">{spot.reason}</span>
                  <span className="text-[10px] font-bold bg-white text-amber-600 px-2 py-0.5 rounded border border-amber-100">{spot.priority}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-500" /> Hoạt động team
          </h2>
          <div className="text-sm text-slate-600 space-y-4">
            {activitiesData.length === 0 ? <p className="text-slate-500">Chưa có.</p> : activitiesData.map((act: any, idx: number) => (
              <div key={idx}>
                <p>💬 <span className="font-bold text-slate-800">{act.user}</span>: "{act.content}"</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{act.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDashboard;