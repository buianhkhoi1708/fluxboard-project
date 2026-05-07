import axiosClient from '../../../lib/axiosClient';

// Interface lấy dữ liệu trả về từ GET /project-members
    export interface ProjectMemberDetail {
    id: string;
    projectId: string;
    userId: string;
    user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    };
    roleIds: string[];
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export const projectApi = {
    // Lấy danh sách chi tiết
    getProjectMembersDetail: async (projectId: string): Promise<ProjectMemberDetail[]> => {
        const response: any = await axiosClient.get(`/projects/${projectId}/project-members`);
        return response.data || response;
    },

  //Thêm member vào project
    addProjectMember: async (projectId: string, userId: string, roleIds: string[]) => {
        const payload = {
            user_id: userId,
            role_ids: roleIds
        };

        const response: any = await axiosClient.post(`/projects/${projectId}/members`, payload);
        return response.data || response;
    },

    // Sửa quyền hoặc trạng thái
    updateProjectMember: async (projectId: string, memberId: string, roleIds: string[], isActive: boolean) => {
        const payload = {
            role_ids: roleIds,
            active: isActive
        };

        const response: any = await axiosClient.put(`/projects/${projectId}/project-members/${memberId}`, payload);
        return response.data || response;
    },

    // Xóa member
    removeProjectMember: async (projectId: string, memberId: string) => {
        const response: any = await axiosClient.delete(`/projects/${projectId}/project-members/${memberId}`);
        return response.data || response;
    },

    getProjectById: async (projectId: string) => {
        const response: any = await axiosClient.get(`/projects/${projectId}`);
        return response.data || response;
    },

    // Lấy thông tin tổng quan (Gồm Project Info và danh sách Boards)
    getProjectOverview: async (projectId: string) => {
        const response: any = await axiosClient.get(`/projects/${projectId}/overview`);
        return response.data || response;
    },

    // Cập nhật thông tin dự án
    updateProjectInfo: async (projectId: string, payload: any) => {
        const response: any = await axiosClient.put(`/projects/${projectId}`, payload);
        return response.data || response;
    },

    // Xóa dự án
    deleteProject: async (projectId: string) => {
        const response: any = await axiosClient.delete(`/projects/${projectId}`);
        return response.data || response;
    }
};