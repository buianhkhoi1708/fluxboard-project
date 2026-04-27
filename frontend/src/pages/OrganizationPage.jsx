import React, { useEffect, useState } from 'react';
import { Building2, Users, Plus, UserPlus, MoreVertical, ShieldAlert, ChevronRight, ChevronDown, User } from 'lucide-react';
import { useOrgStore } from '../features/org/store/useOrgStore';
import OrgFormModal from '../features/org/components/OrgFormModal';
import UserPickerModal from '../features/org/components/UserPickerModal';

const OrganizationPage = () => {
  const { orgTree, isLoading, fetchTree } = useOrgStore();

  // State quản lý Modals
  const [modalState, setModalState] = useState({ isOpen: false, mode: 'DEPARTMENT', targetDeptId: null });
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
  const [targetIds, setTargetIds] = useState({ deptId: null, teamId: null });

  // State quản lý việc Đóng/Mở (Expand/Collapse) các nhánh của cây
  const [expandedNodes, setExpandedNodes] = useState({});

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Khi có data, mặc định mở rộng (expand) tất cả Phòng ban ở tầng 1 để user dễ nhìn
  useEffect(() => {
    if (orgTree && orgTree.length > 0 && Object.keys(expandedNodes).length === 0) {
      const initialExpanded = {};
      orgTree.forEach(dept => {
        initialExpanded[dept.id] = true; // Mở sẵn tầng Department
      });
      setExpandedNodes(initialExpanded);
    }
  }, [orgTree]);

  // Hàm toggle đóng/mở nhánh cây
  const toggleNode = (id) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreateDeptModal = () => setModalState({ isOpen: true, mode: 'DEPARTMENT', targetDeptId: null });
  const openCreateTeamModal = (deptId, e) => {
    e.stopPropagation(); // Ngăn chặn sự kiện click lan ra ngoài làm đóng/mở nhánh cây
    setModalState({ isOpen: true, mode: 'TEAM', targetDeptId: deptId });
  };
  const openAddMemberModal = (deptId, teamId, e) => {
    e.stopPropagation();
    setTargetIds({ deptId, teamId });
    setIsUserPickerOpen(true);
  };

  return (
    <div className="flex-1 bg-white h-full overflow-y-auto p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        
        {/* ================= HEADER ================= */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                <Building2 size={28} />
              </div>
              Sơ đồ Tổ chức
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Cấu trúc hình cây: Phòng ban {'>'} Nhóm {'>'} Nhân sự.</p>
          </div>
          
          <button 
            onClick={openCreateDeptModal}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Thêm Phòng Ban</span>
          </button>
        </div>

        {/* ================= TREE VIEW AREA ================= */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : orgTree?.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <Building2 className="mx-auto h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700">Cây tổ chức đang trống</h3>
            <button onClick={openCreateDeptModal} className="mt-4 text-indigo-600 font-bold bg-indigo-50 px-6 py-2.5 rounded-xl hover:bg-indigo-100 transition-colors">
              + Khởi tạo nhánh đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-2 select-none">
            {orgTree?.map((dept) => {
              const isDeptExpanded = expandedNodes[dept.id];

              return (
                <div key={dept.id} className="relative">
                  {/* TẦNG 1: DEPARTMENT */}
                  <div 
                    onClick={() => toggleNode(dept.id)}
                    className="flex items-center justify-between group cursor-pointer p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded-md hover:bg-slate-200">
                        {isDeptExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </button>
                      <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                        <ShieldAlert size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-[16px] font-bold text-slate-800">{dept.name}</h2>
                          {dept.code && <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase">{dept.code}</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Manager: <span className="font-semibold text-slate-700">{dept.manager_name || 'Chưa có'}</span></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => openCreateTeamModal(dept.id, e)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
                        <Plus size={14} /> Thêm Team
                      </button>
                    </div>
                  </div>

                  {/* NHÁNH CON TẦNG 1 (Hiển thị khi Dept mở) */}
                  {isDeptExpanded && (
                    <div className="ml-7 pl-6 border-l-2 border-slate-200 my-2 space-y-2 relative">
                      {dept.teams?.length > 0 ? dept.teams.map((team) => {
                        const isTeamExpanded = expandedNodes[team.id];

                        return (
                          <div key={team.id} className="relative">
                            {/* Dấu gạch ngang nối từ cây dọc vào nhánh Team */}
                            <div className="absolute -left-6 top-6 w-5 border-t-2 border-slate-200"></div>

                            {/* TẦNG 2: TEAM */}
                            <div 
                              onClick={() => toggleNode(team.id)}
                              className="flex items-center justify-between group cursor-pointer p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <button className="text-slate-400 hover:text-emerald-600 transition-colors p-1 rounded-md hover:bg-slate-200">
                                  {isTeamExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                </button>
                                <div className="w-8 h-8 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                                  <Users size={16} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-[14px] font-bold text-slate-800">{team.name}</h3>
                                    {team.code && <span className="bg-slate-100 text-slate-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">{team.code}</span>}
                                  </div>
                                  <p className="text-[11px] text-slate-500">Lead: <span className="font-semibold text-slate-700">{team.lead_name || 'Chưa có'}</span></p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => openAddMemberModal(dept.id, team.id, e)} className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100">
                                  <UserPlus size={14} /> Thêm người
                                </button>
                              </div>
                            </div>

                            {/* NHÁNH CON TẦNG 2 (Hiển thị khi Team mở) */}
                            {isTeamExpanded && (
                              <div className="ml-7 pl-6 border-l-2 border-slate-200 my-2 space-y-1 relative">
                                {team.members?.length > 0 ? team.members.map((member) => (
                                  <div key={member.id} className="relative flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 group border border-transparent hover:border-slate-100">
                                    {/* Dấu gạch ngang nối từ cây dọc vào nhánh Member */}
                                    <div className="absolute -left-6 top-1/2 w-5 border-t-2 border-slate-200"></div>

                                    {/* TẦNG 3: MEMBER */}
                                    <div className="flex items-center gap-3">
                                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center border border-slate-200">
                                        {(member.full_name || 'U').charAt(0)}
                                      </div>
                                      <div>
                                        <p className="text-[13px] font-bold text-slate-700 leading-none mb-1 group-hover:text-indigo-600 transition-colors">
                                          {member.full_name}
                                        </p>
                                        <p className="text-[10px] text-slate-400">{member.email}</p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-100 rounded-md shadow-sm">
                                      <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                      <span className="text-[9px] font-bold text-slate-500">{member.status || 'ACTIVE'}</span>
                                    </div>
                                  </div>
                                )) : (
                                  <div className="relative p-2.5 text-xs text-slate-400 italic flex items-center gap-2">
                                    <div className="absolute -left-6 top-1/2 w-5 border-t-2 border-slate-200"></div>
                                    Team này chưa có thành viên.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }) : (
                        <div className="relative p-3 text-sm text-slate-400 italic">
                          <div className="absolute -left-6 top-1/2 w-5 border-t-2 border-slate-200"></div>
                          Chưa có Team nào thuộc phòng ban này.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= KHU VỰC MODALS (Giữ nguyên) ================= */}
      <OrgFormModal 
        isOpen={modalState.isOpen} 
        mode={modalState.mode}
        targetDeptId={modalState.targetDeptId} 
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