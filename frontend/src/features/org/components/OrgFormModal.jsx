import React, { useState } from 'react';
import { X, Search, ChevronDown } from 'lucide-react';
import { useOrgStore } from '../store/useOrgStore';
import { orgApi } from '../api/orgApi';

const OrgFormModal = ({ isOpen, onClose, mode = 'DEPARTMENT' }) => {
  const { orgTree, addDepartmentToTree, addTeamToDepartment } = useOrgStore();
  const [formData, setFormData] = useState({ name: '', departmentId: '', leadId: '', leadName: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchLeadTerm, setSearchLeadTerm] = useState('');
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);

  // Mock data User (Thực tế bạn sẽ gọi API Search User)
  const mockUsers = [
    { id: 'user_1', name: 'Nguyễn Văn Mạnh', email: 'manh@fluxboard.com' },
    { id: 'user_2', name: 'Bùi Anh Khôi', email: 'khoi@fluxboard.com' },
  ].filter(u => u.name.toLowerCase().includes(searchLeadTerm.toLowerCase()));

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === 'DEPARTMENT') {
        const res = await orgApi.saveDepartment({ 
          name: formData.name, managerId: formData.leadId, status: 'ACTIVE' 
        });
        addDepartmentToTree(res.data);
      } else {
        const res = await orgApi.saveTeam({ 
          name: formData.name, departmentId: formData.departmentId, leadId: formData.leadId, status: 'ACTIVE' 
        });
        addTeamToDepartment(formData.departmentId, res.data);
      }
      onClose();
    } catch (error) {
      console.error("Lỗi lưu dữ liệu", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectLead = (user) => {
    setFormData({ ...formData, leadId: user.id, leadName: user.name });
    setSearchLeadTerm('');
    setShowLeadDropdown(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative zoom-in-95">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500"><X size={20} /></button>
        
        <h2 className="text-xl font-bold text-slate-800 mb-6">
          {mode === 'DEPARTMENT' ? 'Tạo Phòng Ban' : 'Tạo Nhóm (Team)'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Tên {mode === 'DEPARTMENT' ? 'Phòng Ban' : 'Nhóm'}</label>
            <input 
              type="text" required placeholder="Nhập tên..."
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          {/* TEAM MODE: Dropdown Select chọn Department */}
          {mode === 'TEAM' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Phòng Ban Chủ Quản</label>
              <div className="relative">
                <select 
                  required
                  className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
                  value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})}
                >
                  <option value="" disabled>-- Chọn Phòng Ban --</option>
                  {orgTree.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>
          )}

          {/* Search Select UI cho Leader */}
          <div className="relative">
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              {mode === 'DEPARTMENT' ? 'Manager (Trưởng phòng)' : 'Leader (Trưởng nhóm)'}
            </label>
            
            <div 
              className="w-full px-4 py-2 border border-slate-300 rounded-xl flex justify-between items-center cursor-pointer bg-white"
              onClick={() => setShowLeadDropdown(!showLeadDropdown)}
            >
              <span className={formData.leadName ? 'text-slate-800' : 'text-slate-400'}>
                {formData.leadName || '-- Tìm kiếm người quản lý --'}
              </span>
              <Search size={18} className="text-slate-400" />
            </div>

            {showLeadDropdown && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                <input 
                  type="text" autoFocus placeholder="Gõ tên để tìm..."
                  className="w-full px-4 py-2 border-b border-slate-100 outline-none text-sm"
                  value={searchLeadTerm} onChange={(e) => setSearchLeadTerm(e.target.value)}
                />
                <ul className="max-h-40 overflow-y-auto">
                  {mockUsers.length > 0 ? mockUsers.map(u => (
                    <li 
                      key={u.id} onClick={() => handleSelectLead(u)}
                      className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm flex flex-col"
                    >
                      <span className="font-bold text-slate-700">{u.name}</span>
                      <span className="text-[11px] text-slate-400">{u.email}</span>
                    </li>
                  )) : (
                    <li className="px-4 py-3 text-sm text-slate-400 text-center">Không tìm thấy user.</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <button disabled={isSubmitting || !formData.leadId} type="submit" className="w-full mt-6 bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition">
            {isSubmitting ? 'Đang lưu...' : 'Xác nhận tạo'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OrgFormModal;