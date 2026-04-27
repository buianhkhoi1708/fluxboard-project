import React, { useState, useEffect } from 'react';
import { X, Search, ChevronDown, Loader2 } from 'lucide-react';
import { useOrgStore } from '../store/useOrgStore';
import { orgApi } from '../api/orgApi';

const OrgFormModal = ({ isOpen, onClose, mode = 'DEPARTMENT' }) => {
  const { orgTree, addDepartmentToTree, addTeamToDepartment } = useOrgStore();
  const [formData, setFormData] = useState({ name: '', code: '', description: '', departmentId: '', leadId: '', leadName: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchLeadTerm, setSearchLeadTerm] = useState('');
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormData({ name: '', code: '', description: '', departmentId: '', leadId: '', leadName: '' });
      setSearchLeadTerm('');
      setShowLeadDropdown(false);
      setSearchResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchLeadTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await orgApi.searchOrgUsers(searchLeadTerm);
        setSearchResults(res.data || []);
      } catch (error) {
        console.error("Lỗi tìm kiếm user:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchLeadTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === 'DEPARTMENT') {
        const res = await orgApi.saveDepartment({ 
          name: formData.name, code: formData.code, manager_id: formData.leadId, manager_name: formData.leadName, description: formData.description
        });
        addDepartmentToTree(res.data);
      } else {
        const res = await orgApi.saveTeam({ 
          name: formData.name, code: formData.code, department_id: formData.departmentId, lead_id: formData.leadId, lead_name: formData.leadName, description: formData.description
        });
        addTeamToDepartment(formData.departmentId, res.data);
      }
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectLead = (user) => {
    setFormData({ ...formData, leadId: user.id || user.user_id, leadName: user.full_name || user.fullName || user.name });
    setSearchLeadTerm('');
    setShowLeadDropdown(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative zoom-in-95">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500"><X size={20} /></button>
        <h2 className="text-xl font-bold text-slate-800 mb-6">{mode === 'DEPARTMENT' ? 'Tạo Phòng Ban' : 'Tạo Nhóm (Team)'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Tên {mode === 'DEPARTMENT' ? 'Phòng Ban' : 'Nhóm'}</label>
              <input type="text" required placeholder="Nhập tên..." className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="w-24 shrink-0">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Mã (Code)</label>
              <input type="text" required placeholder="VD: IT" className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none uppercase" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Mô tả ngắn</label>
            <input type="text" placeholder="Nhập mô tả..." className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          {mode === 'TEAM' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Phòng Ban Chủ Quản</label>
              <div className="relative">
                <select required className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white" value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})}>
                  <option value="" disabled>-- Chọn Phòng Ban --</option>
                  {orgTree.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>
          )}

          <div className="relative">
            <label className="block text-sm font-semibold text-slate-700 mb-1">{mode === 'DEPARTMENT' ? 'Manager (Trưởng phòng)' : 'Leader (Trưởng nhóm)'}</label>
            <div className="w-full px-4 py-2 border border-slate-300 rounded-xl flex justify-between items-center cursor-pointer bg-white" onClick={() => setShowLeadDropdown(!showLeadDropdown)}>
              <span className={formData.leadName ? 'text-slate-800 font-medium' : 'text-slate-400'}>{formData.leadName || '-- Tìm người quản lý --'}</span>
              <Search size={18} className="text-slate-400" />
            </div>

            {showLeadDropdown && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                <input type="text" autoFocus placeholder="Gõ tên để tìm..." className="w-full px-4 py-2.5 border-b border-slate-100 outline-none text-sm bg-slate-50" value={searchLeadTerm} onChange={(e) => setSearchLeadTerm(e.target.value)} />
                <ul className="max-h-48 overflow-y-auto">
                  {isSearching ? <li className="px-4 py-6 flex flex-col items-center justify-center text-slate-400"><Loader2 className="animate-spin mb-2" size={20} /><span className="text-xs">Đang tìm kiếm...</span></li>
                  : searchLeadTerm.length < 2 ? <li className="px-4 py-4 text-xs text-slate-400 text-center">Gõ thêm để tìm...</li>
                  : searchResults.length > 0 ? searchResults.map(u => (
                      <li key={u.id || u.user_id} onClick={() => handleSelectLead(u)} className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm flex flex-col border-b border-slate-50 last:border-0">
                        <span className="font-bold text-slate-700">{u.full_name || u.fullName || u.name}</span>
                        <span className="text-[11px] text-slate-400">{u.email}</span>
                      </li>
                  )) : <li className="px-4 py-4 text-sm text-slate-400 text-center">Không tìm thấy user.</li>}
                </ul>
              </div>
            )}
          </div>

          <button disabled={isSubmitting || !formData.leadId} type="submit" className="w-full mt-8 bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex justify-center items-center gap-2">
            {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Đang lưu...</> : 'Xác nhận tạo'}
          </button>
        </form>
      </div>
    </div>
  );
};
export default OrgFormModal;