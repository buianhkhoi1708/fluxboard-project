import React from 'react';
import { LineChart, Line, PieChart, Pie, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Zap } from 'lucide-react';

const ManagerDashboard = ({ data }: { data: any }) => {
  if (!data) return null;

  const sprintProgress = data?.sprintProgress || [];
  const teamCompletion = data?.teamCompletion || [];
  const aiVsActual = data?.aiVsActual || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
        <h2 className="text-lg font-bold text-slate-800 mb-6">Sprint Progress</h2>
        {sprintProgress.length === 0 ? <p className="text-slate-400 text-center">Chưa có dữ liệu</p> : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sprintProgress}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="sprint" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{borderRadius: '12px'}} />
                <Legend verticalAlign="top" iconType="circle" />
                <Line type="monotone" dataKey="projectA" stroke="#6366f1" strokeWidth={3} dot={{r: 4}} />
                <Line type="monotone" dataKey="projectB" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Team Completion</h2>
        {teamCompletion.length === 0 ? <p className="text-slate-400 text-center">Chưa có dữ liệu</p> : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={teamCompletion} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {teamCompletion.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.fill || '#6366f1'} />)}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '12px'}} />
                <Legend verticalAlign="bottom" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-3">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> AI Prediction vs Actual</h2>
        {aiVsActual.length === 0 ? <p className="text-slate-400 text-center">Chưa có dữ liệu dự đoán AI</p> : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={aiVsActual}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="task" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{borderRadius: '12px'}} />
                <Legend iconType="circle" />
                <Bar dataKey="actual" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={40} />
                <Line type="monotone" dataKey="aiPredicted" stroke="#f59e0b" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;