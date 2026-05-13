import axiosClient from '../../../lib/axiosClient';
import { mockOrgTreeResponse, mockUnassignedUsersResponse } from './mockData';

// Tạo ID ảo để test
const generateFakeId = (prefix: string) => `${prefix}_${Math.random().toString(36).substring(2, 9)}`;

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
    return new Promise((resolve) => setTimeout(() => resolve(mockOrgTreeResponse), 800));
  },

  saveDepartment: async (payload: DepartmentPayload) => {
    return new Promise((resolve) => setTimeout(() => resolve({
      success: true,
      data: { id: generateFakeId('dept'), ...payload, teams: [] }
    }), 500));
  },

  saveTeam: async (payload: TeamPayload) => {
    return new Promise((resolve) => setTimeout(() => resolve({
      success: true,
      data: { id: generateFakeId('team'), ...payload, members: [] }
    }), 500));
  },

  assignUserToTeam: async (userId: string, teamId: string, departmentId: string) => {
    return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 400));
  },

  getUnassignedUsers: async () => {
    return new Promise((resolve) => setTimeout(() => resolve(mockUnassignedUsersResponse), 500));
  },

  searchOrgUsers: async (keyword: string) => {
    // Tạm thời trả về danh sách mock để test Search Leader
    return new Promise((resolve) => setTimeout(() => resolve(mockUnassignedUsersResponse), 500));
  }
};