import axiosClient from '../../../lib/axiosClient';
import { CreateProjectPayload, CreateBoardPayload } from '../types/workspaceTypes';

export const workspaceApi = {
  // Đã thêm tham số page và size
  getProjectOverviews: async (page: number, size: number) => {
    return axiosClient.get('/projects/overviews', { params: { page, size } });
  },

  createProject: async (data: CreateProjectPayload) => {
    return axiosClient.post('/projects', data);
  },

  createBoard: async (data: CreateBoardPayload) => {
    return axiosClient.post('/boards', data); 
  }
};