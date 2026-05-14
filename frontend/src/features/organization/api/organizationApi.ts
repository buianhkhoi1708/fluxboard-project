import axiosClient from '../../../lib/axiosClient';

export const orgApi = {
  /* =========================
     DEPARTMENTS & TREE
  ========================= */
  getOrgTree: (params?: any) =>
    axiosClient.get('/organizations/departments', { params }),

  createDepartment: (payload: any) =>
    axiosClient.post('/organizations/departments', payload),
  
  getDepartmentHierarchy: (id: string) => 
    axiosClient.get(`/organizations/departments/${id}/detail`),

  /* =========================
     TEAMS
  ========================= */
  createTeam: (payload: any) =>
    axiosClient.post('/organizations/teams', payload),

  // 🚀 THÊM MỚI: API Sửa Team (Đổi tên, đổi phòng ban, gán Leader)
  updateTeam: (teamId: string, payload: any) =>
    axiosClient.put(`/organizations/teams/${teamId}`, payload),

  assignUserToTeam: (userId: string, teamId: string, departmentId: string) =>
    axiosClient.post(`/organizations/teams/${teamId}/members`, {
      user_id: userId,
      department_id: departmentId
    }),

  /* =========================
     USERS & SEARCH
  ========================= */
  searchOrgUsers: (keyword: string) =>
    axiosClient.get('/organizations/search', {
      params: { keyword }
    }),
    
  getUnassignedUsers: (params?: any) =>
    axiosClient.get('/users/unassigned', { params }),
};