// src/features/dashboard/api/dashboardApi.ts

// 1. TÁCH RIÊNG DỮ LIỆU MOCK CHO GỌN GÀNG
const mockData = {
  SYSTEM_ADMIN: {
    cards: {
      total_users: 1250,
      total_members: 1034,
      projects: { active: 45, archived: 10, total: 55 },
      total_departments: 15
    },
    at_risk_projects: [
      { id: 'P1', name: 'Domnimors', status: 'At Risk' },
      { id: 'P2', name: 'Transparency status', status: 'At Risk' },
      { id: 'P3', name: 'Project projects', status: 'At Risk' },
      { id: 'P4', name: 'Migration V2', status: 'Delayed' }
    ],
    project_status_distribution: [
      { status: "Total", count: 55, color: "#93c5fd" },
      { status: "Active", count: 45, color: "#3b82f6" },
      { status: "At Risk", count: 12, color: "#10b981" },
      { status: "Delayed", count: 7, color: "#f59e0b" },
      { status: "Archived", count: 10, color: "#64748b" }
    ],
    audit_logs: [
      { id: "LOG_1", action: "Admin changed user roles for Team Alpha", actor: "System" },
      { id: "LOG_2", action: "User 123 deleted project archives", actor: "User 123" }
    ]
  },

  MANAGER: {
    weekly_progress: [
      { week: "W14", fluxboard: 20, potpan: 15, projectC: 10 },
      { week: "W15", fluxboard: 45, potpan: 35, projectC: 25 },
      { week: "W16", fluxboard: 70, potpan: 55, projectC: 40 },
      { week: "W17", fluxboard: 95, potpan: 80, projectC: 85 }
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
      { id: "T-202", title: "Fix bug Realtime", due_date: "2026-04-18", priority: "CRITICAL", reason: "OVERDUE", assignee_name: "Khôi" },
      { id: "T-205", title: "Deploy K8s", due_date: "2026-04-20", priority: "HIGH", reason: "STUCK", assignee_name: "Mạnh" }
    ],
    recent_activities: [
      { user: "Mạnh", content: "Đã hoàn thành API Dashboard", time: "5 phút trước" },
      { user: "Quang", content: "Kẹt ở phần kéo thả UI", time: "20 phút trước" },
      { user: "Khôi", content: "Đã review code phần Auth", time: "1 giờ trước" }
    ]
  },

  MEMBER: {
    my_contribution: { completed: 79, total: 100 },
    my_focus: [
      { id: "T-301", title: "Viết Unit Test cho Auth", priority: "URGENT", due_date: "Due, Today" },
      { id: "T-302", title: "Update Documentation", priority: "MEDIUM", due_date: "Tomorrow" },
      { id: "T-303", title: "Fix CSS Mobile Responsive", priority: "HIGH", due_date: "22 Apr" }
    ],
    sprint_history: [
      { name: 'Sprint 1', velocity: 400, transparency: 450, trend: 350 },
      { name: 'Sprint 2', velocity: 600, transparency: 650, trend: 600 },
      { name: 'Sprint 3', velocity: 850, transparency: 950, trend: 1000 }
    ]
  }
};

// 2. HELPER FUNCTION: Tự động giả lập độ trễ API (Generic Type)
// Dùng Generic <T> giúp Typescript tự động nhận diện cấu trúc data trả về
const simulateApiCall = <T>(data: T, delayMs: number = 500): Promise<{ data: T }> => {
  return new Promise((resolve) => setTimeout(() => resolve({ data }), delayMs));
};

// 3. API OBJECT: Gọn gàng, dễ đọc, dễ bảo trì
export const dashboardApi = {
  getAdminMetrics:   () => simulateApiCall(mockData.SYSTEM_ADMIN),
  getManagerMetrics: () => simulateApiCall(mockData.MANAGER),
  getLeadMetrics:    () => simulateApiCall(mockData.LEAD),
  getMemberMetrics:  () => simulateApiCall(mockData.MEMBER),
};