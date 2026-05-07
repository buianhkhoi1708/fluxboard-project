import { IncomingUser } from '../../user/store/useUserStore';

export interface Project {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  departmentId?: string;
  is_deleted?: boolean;
}

export interface Board {
  id: string;
  _id?: string;
  name: string;
  project_id?: string;
}

// Cấu trúc Data trả về từ API getProjectOverviews
export interface WorkspaceOverview {
  project: Project;
  boards: Board[];
  members: IncomingUser[];
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  departmentId?: string;
}

export interface CreateBoardPayload {
  project_id: string;
  name: string;
}