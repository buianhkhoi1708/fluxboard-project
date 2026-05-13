import { create } from 'zustand';
import { orgApi } from '../api/orgApi';

export interface OrgMember {
  id: string;
  full_name?: string;
  fullName?: string;
  email: string;
  status: string;
}

export interface OrgTeam {
  id: string;
  name: string;
  code?: string;
  lead_id?: string;
  lead_name?: string;
  description?: string;
  members: OrgMember[];
}

export interface OrgDepartment {
  id: string;
  name: string;
  code?: string;
  manager_id?: string;
  manager_name?: string;
  description?: string;
  teams: OrgTeam[];
}

interface OrgState {
  orgTree: OrgDepartment[];
  isLoading: boolean;
  fetchTree: () => Promise<void>;
  addDepartmentToTree: (newDept: Partial<OrgDepartment>) => void;
  addTeamToDepartment: (deptId: string, newTeam: Partial<OrgTeam>) => void;
  addMemberToTeam: (deptId: string, teamId: string, newMember: OrgMember) => void;
}

export const useOrgStore = create<OrgState>((set) => ({
  orgTree: [],
  isLoading: false,

  fetchTree: async () => {
    set({ isLoading: true });
    try {
      const res: any = await orgApi.getOrgTree();
      set({ orgTree: res.data || [], isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  addDepartmentToTree: (newDept) => {
    set((state) => ({ orgTree: [...state.orgTree, { ...newDept, teams: [] } as OrgDepartment] }));
  },

  addTeamToDepartment: (deptId, newTeam) => {
    set((state) => ({
      orgTree: state.orgTree.map((dept) => 
        dept.id === deptId ? { ...dept, teams: [...(dept.teams || []), { ...newTeam, members: [] } as OrgTeam] } : dept
      )
    }));
  },

  addMemberToTeam: (deptId, teamId, newMember) => {
    set((state) => ({
      orgTree: state.orgTree.map((dept) => 
        dept.id === deptId 
          ? { ...dept, teams: dept.teams.map(team => team.id === teamId ? { ...team, members: [...(team.members || []), newMember] } : team) } 
          : dept
      )
    }));
  }
}));