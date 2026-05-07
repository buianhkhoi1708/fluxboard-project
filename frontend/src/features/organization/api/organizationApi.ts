import axiosClient from '../../../lib/axiosClient';

export interface DepartmentPayload {
  name: string;
  code: string;
  manager_id: string;
  manager_name?: string; 
  description?: string;
}

export interface TeamPayload {
  name: string;
  code: string;
  department_id: string;
  lead_id: string;
  lead_name?: string; 
  description?: string;
}

export const orgApi = {
  getOrgTree: async () => {
    return axiosClient.get('/departments/tree'); 
  },
  saveDepartment: async (payload: DepartmentPayload) => {
    return axiosClient.post('/departments', payload);
  },
  saveTeam: async (payload: TeamPayload) => {
    return axiosClient.post('/teams', payload);
  },
  assignUserToTeam: async (userId: string, teamId: string, departmentId: string) => {
    return axiosClient.post(`/teams/${teamId}/members`, { user_id: userId, department_id: departmentId });
  },
  getUnassignedUsers: async () => {
    return axiosClient.get('/users/unassigned');
  },
  searchOrgUsers: async (keyword: string) => {
    return axiosClient.get(`/users/search`, { params: { keyword } });
  }
};