import React, { useEffect, useState } from 'react';
import { Building2, Users, Plus, UserPlus, MoreVertical, ShieldAlert, Loader2 } from 'lucide-react';

// Import Store và các Interface từ feature Org
import { useOrgStore, OrgDepartment, OrgTeam, OrgMember } from '../features/organization/state/useOrganizationStore';
import OrgFormModal from '../features/organization/components/OrgFormModal';
import UserPickerModal from '../features/organization/components/UserPickerModal';

import { OrgModalState, OrgTargetIds, OrganizationPageProps } from '../features/organization/types/orgTypes';

const OrganizationPage: React.FC<OrganizationPageProps> = () => {
  const { orgTree, isLoading, fetchTree } = useOrgStore();

  // Quản lý trạng thái đóng/mở Modal tạo Phòng ban hoặc Team
  const [modalState, setModalState] = useState<OrgModalState>({ 
    isOpen: false, 
    mode: 'DEPARTMENT', 
    targetDeptId: null 
  });
  
  // Quản lý Modal chọn nhân sự
  const [isUserPickerOpen, setIsUserPickerOpen] = useState<boolean>(false);
  const [targetIds, setTargetIds] = useState<OrgTargetIds>({ 
    deptId: null, 
    teamId: null 
  });

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Hàm mở Modal tạo Phòng ban
  const openCreateDeptModal = () => {
    setModalState({ isOpen: true, mode: 'DEPARTMENT', targetDeptId: null });
  };

  // Hàm mở Modal tạo Team cho một phòng ban cụ thể
  const openCreateTeamModal = (deptId: string) => {
    setModalState({ isOpen: true, mode: 'TEAM', targetDeptId: deptId });
  };

  // Hàm mở Modal gán thành viên vào Team
  const openAddMemberModal = (deptId: string, teamId: string) => {
    setTargetIds({ deptId, teamId });
    setIsUserPickerOpen(true);
  };

  return (
    <div className="flex-1 bg-slate-50 h-full overflow-y-auto p-6 md:p-10 custom-scrollbar">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-xl shadow-sm border border-indigo-50">
                <Building2 className="text-indigo-600" size={28} />
              </div>
              Organization Structure
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Quản lý sơ cấu phòng ban, nhóm và nhân sự trong hệ thống.</p>
          </div>
          <button 
            onClick={openCreateDeptModal} 
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            <Plus size={18} />
            <span>Thêm Phòng Ban</span>
          </button>
        </div>

        {/* LOADING STATE */}
        {isLoading && orgTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80">
            <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Đang tải cơ cấu...</p>
          </div>
        ) : orgTree.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center shadow-sm">
            <Building2 className="mx-auto h-16 w-16 text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-700">Chưa có cơ cấu tổ chức</h3>
            <p className="text-slate-400 mt-2 mb-8">Hãy bắt đầu xây dựng phòng ban đầu tiên cho công ty của sếp.</p>
            <button 
              onClick={openCreateDeptModal} 
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              + Tạo phòng ban ngay
            </button>
          </div>
        ) : (
          
          /* DANH SÁCH PHÒNG BAN */
          <div className="space-y-8 pb-20">
            {orgTree.map((dept: OrgDepartment) => (
              <div key={dept.id} className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
                
                {/* Header Phòng Ban */}
                <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm">
                      <ShieldAlert className="text-indigo-500" size={28} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 tracking-tight">
                        {dept.name}
                        {dept.code && (
                          <span className="ml-3 bg-indigo-100 text-indigo-700 text-[11px] px-2 py-1 rounded-lg font-black uppercase">
                            {dept.code}
                          </span>
                        )}
                      </h2>
                      <p className="text-sm font-medium text-slate-400 mt-0.5">
                        Manager: <span className="text-slate-600 font-bold">{dept.manager_name || 'Chưa gán'}</span>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => openCreateTeamModal(dept.id)} 
                    className="flex items-center gap-2 text-xs font-black text-indigo-600 bg-white border border-indigo-100 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-all shadow-sm"
                  >
                    <Plus size={16} /> THÊM TEAM
                  </button>
                </div>

                {/* Danh sách các Team trong phòng ban */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {dept.teams && dept.teams.length > 0 ? dept.teams.map((team: OrgTeam) => (
                    <div key={team.id} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 hover:border-indigo-200 transition-colors">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-indigo-600 shadow-sm">
                            <Users size={20} />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-800 leading-tight">
                              {team.name}
                              <span className="block text-[10px] text-slate-400 uppercase font-bold mt-0.5">Lead: {team.lead_name || 'N/A'}</span>
                            </h3>
                          </div>
                        </div>
                        <button className="text-slate-300 hover:text-slate-600"><MoreVertical size={18} /></button>
                      </div>

                      {/* Members List */}
                      <div className="space-y-2.5 mb-6">
                        {team.members && team.members.length > 0 ? team.members.map((member: OrgMember) => (
                          <div key={member.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center uppercase">
                                {(member.full_name || member.fullName || 'U').charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-700">{member.full_name || member.fullName}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{member.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg border border-emerald-100">
                               <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                               <span className="text-[9px] font-black uppercase">Active</span>
                            </div>
                          </div>
                        )) : (
                          <div className="text-[11px] text-slate-400 font-bold italic text-center py-6 border-2 border-dashed border-slate-100 rounded-xl uppercase tracking-widest">
                            Trống thành viên
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => openAddMemberModal(dept.id, team.id)} 
                        className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-[11px] font-black text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-white transition-all flex justify-center items-center gap-2 uppercase tracking-tighter"
                      >
                        <UserPlus size={16} /> Gán nhân sự
                      </button>
                    </div>
                  )) : (
                    <div className="col-span-full py-10 text-center bg-white/50 border border-dashed border-slate-200 rounded-2xl">
                      <p className="text-sm font-bold text-slate-400">Phòng ban này chưa có nhóm làm việc nào.</p>
                      <button onClick={() => openCreateTeamModal(dept.id)} className="text-indigo-600 text-xs font-black mt-2 hover:underline uppercase">Tạo Team đầu tiên</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      <OrgFormModal 
        isOpen={modalState.isOpen} 
        mode={modalState.mode} 
        onClose={() => setModalState({ ...modalState, isOpen: false })} 
      />
      
      <UserPickerModal 
        isOpen={isUserPickerOpen} 
        targetDeptId={targetIds.deptId} 
        targetTeamId={targetIds.teamId} 
        onClose={() => setIsUserPickerOpen(false)} 
      />
    </div>
  );
};

export default OrganizationPage;