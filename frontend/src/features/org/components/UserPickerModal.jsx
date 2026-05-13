import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, Loader2 } from 'lucide-react';
import { useOrgStore } from '../store/useOrgStore';
import { orgApi } from '../api/orgApi';

const UserPickerModal = ({ isOpen, onClose, targetDeptId, targetTeamId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const { addMemberToTeam } = useOrgStore();

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setResults([]);
    } else {
      fetchUnassigned();
    }
  }, [isOpen]);

  const fetchUnassigned = async () => {
    setIsSearching(true);
    try {
      const res = await orgApi.getUnassignedUsers();
      setResults(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (val.length > 2) {
      setIsSearching(true);
      try {
        const res = await orgApi.searchOrgUsers(val);
        setResults(res.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    } else if (val.length === 0) {
      fetchUnassigned(); // Nếu xóa trống ô search thì load lại kho unassigned
    }
  };

  const handleAssignUser = async (user) => {
    try {
      await orgApi.assignUserToTeam(user.id || user.user_id, targetTeamId, targetDeptId);
      addMemberToTeam(targetDeptId, targetTeamId, {
        id: user.id || user.user_id,
        fullName: user.full_name || user.fullName,
        email: user.email,
        status: user.status || 'ACTIVE'
      });
      onClose(); 
    } catch (error) {
      console.error(error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col h-[500px]">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Thêm Thành Viên Vào Nhóm</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500"><X size={20} /></button>
        </div>

        <div className="p-5 shrink-0 bg-slate-50 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-4 top-3 text-slate-400" size={18} />
            <input type="text" placeholder="Tìm nhân sự toàn công ty..." className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={searchTerm} onChange={handleSearch} />
          </div>
          {!searchTerm && <p className="text-xs font-semibold text-slate-500 mt-3 uppercase tracking-wider">Kho nhân sự chưa phân bổ</p>}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isSearching ? (
             <div className="flex flex-col items-center justify-center py-10 text-slate-400"><Loader2 className="animate-spin mb-2" size={24} /><span className="text-sm">Đang tải...</span></div>
          ) : results.length > 0 ? (
            <ul className="space-y-2">
              {results.map(user => (
                <li key={user.id || user.user_id} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl hover:border-indigo-200 transition">
                  <div>
                    <p className="font-bold text-sm text-slate-800">{user.full_name || user.fullName}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <button onClick={() => handleAssignUser(user)} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:text-indigo-600 transition">
                    <UserPlus size={16} /> Thêm
                  </button>
                </li>
              ))}
            </ul>
          ) : <div className="text-center text-sm text-slate-400 mt-10">Không tìm thấy nhân viên nào.</div>}
        </div>
      </div>
    </div>
  );
};
export default UserPickerModal;