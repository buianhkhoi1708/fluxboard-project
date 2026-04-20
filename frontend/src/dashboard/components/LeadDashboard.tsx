import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend 
} from 'recharts';
import { MoreVertical, AlertTriangle, Send } from 'lucide-react';

const OVERLOAD_THRESHOLD = 80;

const LeadDashboard = ({ data }: { data?: any }) => {
  // 👉 Safe data
  const teamWorkload = Array.isArray(data?.team_workload) ? data.team_workload : [];
  const hotspotsData = Array.isArray(data?.at_risk_tasks) ? data.at_risk_tasks : [];
  const activitiesData = Array.isArray(data?.recent_activities) ? data.recent_activities : [];

  // 👉 Transform workload
  const workloadData = useMemo(() => {
    return teamWorkload.map((d: any) => {
      const shortName = d?.name?.split(' ')?.pop() || 'N/A';

      const total = Number(d?.total_points) || 0;
      const part1 = Math.floor(total * 0.4);
      const part2 = Math.floor(total * 0.3);
      const part3 = total - part1 - part2;

      return { ...d, shortName, part1, part2, part3, total };
    });
  }, [teamWorkload]);

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 font-sans animate-in fade-in duration-500 pb-10">
      
      {/* ================= TEAM WORKLOAD ================= */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 xl:col-span-2 flex flex-col min-h-[450px]">
        
        <div className="flex justify-between items-start mb-6">
          <h3 className="font-bold text-[15px] text-slate-800">Team Workload Chart</h3>
          <div className="flex items-center gap-2">
            <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-md text-[11px] font-bold">
              At Risk
            </span>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[11px] font-bold">
              Transparency Index
            </span>
            <button className="text-slate-400 hover:text-slate-600 ml-1">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workloadData} margin={{ top: 20, right: 10, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="shortName" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />

              <Legend
                iconType="square"
                payload={[
                  { value: 'Story Points', type: 'square', color: '#1d4ed8' },
                  { value: 'Threshold', type: 'line', color: '#be123c' }
                ]}
              />

              <ReferenceLine 
                y={OVERLOAD_THRESHOLD} 
                stroke="#be123c" 
                strokeWidth={2} 
              />

              <Bar dataKey="part1" stackId="a" fill="#1d4ed8" barSize={40} />
              <Bar dataKey="part2" stackId="a" fill="#f59e0b" barSize={40} />
              <Bar dataKey="part3" stackId="a" fill="#10b981" barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ================= RIGHT SIDE ================= */}
      <div className="flex flex-col gap-6">
        
        {/* HOTSPOTS */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold text-[15px] text-slate-800">Hotspots</h3>
            <MoreVertical size={18} />
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {hotspotsData.length === 0 ? (
              <p className="text-sm text-slate-500">Mọi thứ ổn định.</p>
            ) : (
              hotspotsData.map((spot: any) => (
                <div key={spot.id} className="flex justify-between items-center p-3 border rounded-lg relative">
                  
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-600"></div>

                  <div className="flex items-start gap-3 pl-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <div>
                      <p className="font-bold text-[13px]">{spot.title}</p>
                      <p className="text-[11px] text-rose-600">{spot.reason}</p>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500">
                    {spot?.due_date 
                      ? new Date(spot.due_date).toLocaleDateString() 
                      : 'N/A'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ACTIVITY */}
        <div className="bg-white p-5 rounded-xl shadow-sm border flex flex-col h-[200px]">
          <div className="flex justify-between mb-4">
            <h3 className="font-bold text-[15px]">Activity</h3>
            <MoreVertical size={18} />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {activitiesData.map((act: any, idx: number) => (
              <div key={idx} className="text-[13px]">
                <b>{act?.user || 'Unknown'}</b>: "{act?.content || ''}"
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              className="flex-1 border rounded-full px-3 py-1 text-sm"
              placeholder="Add comment..."
            />
            <Send size={14} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default LeadDashboard;