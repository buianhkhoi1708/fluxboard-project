import { create } from 'zustand';
import { orgApi } from '../api/orgApi';

interface OrgState {
  orgTree: any[];
  isLoading: boolean;
  
  fetchTree: () => Promise<void>;
  addDepartmentToTree: (newDept: any) => void;
  addTeamToDepartment: (deptId: string, newTeam: any) => void;
  addMemberToTeam: (deptId: string, teamId: string, newMember: any) => void;
}

export const useOrgStore = create<OrgState>((set) => ({
  orgTree: [],
  isLoading: false,

  fetchTree: async () => {
    set({ isLoading: true });
    try {
      const res = await orgApi.getOrgTree();
      // Giả sử API trả về dạng { success: true, data: [...] }
      set({ orgTree: res.data || [], isLoading: false });
    } catch (error) {
      console.error('Lỗi tải cây tổ chức', error);
      set({ isLoading: false });
    }
  },

  addDepartmentToTree: (newDept) => {
    set((state) => ({
      orgTree: [...state.orgTree, { ...newDept, teams: [] }]
    }));
  },

  // Update lồng 1 tầng (Thêm Team vào Dept)
  addTeamToDepartment: (deptId, newTeam) => {
    set((state) => ({
      orgTree: state.orgTree.map((dept) => 
        dept.id === deptId 
          ? { ...dept, teams: [...(dept.teams || []), { ...newTeam, members: [] }] } 
          : dept
      )
    }));
  },

  // Update lồng 2 tầng (Thêm Member vào Team thuộc Dept)
  addMemberToTeam: (deptId, teamId, newMember) => {
    set((state) => ({
      orgTree: state.orgTree.map((dept) => 
        dept.id === deptId 
          ? { 
              ...dept, 
              teams: dept.teams.map((team: any) => 
                team.id === teamId 
                  ? { ...team, members: [...(team.members || []), newMember] }
                  : team
              ) 
            } 
          : dept
      )
    }));
  }
}));