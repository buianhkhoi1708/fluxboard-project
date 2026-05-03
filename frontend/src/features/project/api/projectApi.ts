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
        // Gọi theo chuẩn thực tế của Controller: /projects/{id}/project-members
        const response: any = await axiosClient.get(`/projects/${projectId}/project-members`);
        return response.data || response;
    },

  //Thêm member vào project
    addProjectMember: async (projectId: string, userId: string, roleIds: string[]) => {
        // ⚠️ Chú ý: DTO yêu cầu có @JsonProperty nên phải gửi snake_case
        const payload = {
            user_id: userId,
            role_ids: roleIds
        };
        const response: any = await axiosClient.post(`/projects/${projectId}/members`, payload);
        return response.data || response;
    },

    // Sửa quyền hoặc trạng thái
    updateProjectMember: async (projectId: string, memberId: string, roleIds: string[], isActive: boolean) => {
        // ⚠️ Chú ý: DTO Update KHÔNG CÓ @JsonProperty, bắt buộc gửi camelCase
        const payload = {
            roleIds: roleIds,
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
    }
};