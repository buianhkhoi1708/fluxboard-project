import axiosClient from '../../../lib/axiosClient';
import { CreateProjectPayload, CreateBoardPayload } from '../types/workspaceTypes';

export const workspaceApi = {
  // Lấy danh sách Workspace
  getProjectOverviews: async () => {
    return axiosClient.get('/projects/overviews', { params: { page: 0, size: 50 } });
  },

  // Tạo Workspace (Project)
  createProject: async (data: CreateProjectPayload) => {
    return axiosClient.post('/projects', data);
  },

  // Tạo Board
  createBoard: async (data: CreateBoardPayload) => {
    return axiosClient.post('/boards', data); // Thay đổi endpoint nếu Backend cấu hình khác
  }
};