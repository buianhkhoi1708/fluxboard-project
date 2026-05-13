// DOMAIN TYPES
export interface OrgUser {
  id: string;
  user_id?: string;
  full_name?: string;
  fullName?: string;
  name?: string;
  email: string;
  avatar_url?: string;
}

export interface Team {
  id: string;
  _id?: string;
  name: string;
  code: string;
  lead_id?: string;
  lead_name?: string;
  description?: string;
  members?: OrgUser[];
}

export interface Department {
  id: string;
  _id?: string;
  name: string;
  code: string;
  manager_id?: string;
  manager_name?: string;
  description?: string;
  teams: Team[];
}
//UI PAGE TYPES (Trạng thái UI cho OrganizationPage)
export type OrgModalMode = 'DEPARTMENT' | 'TEAM';
export interface OrgModalState {
  isOpen: boolean;
  mode: OrgModalMode;
  targetDeptId: string | null; 
}
export interface OrgTargetIds {
  deptId: string | null;
  teamId: string | null;
}
export interface OrganizationPageProps {}