import axiosClient from '../../../lib/axiosClient';

export const orgApi = {
  /* =========================
     DEPARTMENTS & TREE
  ========================= */
  // SỬA LỖI 404: Gọi endpoint danh sách, không gọi /detail nữa
  getOrgTree: (params?: any) =>
    axiosClient.get('/organizations/departments', { params }),

  createDepartment: (payload: any) =>
    axiosClient.post('/organizations/departments', payload),

  /* =========================
     TEAMS
  ========================= */
  createTeam: (payload: any) =>
    axiosClient.post('/organizations/teams', payload),

  assignUserToTeam: (userId: string, teamId: string, departmentId: string) =>
    axiosClient.post(`/organizations/teams/${teamId}/members`, {
      user_id: userId,
      department_id: departmentId
    }),
  
  getDepartmentHierarchy: (id: string) => axiosClient.get(`/organizations/departments/${id}/detail`),

  /* =========================
     USERS & SEARCH
  ========================= */
  // SỬA LỖI searchOrgUsers is not a function
  searchOrgUsers: (keyword: string) =>
    axiosClient.get('/organizations/search', {
      params: { keyword }
    }),
    getUnassignedUsers: (params?: any) =>
    axiosClient.get('/users/unassigned', { params }),
};