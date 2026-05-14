import React, { useState, useEffect } from 'react';
import { X, Search, ChevronDown, Loader2 } from 'lucide-react';
import { useOrgStore } from '../state/useOrganizationStore';
import { orgApi } from '../api/organizationApi';
import { OrgMember } from '../types/orgTypes';

export interface OrgFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'DEPARTMENT' | 'TEAM';
  targetDeptId?: string | null;
}

export interface OrgFormData {
  name: string;
  code: string;
  description: string;
  departmentId: string;
  leadId: string;
  leadName: string;
}

const OrgFormModal: React.FC<OrgFormModalProps> = ({ isOpen, onClose, mode = 'DEPARTMENT', targetDeptId }) => {
  const { orgTree, addDepartmentToTree, addTeamToDepartment } = useOrgStore();
  const initialForm: OrgFormData = { name: '', code: '', description: '', departmentId: targetDeptId || '', leadId: '', leadName: '' };
  
  const [formData, setFormData] = useState<OrgFormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchLeadTerm, setSearchLeadTerm] = useState('');
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<OrgMember[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormData(initialForm);
      setSearchLeadTerm('');
      setShowLeadDropdown(false);
      setSearchResults([]);
    } else {
      setFormData(prev => ({ ...prev, departmentId: targetDeptId || '' }));
    }
  }, [isOpen, targetDeptId]);

  useEffect(() => {
    if (searchLeadTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res: any = await orgApi.searchOrgUsers(searchLeadTerm);
        setSearchResults(res.data?.data || []);
      } catch (err) {
        console.error(err);
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
        const payload = { name: formData.name, code: formData.code, department_id: formData.departmentId, lead_id: formData.leadId, description: formData.description };
        const res: any = await orgApi.createTeam(payload);
        if (res.data?.success || res.data) {
          addTeamToDepartment(formData.departmentId, res.data?.data || res.data);
          onClose();
        }
      }
    } catch (error) {
      console.error("Lỗi tạo mới:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-lg">{mode === 'DEPARTMENT' ? 'Thêm Phòng Ban' : 'Thêm Team mới'}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-red-500 rounded-full"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'TEAM' && (
            <div>
              <label className="block text-sm font-semibold mb-1">Thuộc phòng ban</label>
              <select required value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-100">
                <option value="">-- Chọn phòng ban --</option>
                {orgTree.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold mb-1">Tên {mode === 'DEPARTMENT' ? 'phòng ban' : 'Team'}</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Mã (Code)</label>
            <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 uppercase" />
          </div>
          <div className="relative">
            <label className="block text-sm font-semibold mb-1">Người quản lý (Leader)</label>
            <div onClick={() => setShowLeadDropdown(!showLeadDropdown)} className="w-full px-4 py-2 border rounded-xl flex justify-between items-center cursor-pointer bg-slate-50">
              <span className={formData.leadName ? 'text-slate-800' : 'text-slate-400'}>{formData.leadName || 'Chọn người quản lý...'}</span>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
            {showLeadDropdown && (
              <div className="absolute z-10 w-full mt-2 bg-white border shadow-lg rounded-xl overflow-hidden">
                <div className="p-2 border-b bg-slate-50 flex items-center gap-2">
                  <Search size={16} className="text-slate-400" />
                  <input autoFocus type="text" placeholder="Nhập tên để tìm..." value={searchLeadTerm} onChange={(e) => setSearchLeadTerm(e.target.value)} className="w-full bg-transparent outline-none text-sm" />
                </div>
                <ul className="max-h-48 overflow-y-auto">
                  {isSearching ? <li className="p-4 text-center text-slate-400"><Loader2 className="animate-spin inline" size={18} /></li> 
                  : searchResults.length > 0 ? searchResults.map(u => (
                    <li key={u.id || u.user_id} onClick={() => handleSelectLead(u)} className="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0">
                      <span className="font-bold text-sm block">{u.full_name || u.fullName || u.name}</span>
                      <span className="text-[11px] text-slate-500">{u.email}</span>
                    </li>
                  )) : <li className="p-4 text-center text-sm text-slate-400">Không tìm thấy user.</li>}
                </ul>
              </div>
            )}
          </div>
          <button disabled={isSubmitting || !formData.leadId} type="submit" className="w-full mt-8 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex justify-center gap-2">
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Xác nhận'}
          </button>
        </form>
      </div>
    </div>
  );
};
export default OrgFormModal;