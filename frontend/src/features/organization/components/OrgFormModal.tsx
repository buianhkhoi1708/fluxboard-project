import React, { useState, useEffect } from 'react';
import { X, Search, ChevronDown, Loader2, Building2, Users, User, Hash } from 'lucide-react';
import { useOrgStore } from '../state/useOrganizationStore';
import { orgApi } from '../api/organizationApi';
import { OrgMember } from '../types/orgTypes';

export interface OrgFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'DEPARTMENT' | 'TEAM';
  action?: 'CREATE' | 'EDIT';
  targetDeptId?: string | null;
  targetTeam?: any | null;
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
  targetTeam 
}) => {
  const { orgTree, addDepartmentToTree, addTeamToDepartment, fetchTree } = useOrgStore();
  
  const initialForm: OrgFormData = { 
    name: '', code: '', description: '', departmentId: targetDeptId || '', leadId: '', leadName: '' 
  };
  
  const [formData, setFormData] = useState<OrgFormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchLeadTerm, setSearchLeadTerm] = useState('');
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<OrgMember[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // LOGIC PRE-FILL DỮ LIỆU KHI EDIT
  useEffect(() => {
    if (!isOpen) {
      setFormData(initialForm);
      setSearchLeadTerm('');
      setShowLeadDropdown(false);
      setSearchResults([]);
    } else {
      if (action === 'EDIT' && targetTeam && mode === 'TEAM') {
        setFormData({
          name: targetTeam.name || '',
          code: targetTeam.code || '',
          description: targetTeam.description || '',
          departmentId: targetDeptId || targetTeam.department_id || '',
          leadId: targetTeam.lead_id || '',
          leadName: targetTeam.lead_name || targetTeam.leadName || ''
        });
      } else {
        setFormData(prev => ({ ...prev, departmentId: targetDeptId || '' }));
      }
    }
  }, [isOpen, targetDeptId, action, targetTeam, mode]);

  // Logic tìm kiếm User để làm Leader
  useEffect(() => {
    if (searchLeadTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res: any = await orgApi.searchOrgUsers(searchLeadTerm);
        const payload = res.data || res;
        const usersData = payload.data || payload.content || payload;
        setSearchResults(Array.isArray(usersData) ? usersData : []);
      } catch (err) {
        console.error("Lỗi tìm kiếm user:", err);
      } finally {
        setIsSearching(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === 'DEPARTMENT') {
        const payload = { name: formData.name, code: formData.code, description: formData.description, manager_id: formData.leadId };
        const res: any = await orgApi.createDepartment(payload);
        if (res.data?.success || res.data) {
          addDepartmentToTree(res.data?.data || res.data);
          onClose();
        }
      } else {
        const payload = { 
          name: formData.name, code: formData.code, department_id: formData.departmentId, lead_id: formData.leadId, description: formData.description 
        };
        if (action === 'EDIT' && targetTeam) {
          await orgApi.updateTeam(targetTeam.id, payload);
          fetchTree();
          onClose();
        } else {
          const res: any = await orgApi.createTeam(payload);
          if (res.data?.success || res.data) {
            addTeamToDepartment(formData.departmentId, res.data?.data || res.data);
            onClose();
          }
        }
      }
    } catch (error) {
      console.error("Lỗi:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[24px] w-full max-w-lg shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col relative">
        
        {/* HEADER */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[24px]">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl flex items-center justify-center shadow-sm border ${mode === 'DEPARTMENT' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
              {mode === 'DEPARTMENT' ? <Building2 size={24} strokeWidth={1.5} /> : <Users size={24} strokeWidth={1.5} />}
            </div>
            <div>
              <h2 className="font-black text-xl text-slate-800 tracking-tight">
                {mode === 'DEPARTMENT' 
                  ? 'Tạo Phòng Ban mới' 
                  : action === 'EDIT' ? 'Cập nhật thông tin Team' : 'Thêm Team mới'}
              </h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Điền các thông tin cơ bản bên dưới
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors self-start">
            <X size={20} />
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {mode === 'TEAM' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Thuộc phòng ban <span className="text-rose-500">*</span></label>
              <div className="relative">
                <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                  required 
                  value={formData.departmentId} 
                  onChange={e => setFormData({...formData, departmentId: e.target.value})} 
                  className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>-- Chọn phòng ban --</option>
                  {orgTree.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Tên {mode === 'DEPARTMENT' ? 'phòng ban' : 'Team'} <span className="text-rose-500">*</span></label>
              <input 
                required 
                type="text" 
                placeholder="VD: Khối Kỹ Thuật"
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-400" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Mã Code <span className="text-rose-500">*</span></label>
              <div className="relative">
                <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  required 
                  type="text" 
                  placeholder="VD: ENG"
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value})} 
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all uppercase placeholder:text-slate-400 placeholder:normal-case" 
                />
              </div>
            </div>
          </div>
          
          {/* SEARCH CHỌN LEADER */}
          <div className="relative">
            <label className="block text-sm font-bold text-slate-700 mb-2">Người quản lý (Leader)</label>
            <div 
              onClick={() => setShowLeadDropdown(!showLeadDropdown)} 
              className={`w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center cursor-pointer transition-all hover:bg-slate-100 ${showLeadDropdown ? 'ring-4 ring-indigo-50 border-indigo-400 bg-white' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${formData.leadName ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                  {formData.leadName ? formData.leadName.charAt(0).toUpperCase() : <User size={14} />}
                </div>
                <span className={`text-sm font-medium ${formData.leadName ? 'text-slate-800' : 'text-slate-400'}`}>
                  {formData.leadName || 'Tìm kiếm người quản lý...'}
                </span>
              </div>
              <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${showLeadDropdown ? 'rotate-180' : ''}`} />
            </div>

            {/* DROPDOWN MENU */}
            {showLeadDropdown && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-slate-100 bg-slate-50/50 relative">
                  <Search size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    autoFocus 
                    type="text" 
                    placeholder="Gõ tên hoặc email..." 
                    value={searchLeadTerm} 
                    onChange={(e) => setSearchLeadTerm(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all" 
                  />
                </div>
                <ul className="max-h-56 overflow-y-auto custom-scrollbar py-1">
                  {isSearching ? (
                    <li className="p-6 flex flex-col items-center text-slate-400">
                      <Loader2 className="animate-spin mb-2" size={24} />
                      <span className="text-xs font-bold uppercase tracking-wider">Đang tìm...</span>
                    </li>
                  ) : searchResults.length > 0 ? (
                    searchResults.map(u => (
                      <li 
                        key={u.id || u.user_id} 
                        onClick={() => handleSelectLead(u)} 
                        className="px-4 py-3 hover:bg-indigo-50/70 cursor-pointer border-b border-slate-50 last:border-0 flex items-center gap-3 group"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs group-hover:bg-indigo-200 group-hover:text-indigo-700 transition-colors">
                           {(u.full_name || u.fullName || u.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-700 block group-hover:text-indigo-700 transition-colors">{u.full_name || u.fullName || u.name}</span>
                          <span className="text-xs text-slate-400 font-medium">{u.email}</span>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="p-6 text-center text-sm text-slate-400 font-medium">
                      {searchLeadTerm.length < 2 ? 'Nhập ít nhất 2 ký tự để tìm kiếm.' : 'Không tìm thấy kết quả phù hợp.'}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
          
          <div className="pt-4">
            <button 
              disabled={isSubmitting || (mode === 'TEAM' && !formData.departmentId)} 
              type="submit" 
              className="w-full bg-slate-900 text-white font-bold text-sm py-4 rounded-xl hover:bg-indigo-600 shadow-[0_8px_20px_rgb(0,0,0,0.08)] hover:shadow-[0_8px_20px_rgb(79,70,229,0.25)] disabled:opacity-50 transition-all duration-300 active:scale-[0.98] flex justify-center gap-2 items-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Đang xử lý...
                </>
              ) : (
                action === 'EDIT' ? 'Lưu thay đổi' : 'Xác nhận tạo mới'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrgFormModal;