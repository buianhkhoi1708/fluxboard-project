import React, { useState } from 'react';
import { X, Search, UserPlus } from 'lucide-react';
import { useOrgStore } from '../store/useOrgStore';

const UserPickerModal = ({ isOpen, onClose, targetDeptId, targetTeamId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  
  const { addMemberToTeam } = useOrgStore();

  if (!isOpen) return null;

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    
    // Giả lập Debounce & Search API
    if (val.length > 2) {
      setIsSearching(true);
      setTimeout(() => {
        setResults([
          { id: `u_${Date.now()}`, fullName: val, email: `${val.replace(/\s/g, '').toLowerCase()}@fluxboard.com`, status: 'ACTIVE' }
        ]);
        setIsSearching(false);
      }, 500);
    } else {
      setResults([]);
    }
  };

  const handleAssignUser = async (user) => {
    try {
      // 1. Gắn API thật ở đây (ví dụ orgApi.assignUserToTeam...)
      
      // 2. Tự động cập nhật Store State (Không cần reload)
      addMemberToTeam(targetDeptId, targetTeamId, {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        status: user.status
      });

      onClose(); // Đóng Modal sau khi thêm thành công
    } catch (error) {
      console.error("Lỗi thêm user:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl relative flex flex-col h-[500px]">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold text-slate-800">Thêm Thành Viên Vào Nhóm</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500"><X size={20} /></button>
        </div>

        <div className="p-5 shrink-0 bg-slate-50">
          <div className="relative">
            <Search className="absolute left-4 top-3 text-slate-400" size={18} />
            <input 
              type="text" autoFocus placeholder="Nhập tên hoặc email..." 
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
              value={searchTerm} onChange={handleSearch}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isSearching ? (
            <div className="text-center text-sm text-slate-500 mt-10">Đang tìm kiếm...</div>
          ) : results.length > 0 ? (
            <ul className="space-y-2">
              {results.map(user => (
                <li key={user.id} className="flex justify-between items-center p-3 border border-slate-100 hover:border-indigo-200 rounded-xl transition group bg-white hover:shadow-sm">
                  <div>
                    <p className="font-bold text-[14px] text-slate-800">{user.fullName}</p>
                    <p className="text-[12px] text-slate-500">{user.email}</p>
                  </div>
                  <button 
                    onClick={() => handleAssignUser(user)}
                    className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition"
                  >
                    <UserPlus size={16} /> Thêm
                  </button>
                </li>
              ))}
            </ul>
          ) : searchTerm.length > 2 ? (
            <div className="text-center text-sm text-slate-500 mt-10">Không tìm thấy nhân viên nào.</div>
          ) : (
            <div className="text-center text-sm text-slate-400 mt-10">Gõ ít nhất 3 ký tự để tìm kiếm...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPickerModal;