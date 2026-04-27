import React, { useEffect, useState } from 'react';
import { Building2, Users, Plus, UserPlus, MoreVertical, ShieldAlert } from 'lucide-react';
import { useOrgStore } from '../features/org/store/useOrgStore';
import OrgFormModal from '../features/org/components/OrgFormModal';
import UserPickerModal from '../features/org/components/UserPickerModal';

const OrganizationPage = () => {
  // 1. Kéo dữ liệu và hàm fetch từ Zustand Store
  const { orgTree, isLoading, fetchTree } = useOrgStore();

  // 2. Quản lý trạng thái đóng/mở của các Modal
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'DEPARTMENT', // 'DEPARTMENT' | 'TEAM'
    targetDeptId: null,
  });

  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
  const [targetIds, setTargetIds] = useState({ deptId: null, teamId: null });

  // 3. Tự động gọi API lấy cây tổ chức khi vừa vào trang
  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Các hàm tiện ích mở Modal
  const openCreateDeptModal = () => setModalState({ isOpen: true, mode: 'DEPARTMENT', targetDeptId: null });
  const openCreateTeamModal = (deptId) => setModalState({ isOpen: true, mode: 'TEAM', targetDeptId: deptId });
  const openAddMemberModal = (deptId, teamId) => {
    setTargetIds({ deptId, teamId });
    setIsUserPickerOpen(true);
  };

  return (
    <div className="flex-1 bg-slate-50 h-full overflow-y-auto p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* ================= HEADER ================= */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <Building2 className="text-indigo-600" size={28} />
              </div>
              Organization Structure
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Quản lý cơ cấu phòng ban, nhóm và nhân sự trong hệ thống.</p>
          </div>
          
          <button 
            onClick={openCreateDeptModal}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200/50 transition-all active:scale-95"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Thêm Phòng Ban</span>
          </button>
        </div>

        {/* ================= TRẠNG THÁI LOADING / TRỐNG ================= */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : orgTree?.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm">
            <Building2 className="mx-auto h-16 w-16 text-indigo-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-700">Chưa có cơ cấu tổ chức</h3>
            <p className="text-slate-500 mt-2 mb-6">Hãy bắt đầu bằng cách tạo phòng ban đầu tiên cho công ty.</p>
            <button 
              onClick={openCreateDeptModal} 
              className="text-indigo-600 font-bold bg-indigo-50 px-6 py-2.5 rounded-xl hover:bg-indigo-100 transition-colors"
            >
              + Tạo phòng ban ngay
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ================= DUYỆT CÂY TỔ CHỨC: DEPARTMENT -> TEAM -> MEMBER ================= */}
            {orgTree?.map((dept) => (
              <div key={dept.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
                
                {/* 1. HEADER PHÒNG BAN (DEPARTMENT) */}
                <div className="bg-gradient-to-r from-slate-50 to-white p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center shrink-0">
                      <ShieldAlert className="text-indigo-500" size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                        {dept.name}
                      </h2>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Manager: <span className="font-bold text-slate-700">{dept.managerName || 'Chưa cập nhật'}</span>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => openCreateTeamModal(dept.id)}
                    className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors"
                  >
                    <Plus size={16} /> Thêm Team
                  </button>
                </div>

                {/* 2. DANH SÁCH NHÓM (TEAMS) */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5 bg-slate-50/30">
                  {dept.teams?.length > 0 ? dept.teams.map((team) => (
                    <div key={team.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-indigo-200 transition-colors">
                      <div className="flex justify-between items-start mb-5">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <Users size={18} />
                          </div>
                          <div>
                            <h3 className="font-bold text-[15px] text-slate-800">
                              {team.name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                              Lead: <span className="font-semibold text-slate-700">{team.leadName || 'Chưa cập nhật'}</span>
                            </p>
                          </div>
                        </div>
                        <button className="text-slate-400 hover:text-indigo-600 p-1 bg-slate-50 rounded-md transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </div>

                      {/* 3. DANH SÁCH THÀNH VIÊN TRONG TEAM */}
                      <div className="space-y-2 mb-5">
                        {team.members?.length > 0 ? team.members.map((member) => (
                          <div key={member.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100 group hover:bg-white hover:border-indigo-100 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center border border-white shadow-sm">
                                {member.fullName?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="text-[13px] font-bold text-slate-700 leading-tight group-hover:text-indigo-600 transition-colors">{member.fullName}</p>
                                <p className="text-[11px] text-slate-500">{member.email}</p>
                              </div>
                            </div>
                            {/* Trạng thái Active */}
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-100 rounded-md shadow-sm">
                               <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                               <span className="text-[10px] font-bold text-slate-500">{member.status || 'ACTIVE'}</span>
                            </div>
                          </div>
                        )) : (
                          <div className="text-xs text-slate-400 italic text-center py-4 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                            Nhóm này chưa có thành viên.
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => openAddMemberModal(dept.id, team.id)}
                        className="w-full py-2.5 border border-dashed border-slate-300 rounded-xl text-sm font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-all flex justify-center items-center gap-2"
                      >
                        <UserPlus size={16} /> Thêm thành viên
                      </button>
                    </div>
                  )) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-10 bg-white border border-dashed border-slate-200 rounded-xl">
                      <Users className="text-slate-300 mb-2" size={32} />
                      <p className="text-sm text-slate-500 font-medium">Phòng ban này chưa có Team nào.</p>
                      <button 
                        onClick={() => openCreateTeamModal(dept.id)}
                        className="mt-3 text-sm font-bold text-indigo-600 hover:underline"
                      >
                        Tạo Team đầu tiên
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= KHU VỰC MODALS ================= */}
      {/* 1. Modal Tạo Phòng Ban / Tạo Nhóm */}
      <OrgFormModal 
        isOpen={modalState.isOpen} 
        mode={modalState.mode}
        targetDeptId={modalState.targetDeptId} // Truyền deptId nếu đang ở chế độ tạo Team
        onClose={() => setModalState({ ...modalState, isOpen: false })} 
      />

      {/* 2. Modal Tìm kiếm & Thêm User vào Nhóm */}
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