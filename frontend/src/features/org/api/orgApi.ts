import axiosClient from '../../../lib/axiosClient';

// Định nghĩa kiểu dữ liệu (Types)
export interface DepartmentPayload {
  name: string;
  managerId: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface TeamPayload {
  name: string;
  departmentId: string;
  leadId: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export const orgApi = {
  // Lấy toàn bộ cây tổ chức (Dept -> Team -> Members)
  getOrgTree: async () => {
    const response = await axiosClient.get('/organizations/tree');
    return response.data; 
  },

  // Tạo Phòng ban mới
  saveDepartment: async (payload: DepartmentPayload) => {
    const response = await axiosClient.post('/departments', payload);
    return response.data;
  },

  // Tạo Nhóm mới
  saveTeam: async (payload: TeamPayload) => {
    const response = await axiosClient.post('/teams', payload);
    return response.data;
  }
};