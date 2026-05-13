import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, Loader2 } from 'lucide-react';
import { useOrgStore } from '../state/useOrganizationStore';
import { orgApi } from '../api/organizationApi';
import { OrgUser } from '../types/orgTypes';

export interface UserPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDeptId: string | null;
  targetTeamId: string | null;
}

const UserPickerModal: React.FC<UserPickerModalProps> = ({ isOpen, onClose, targetDeptId, targetTeamId }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [results, setResults] = useState<OrgUser[]>([]);
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
      const res: any = await orgApi.getUnassignedUsers();
      setResults(res.data || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách user:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (val.length > 2) {
      setIsSearching(true);
      try {
        const res: any = await orgApi.searchOrgUsers(val);
        setResults(res.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    } else if (val.length === 0) {
      fetchUnassigned();
    }
  };

  const handleAssignUser = async (user: OrgUser) => {
    if (!targetDeptId || !targetTeamId) return;
    try {
      const userId = user.id || user.user_id;
      if (!userId) return;

      await orgApi.assignUserToTeam(userId, targetTeamId, targetDeptId);
      
      // Cập nhật lên Zustand Store
      addMemberToTeam(targetDeptId, targetTeamId, {
        id: userId,
        full_name: user.full_name || user.fullName || user.name,
        email: user.email,
        status: 'ACTIVE'
      });
      
      onClose();
    } catch (error) {
      console.error("Lỗi gán user:", error);
      alert("Lỗi khi thêm thành viên!");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white z-10">
          <div>
            <h2 className="font-black text-xl text-slate-800">Thêm thành viên</h2>
            <p className="text-xs font-medium text-slate-500 mt-1">Tìm kiếm và gán nhân sự vào Team.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm theo tên, email..." 
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all font-medium text-sm shadow-sm"
            />
          </div>
          {searchTerm.length === 0 && <p className="text-xs font-semibold text-slate-500 mt-3 uppercase tracking-wider">Kho nhân sự chưa phân bổ</p>}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {isSearching ? (
             <div className="flex flex-col items-center justify-center py-10 text-slate-400">
               <Loader2 className="animate-spin mb-2" size={24} />
               <span className="text-sm font-medium">Đang tìm kiếm...</span>
             </div>
          ) : results.length > 0 ? (
            <ul className="space-y-2">
              {results.map(user => (
                <li key={user.id || user.user_id} className="flex justify-between items-center p-3 border border-slate-100 bg-white rounded-xl hover:border-indigo-300 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                      {(user.full_name || user.fullName || user.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[15px] text-slate-800">{user.full_name || user.fullName || user.name}</p>
                      <p className="text-xs font-medium text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAssignUser(user)} 
                    className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-sm"
                  >
                    <UserPlus size={14} /> Gán
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-20">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                  <Search size={28} className="text-slate-300" />
               </div>
               <p className="text-slate-500 font-bold">Không tìm thấy nhân sự phù hợp.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default UserPickerModal;