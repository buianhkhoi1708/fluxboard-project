import axiosClient from '../../../lib/axiosClient';
import { IncomingUser } from '../../user/store/useUserStore';
import { 
  ApiResponse, 
  CreateProjectPayload, 
  UpdateProjectPayload, 
  CreateBoardPayload 
} from '../types/workspaceTypes';

export const workspaceApi = {
  // ==========================================
  // QUẢN LÝ WORKSPACE (PROJECTS)
  // ==========================================

  /**
   * 1. Lấy tổng quan TẤT CẢ dự án (Kèm Boards & Members) - Dùng cho WorkspacesPage
   */
  getProjectOverviews: (page: number = 0, size: number = 50): Promise<ApiResponse<any>> => {
    return axiosClient.get('/projects/overviews', { params: { page, size } });
  },

  /**
   * 2. Tạo dự án mới
   */
  createProject: (data: CreateProjectPayload): Promise<ApiResponse<any>> => {
    return axiosClient.post('/projects', data);
  },

  /**
   * 3. Lấy danh sách dự án cơ bản có phân trang
   */
  getProjects: (params?: { page?: number; size?: number; sort?: string }): Promise<ApiResponse<any>> => {
    return axiosClient.get('/projects', { params });
  },

  /**
   * 4. Lấy chi tiết 1 dự án theo ID
   */
  getProjectById: (projectId: string): Promise<ApiResponse<any>> => {
    return axiosClient.get(`/projects/${projectId}`);
  },

  /**
   * 5. Lấy Overview dự án chi tiết để làm Dashboard
   */
  getProjectOverview: (projectId: string): Promise<ApiResponse<any>> => {
    return axiosClient.get(`/projects/${projectId}/overview`);
  },

  /**
   * 6. Lấy danh sách dự án theo Phòng ban
   */
  getProjectsByDepartment: (departmentId: string, params?: { page?: number; size?: number }): Promise<ApiResponse<any>> => {
    return axiosClient.get(`/projects/departments/${departmentId}`, { params });
  },

  /**
   * 7. Cập nhật dự án
   */
  updateProject: (projectId: string, data: UpdateProjectPayload): Promise<ApiResponse<any>> => {
    return axiosClient.put(`/projects/${projectId}`, data);
  },

  /**
   * 8. Xóa dự án (Soft delete hoặc Hard delete tùy Backend)
   */
  deleteProject: (projectId: string): Promise<ApiResponse<null>> => {
    return axiosClient.delete(`/projects/${projectId}`);
  },

  /**
   * 9. Lấy danh sách thành viên của 1 dự án
   */
  getProjectMembers: (projectId: string): Promise<ApiResponse<IncomingUser[] | any>> => {
    return axiosClient.get(`/projects/${projectId}/members`);
  },

  // ==========================================
  // QUẢN LÝ BOARDS TRONG WORKSPACE
  // ==========================================

  /**
   * 10. Tạo Board mới trong một Project
   */
  createBoard: (data: CreateBoardPayload): Promise<ApiResponse<any>> => {
    return axiosClient.post('/boards', data);
  }
};