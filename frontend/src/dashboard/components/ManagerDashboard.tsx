import React, { useMemo } from 'react';
import { 
  LineChart, Line, 
  BarChart, Bar, 
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { MoreVertical } from 'lucide-react';

const ManagerDashboard = ({ data }: { data: any }) => {
  if (!data) return null;

  // ✅ CLEAN: Destructuring từ data thật trong dashboardApi
  const {
    weekly_progress: weeklyProgress = [],
    task_completion_by_team: teamCompletion = [],
    ai_vs_actual_points: aiVsActual = []
  } = data;

  // ✅ CLEAN: Tính toán trung bình tỷ lệ hoàn thành
  const avgCompletion = useMemo(() => {
    if (!teamCompletion.length) return 0;
    const total = teamCompletion.reduce(
      (sum: number, team: any) => sum + (team.percentage || 0),
      0
    );
    return (total / teamCompletion.length).toFixed(1);
  }, [teamCompletion]);

  // Bộ màu chuẩn Enterprise
  const TEAM_COLORS = ['#1d4ed8', '#f59e0b', '#10b981', '#334155', '#8b5cf6'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 font-sans animate-in fade-in duration-500 pb-10">
      
      {/* ================= CỘT 1: LINE CHART (Weekly Progress) ================= */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[420px]">
        <div className="flex justify-between items-start mb-2 shrink-0">
          <h3 className="font-bold text-[15px] text-slate-800">Project Progress Across Active Projects</h3>
          <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
        </div>
        
        {/* Legend bám sát các dự án trong file API */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6 shrink-0 text-[11px] font-semibold text-slate-600">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#0284c7]"></div>Fluxboard</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div>Potpan</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#be123c]"></div>Project C</div>
        </div>

        <div className="flex-1 w-full relative -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyProgress}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} />
              <Tooltip cursor={{stroke: '#cbd5e1', strokeDasharray: '3 3'}} contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0'}} />
              
              <Line type="monotone" dataKey="fluxboard" stroke="#0284c7" strokeWidth={2.5} dot={false} activeDot={{r: 5}} />
              <Line type="monotone" dataKey="potpan" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{r: 5}} />
              <Line type="monotone" dataKey="projectC" stroke="#be123c" strokeWidth={2.5} dot={false} activeDot={{r: 5}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ================= CỘT 2: DONUT CHART (Completion Rate) ================= */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[420px]">
        <div className="flex justify-between items-start mb-2 shrink-0">
          <h3 className="font-bold text-[15px] text-slate-800">Task Completion Rate by Team</h3>
          <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
        </div>

        <div className="flex-1 w-full relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={teamCompletion}
                cx="50%" cy="50%"
                innerRadius={65} outerRadius={90}
                paddingAngle={2}
                dataKey="percentage"
                nameKey="team"
                stroke="none"
              >
                {teamCompletion.map((_: any, index: number) => (
                  <Cell key={index} fill={TEAM_COLORS[index % TEAM_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value}%`, 'Hoàn thành']} />
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center mt-2">
            <span className="text-[24px] font-black text-slate-800 leading-none">{avgCompletion}%</span>
            <span className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Avg Rate</span>
          </div>
        </div>

        {/* Danh sách team hiển thị đầy đủ (không slice) */}
        <div className="shrink-0 pt-4 mt-2 border-t border-slate-100 h-[100px] overflow-y-auto pr-1 no-scrollbar">
          <div className="space-y-3">
            {teamCompletion.map((team: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: TEAM_COLORS[idx % TEAM_COLORS.length] }}></div>
                  <span className="text-[13px] font-bold text-slate-700">{team.team}</span>
                </div>
                <span className="text-[14px] font-black text-slate-800">{team.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= CỘT 3: BAR CHART (AI Prediction) ================= */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[420px]">
        <div className="flex justify-between items-start mb-4 shrink-0">
          <h3 className="font-bold text-[15px] text-slate-800">AI Prediction</h3>
          <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
        </div>

        <div className="shrink-0 mb-6 space-y-2">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-slate-800">
            <div className="w-3 h-3 rounded-sm bg-[#1e3a8a]"></div> AI Suggested Points
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-slate-600">
            <div className="w-3 h-3 rounded-sm bg-[#10b981]"></div> Actual Points per Task
          </div>
        </div>

        <div className="flex-1 w-full relative -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aiVsActual}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="task_id" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              
              <Bar dataKey="ai_point" fill="#1e3a8a" barSize={25} radius={[2, 2, 0, 0]} />
              <Bar dataKey="actual_point" fill="#10b981" barSize={25} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default ManagerDashboard;