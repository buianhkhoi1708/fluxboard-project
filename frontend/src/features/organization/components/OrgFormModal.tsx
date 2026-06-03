import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query'; 
import { X, Search, ChevronDown, Loader2, Building2, Users, User, Hash, Check } from 'lucide-react';
import { useGetOrgTree } from '../hooks/useOrgQueries'; 
import { orgApi } from '../api/organizationApi';
import { OrgMember } from '../types/orgTypes';

export interface OrgFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'DEPARTMENT' | 'TEAM';
  action?: 'CREATE' | 'EDIT';
  targetDeptId?: string | null;
  targetTeam?: any | null;
  targetDept?: any | null;
}

export interface OrgFormData {
  name: string;
  code: string;
  description: string;
  departmentId: string;
  leadId: string;
  leadName: string;
}

const OrgFormModal: React.FC<OrgFormModalProps> = ({ 
  isOpen, 
  onClose, 
  mode = 'DEPARTMENT', 
  action = 'CREATE', 
  targetDeptId,
  targetTeam,
  targetDept
}) => {
  const queryClient = useQueryClient();
  const { data: orgTree = [] } = useGetOrgTree();
  
  const initialForm: OrgFormData = { 
    name: '', code: '', description: '', departmentId: targetDeptId || '', leadId: '', leadName: '' 
  };
  
  const [formData, setFormData] = useState<OrgFormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchLeadTerm, setSearchLeadTerm] = useState('');
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<OrgMember[]>([]);
  const [isSearchingLead, setIsSearchingLead] = useState(false);

  const [unassignedUsers, setUnassignedUsers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormData(initialForm);
      setSearchLeadTerm('');
      setShowLeadDropdown(false);
      setShowMemberDropdown(false);
      setSearchResults([]);
      setSelectedMembers([]);
    } else {
      if (action === 'EDIT' && mode === 'TEAM' && targetTeam) {
        setFormData({
          name: targetTeam.name || '',
          code: targetTeam.code || targetTeam.team_code || targetTeam.teamCode || '',
          description: targetTeam.description || '',
          departmentId: targetDeptId || targetTeam.department_id || targetTeam.departmentId || '',
          leadId: targetTeam.leadId || targetTeam.lead_id || '',
          leadName: targetTeam.leadName || targetTeam.lead_name || ''
        });
      } 
      else if (action === 'EDIT' && mode === 'DEPARTMENT' && targetDept) {
        setFormData({
          name: targetDept.name || '',
          code: targetDept.code || targetDept.department_code || targetDept.departmentCode || '',
          description: targetDept.description || '',
          departmentId: '', 
          leadId: targetDept.managerId || targetDept.manager_id || '',
          leadName: targetDept.managerName || targetDept.manager_name || ''
        });
      } else {
        setFormData(prev => ({ ...initialForm, departmentId: targetDeptId || '' }));
      }

      if (mode === 'TEAM') {
        orgApi.getUnassignedUsers().then((res: any) => {
          const payload = res.data || res;
          const userData = payload.data || payload.content || payload;
          setUnassignedUsers(Array.isArray(userData) ? userData : []);
        }).catch(err => console.error("Lỗi lấy user:", err));
      }
    }
  }, [isOpen, targetDeptId, action, targetTeam, targetDept, mode]);

  useEffect(() => {
    if (searchLeadTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearchingLead(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res: any = await orgApi.searchOrgUsers(searchLeadTerm);
        const payload = res.data || res;
        const usersData = payload.data || payload.content || payload;
        setSearchResults(Array.isArray(usersData) ? usersData : []);
      } catch (err) {
        console.error("Lỗi tìm kiếm user:", err);
      } finally {
        setIsSearchingLead(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchLeadTerm]);

  const handleSelectLead = (user: OrgMember) => {
    setFormData(prev => ({ 
      ...prev, 
      leadId: user.id || user.user_id || '', 
      leadName: user.full_name || user.fullName || user.name || '' 
    }));
    setShowLeadDropdown(false);
    setSearchLeadTerm('');
  };

  const toggleSelectMember = (user: any) => {
    const isSelected = selectedMembers.some(m => m.id === user.id);
    if (isSelected) {
      setSelectedMembers(prev => prev.filter(m => m.id !== user.id));
    } else {
      setSelectedMembers(prev => [...prev, user]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === 'DEPARTMENT') {
        const payload = { name: formData.name, code: formData.code, description: formData.description, manager_id: formData.leadId };
        
        if (action === 'EDIT' && targetDept) {
          await orgApi.updateDepartment(targetDept.id, payload);
        } else {
          await orgApi.createDepartment(payload);
        }
        
        queryClient.invalidateQueries({ queryKey: ['orgTree'] });
        onClose();
        
      } else {
        const payload = { 
          name: formData.name, code: formData.code, department_id: formData.departmentId, lead_id: formData.leadId, description: formData.description 
        };
        
        let activeTeamId = targetTeam?.id;

        if (action === 'EDIT' && targetTeam) {
          await orgApi.updateTeam(targetTeam.id, payload);
        } else {
          const res: any = await orgApi.createTeam(payload);
          const responseData = res.data?.data || res.data;
          activeTeamId = responseData?.id;
        }

        if (activeTeamId) {
          const assignPromises = [];
          
          if (formData.leadId) {
            assignPromises.push(orgApi.assignUserToTeam(formData.leadId, activeTeamId, formData.departmentId).catch(() => {}));
          }

          if (selectedMembers.length > 0) {
            selectedMembers.forEach(member => {
              if (member.id !== formData.leadId) {
                assignPromises.push(orgApi.assignUserToTeam(member.id, activeTeamId, formData.departmentId));
              }
            });
          }

          if (assignPromises.length > 0) {
            await Promise.all(assignPromises);
          }
        }

        queryClient.invalidateQueries({ queryKey: ['orgTree'] });
        onClose();
      }
    } catch (error: any) {
      console.error("Lỗi:", error);
      alert(error.response?.data?.message || "Có lỗi xảy ra!");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[1.25rem] md:rounded-[24px] w-full max-w-lg shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col relative max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-5 md:px-8 py-5 md:py-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[1.25rem] md:rounded-t-[24px] shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div className={`p-2.5 md:p-3 rounded-2xl flex items-center justify-center shadow-sm border ${mode === 'DEPARTMENT' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
              {mode === 'DEPARTMENT' ? <Building2 size={22} className="md:w-6 md:h-6" strokeWidth={1.5} /> : <Users size={22} className="md:w-6 md:h-6" strokeWidth={1.5} />}
            </div>
            <div>
              <h2 className="font-black text-lg md:text-xl text-slate-800 tracking-tight">
                {mode === 'DEPARTMENT' 
                  ? (action === 'EDIT' ? 'Cập nhật Phòng ban' : 'Tạo Phòng Ban mới')
                  : (action === 'EDIT' ? 'Cập nhật Team' : 'Thêm Team mới')}
              </h2>
              <p className="text-[11px] md:text-xs font-medium text-slate-400 mt-0.5">
                Thiết lập thông tin & nhân sự
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 -mr-1 md:mr-0 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors self-start">
            <X size={20} />
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-5 md:space-y-6 overflow-y-auto custom-scrollbar">
          
          {mode === 'TEAM' && (
            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Thuộc phòng ban <span className="text-rose-500">*</span></label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 md:w-[18px] md:h-[18px]" />
                <select 
                  required 
                  value={formData.departmentId} 
                  onChange={e => setFormData({...formData, departmentId: e.target.value})} 
                  className="w-full pl-10 md:pl-11 pr-10 py-3 md:py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] md:text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>-- Chọn phòng ban --</option>
                  {orgTree.map((dept: any) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 md:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Tên {mode === 'DEPARTMENT' ? 'phòng ban' : 'Team'} <span className="text-rose-500">*</span></label>
              <input 
                required 
                type="text" 
                placeholder="VD: Khối Kỹ Thuật"
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className="w-full px-3.5 md:px-4 py-3 md:py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] md:text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-400" 
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Mã Code <span className="text-rose-500">*</span></label>
              <div className="relative">
                <Hash size={16} className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  required 
                  type="text" 
                  placeholder="VD: ENG"
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} 
                  className="w-full pl-9 md:pl-10 pr-3.5 md:pr-4 py-3 md:py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] md:text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all uppercase placeholder:text-slate-400 placeholder:normal-case" 
                />
              </div>
            </div>
          </div>
          
          {/* LEADER SEARCH */}
          <div className="relative">
            <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Chỉ định Leader</label>
            <div 
              onClick={() => setShowLeadDropdown(!showLeadDropdown)} 
              className={`w-full px-3.5 md:px-4 py-3 md:py-3.5 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center cursor-pointer transition-all hover:bg-slate-100 ${showLeadDropdown ? 'ring-4 ring-indigo-50 border-indigo-400 bg-white' : ''}`}
            >
              <div className="flex items-center gap-2.5 md:gap-3">
                <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold ${formData.leadName ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                  {formData.leadName ? formData.leadName.charAt(0).toUpperCase() : <User size={12} className="md:w-[14px] md:h-[14px]" />}
                </div>
                <span className={`text-[13px] md:text-sm font-medium ${formData.leadName ? 'text-slate-800' : 'text-slate-400'}`}>
                  {formData.leadName || 'Tìm kiếm người quản lý...'}
                </span>
              </div>
              <ChevronDown size={16} className={`text-slate-400 md:w-[18px] md:h-[18px] transition-transform duration-200 ${showLeadDropdown ? 'rotate-180' : ''}`} />
            </div>

            {showLeadDropdown && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden">
                <div className="p-2 md:p-3 border-b border-slate-100 bg-slate-50/50 relative">
                  <Search size={14} className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 text-slate-400 md:w-4 md:h-4" />
                  <input 
                    autoFocus type="text" placeholder="Gõ tên hoặc email..." value={searchLeadTerm} onChange={(e) => setSearchLeadTerm(e.target.value)} 
                    className="w-full pl-9 md:pl-10 pr-3.5 md:pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-[13px] md:text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50" 
                  />
                </div>
                <ul className="max-h-48 overflow-y-auto custom-scrollbar py-1">
                  {isSearchingLead ? (
                    <li className="p-4 text-center text-slate-400"><Loader2 className="animate-spin inline" size={16} /></li>
                  ) : searchResults.length > 0 ? (
                    searchResults.map(u => (
                      <li key={u.id || u.user_id} onClick={() => handleSelectLead(u)} className="px-3.5 md:px-4 py-2.5 md:py-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 flex items-center gap-2.5 md:gap-3 group">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] md:text-xs group-hover:bg-indigo-200 group-hover:text-indigo-700 shrink-0">
                           {(u.full_name || u.fullName || u.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-[13px] md:text-sm block group-hover:text-indigo-700 truncate">{u.full_name || u.fullName || u.name}</span>
                          <span className="text-[10px] md:text-[11px] text-slate-400 truncate block">{u.email}</span>
                        </div>
                      </li>
                    ))
                  ) : <li className="p-4 text-center text-[13px] md:text-sm text-slate-400">Không tìm thấy kết quả.</li>}
                </ul>
              </div>
            )}
          </div>

          {/* MULTI-SELECT MEMBERS */}
          {mode === 'TEAM' && (
            <div className="pt-3 md:pt-4 border-t border-slate-100 relative">
              <div className="flex justify-between items-center mb-1.5 md:mb-2">
                <label className="block text-xs md:text-sm font-bold text-slate-700">Gom nhanh thành viên <span className="text-[10px] md:text-xs font-normal text-slate-400 ml-0.5 md:ml-1">(Từ ds chưa gán)</span></label>
              </div>

              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2.5 md:mb-3">
                  {selectedMembers.map(m => (
                    <div key={m.id} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 md:px-3 py-1 md:py-1.5 rounded-xl text-[11px] md:text-xs font-bold flex items-center gap-1.5 md:gap-2 group shadow-sm transition-all">
                      <span className="truncate max-w-[100px] md:max-w-none">{m.full_name || m.fullName}</span>
                      <X 
                        size={12} 
                        className="cursor-pointer text-indigo-400 md:w-[14px] md:h-[14px] group-hover:text-rose-500 group-hover:scale-110 transition-all shrink-0" 
                        onClick={() => toggleSelectMember(m)}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div 
                onClick={() => setShowMemberDropdown(!showMemberDropdown)} 
                className={`w-full px-3.5 md:px-4 py-2.5 md:py-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex justify-between items-center cursor-pointer transition-all hover:bg-slate-100 ${showMemberDropdown ? 'border-indigo-400 bg-white' : ''}`}
              >
                <span className="text-[13px] md:text-sm font-medium text-slate-500 flex items-center gap-1.5 md:gap-2">
                  <Users size={14} className="text-slate-400 md:w-4 md:h-4" />
                  Bấm để chọn nhân sự...
                </span>
                <ChevronDown size={16} className={`text-slate-400 md:w-[18px] md:h-[18px] transition-transform duration-200 ${showMemberDropdown ? 'rotate-180' : ''}`} />
              </div>

              {showMemberDropdown && (
                <div className="absolute z-40 w-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden">
                  <ul className="max-h-48 md:max-h-56 overflow-y-auto custom-scrollbar py-1.5 md:py-2">
                    {unassignedUsers.length > 0 ? (
                      unassignedUsers.map(u => {
                        const isSelected = selectedMembers.some(m => m.id === u.id);
                        return (
                          <li 
                            key={u.id} 
                            onClick={() => toggleSelectMember(u)} 
                            className={`px-3.5 md:px-4 py-2 md:py-2.5 cursor-pointer border-b border-slate-50 last:border-0 flex items-center justify-between group transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                          >
                            <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                              <div className={`w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-[10px] md:text-xs transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                                {(u.full_name || u.fullName || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className={`text-[13px] md:text-sm font-bold block truncate transition-colors ${isSelected ? 'text-indigo-700' : 'text-slate-700 group-hover:text-slate-900'}`}>{u.full_name || u.fullName}</span>
                                <span className="text-[10px] md:text-[11px] text-slate-400 truncate block">{u.email}</span>
                              </div>
                            </div>
                            <div className={`w-4 h-4 md:w-5 md:h-5 shrink-0 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white group-hover:border-indigo-400'}`}>
                               {isSelected && <Check size={12} className="md:w-3.5 md:h-3.5" strokeWidth={3} />}
                            </div>
                          </li>
                        );
                      })
                    ) : (
                      <li className="p-5 md:p-6 text-center">
                        <User className="mx-auto text-slate-300 mb-1.5 md:mb-2 w-5 h-5 md:w-6 md:h-6" />
                        <span className="text-[13px] md:text-sm text-slate-500 font-medium">Hiện không có nhân sự nào đang trống.</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 md:pt-6 shrink-0 bg-white mt-auto">
            <button 
              disabled={isSubmitting || (mode === 'TEAM' && !formData.departmentId)} 
              type="submit" 
              className="w-full bg-slate-900 text-white font-bold text-[13px] md:text-sm py-3.5 md:py-4 rounded-xl hover:bg-indigo-600 shadow-[0_8px_20px_rgb(0,0,0,0.08)] hover:shadow-[0_8px_20px_rgb(79,70,229,0.25)] disabled:opacity-50 transition-all duration-300 active:scale-[0.98] flex justify-center gap-2 items-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Đang xử lý...
                </>
              ) : (
                action === 'EDIT' ? 'Lưu thay đổi' : 'Xác nhận & Cập nhật'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrgFormModal;