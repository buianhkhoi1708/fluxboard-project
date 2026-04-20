// src/features/dashboard/api/dashboardApi.ts

// Khi nào nối API thật, bạn mở comment dòng dưới này ra:
// import axiosClient from '../../../lib/axiosClient';

const mockData = {
 SYSTEM_ADMIN: {
    cards: {
      total_users: 1250,
      total_members: 1034, // Những người đang có dự án
      projects: {
        active: 45,
        archived: 10,
        total: 55
      },
      total_departments: 15
    },
    // Danh sách dự án đang bị báo động đỏ (At Risk)
    at_risk_projects: [
      { id: 'P1', name: 'Domnimors', status: 'At Risk' },
      { id: 'P2', name: 'Transparency status', status: 'At Risk' },
      { id: 'P3', name: 'Project projects', status: 'At Risk' }
    ],
    // Dữ liệu cho Bar Chart
    project_status_distribution: [
      { status: "Active", count: 45, color: "#3b82f6" },   // Màu xanh dương
      { status: "At Risk", count: 12, color: "#10b981" },  // Màu xanh lá
      { status: "Delayed", count: 7, color: "#f59e0b" },   // Màu cam
      { status: "Archived", count: 10, color: "#64748b" }  // Màu xám
    ],
    audit_logs: [
      { id: "LOG_1", action: "Admin changed user roles for Team Alpha", actor: "System" },
      { id: "LOG_2", action: "User 123 deleted project archives", actor: "User 123" }
    ]
  },
  MANAGER: {
    weekly_progress: [
      { week: "W14", fluxboard: 20, potpan: 15 },
      { week: "W15", fluxboard: 45, potpan: 35 },
      { week: "W16", fluxboard: 70, potpan: 55 },
      { week: "W17", fluxboard: 95, potpan: 80 }
    ],
    task_completion_by_team: [
      { team: "Frontend", percentage: 85 },
      { team: "Backend", percentage: 70 },
      { team: "Design", percentage: 92 }
    ],
    ai_vs_actual_points: [
      { task_id: "T-101", ai_point: 8, actual_point: 5 },
      { task_id: "T-102", ai_point: 13, actual_point: 13 },
      { task_id: "T-103", ai_point: 15, actual_point: 21 },
      { task_id: "T-104", ai_point: 5, actual_point: 8 }
    ]
  },
  LEAD: {
    team_workload: [
      { user_id: "U01", name: "Bùi Anh Khôi", total_points: 65 },
      { user_id: "U02", name: "Nguyễn Văn Mạnh", total_points: 95 },
      { user_id: "U03", name: "Lê Hồng Quang", total_points: 40 }
    ],
    at_risk_tasks: [
      { id: "T-202", title: "Fix bug Realtime", due_date: "2026-04-18", priority: "CRITICAL", reason: "OVERDUE" },
      { id: "T-205", title: "Deploy K8s", due_date: "2026-04-20", priority: "HIGH", reason: "STUCK" }
    ],
    recent_activities: [
      { user: "Mạnh", content: "Đã hoàn thành API Dashboard", time: "5 phút trước" },
      { user: "Quang", content: "Kẹt ở phần kéo thả UI", time: "20 phút trước" }
    ]
  },
  MEMBER: {
    my_contribution: { completed: 79, total: 100 },
    my_focus: [
      { id: "T-301", title: "Viết Unit Test cho Auth", priority: "HIGH", due_date: "Hôm nay" },
      { id: "T-302", title: "Update Documentation", priority: "MEDIUM", due_date: "Ngày mai" }
    ]
  }
};

export const dashboardApi = {
  getAdminMetrics: () => new Promise<any>(resolve => setTimeout(() => resolve({ data: mockData.SYSTEM_ADMIN }), 500)),
  getManagerMetrics: () => new Promise<any>(resolve => setTimeout(() => resolve({ data: mockData.MANAGER }), 500)),
  getLeadMetrics: () => new Promise<any>(resolve => setTimeout(() => resolve({ data: mockData.LEAD }), 500)),
  getMemberMetrics: () => new Promise<any>(resolve => setTimeout(() => resolve({ data: mockData.MEMBER }), 500)),
};