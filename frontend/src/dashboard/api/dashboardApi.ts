// src/features/dashboard/api/dashboardApi.ts
// import axiosClient from '../../../lib/axiosClient';

// --- MOCK DATA ---
const mockData = {
  ADMIN: {
    totalUsers: 1248, activeProjects: 64, securityAlerts: 3,
    projectStatus: [ { name: 'On-Track', value: 45, color: '#10b981' }, { name: 'At-Risk', value: 12, color: '#f59e0b' }, { name: 'Delayed', value: 5, color: '#f43f5e' } ],
    auditLogs: [ { id: 1, action: 'Changed Role', user: 'Admin Hán Long', target: 'Dev_01 to MANAGER', time: '10 mins ago' }, { id: 2, action: 'Deleted Project', user: 'System', target: 'Old_Marketing_2024', time: '1 hour ago' } ]
  },
  MANAGER: {
    sprintProgress: [ { sprint: 'Sprint 1', projectA: 20, projectB: 15 }, { sprint: 'Sprint 2', projectA: 45, projectB: 30 }, { sprint: 'Sprint 3', projectA: 70, projectB: 50 } ],
    teamCompletion: [ { name: 'Frontend', value: 400, fill: '#6366f1' }, { name: 'Backend', value: 300, fill: '#8b5cf6' }, { name: 'QA', value: 200, fill: '#14b8a6' } ],
    aiVsActual: [ { task: 'T1', actual: 5, aiPredicted: 8 }, { task: 'T2', actual: 13, aiPredicted: 13 }, { task: 'T3', actual: 21, aiPredicted: 13 } ]
  },
  LEAD: {
    overloadThreshold: 80,
    teamWorkload: [ { name: 'Dev A', points: 65 }, { name: 'Dev B', points: 95 }, { name: 'Tester', points: 85 } ],
    hotspots: [ { id: 1, title: 'API Payment timeout', status: 'Overdue', priority: 'High' } ],
    activities: [ { id: 1, user: 'Dev B', text: 'Em đang kẹt ở đoạn Connect DB...' } ]
  },
  MEMBER: {
    completionPercentage: 79,
    focusTasks: [ { id: 1, title: 'Fix bug Login', dueDate: 'Hôm nay', urgent: true }, { id: 2, title: 'Dựng API', dueDate: 'Ngày mai', urgent: false } ]
  }
};

export const dashboardApi = {
  // Thay thế các Promise này bằng axiosClient khi có API thật
  getAdminMetrics: () => new Promise(res => setTimeout(() => res({ data: mockData.ADMIN }), 500)),
  getManagerMetrics: () => new Promise(res => setTimeout(() => res({ data: mockData.MANAGER }), 500)),
  getLeadMetrics: () => new Promise(res => setTimeout(() => res({ data: mockData.LEAD }), 500)),
  getMemberMetrics: () => new Promise(res => setTimeout(() => res({ data: mockData.MEMBER }), 500)),
};