import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, UserPlus, Loader2, User } from 'lucide-react';
import { orgApi } from '../api/organizationApi';
import { useOrgStore } from '../state/useOrganizationStore';

export interface UserPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDeptId: string | null;
  targetTeamId: string | null;
}

export interface UnassignedUser {
  id: string;
  full_name: string;
  email: string;
  role_id: string | null;
}

const UserPickerModal: React.FC<UserPickerModalProps> = ({ 
  isOpen, 
  onClose, 
  targetDeptId, 
  targetTeamId 
}) => {
  const { fetchTree } = useOrgStore();
  
  const [users, setUsers] = useState<UnassignedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

  // 🚀 TẢI DANH SÁCH USER UNASSIGNED KHI MỞ MODAL
  useEffect(() => {
    if (isOpen) {
      const fetchUnassignedUsers = async () => {
        setIsLoading(true);
        try {
          const res: any = await orgApi.getUnassignedUsers();
          
          const payload = res.data || res; 
          const userData = payload.data || payload.content || payload; 
          
          setUsers(Array.isArray(userData) ? userData : []);
          
        } catch (error) {
          console.error("Lỗi lấy danh sách user chưa gán:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchUnassignedUsers();
      setSearchQuery('');
    }
  }, [isOpen]);

  // 🚀 LỌC DANH SÁCH USER THEO TỪ KHÓA TÌM KIẾM
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const lowerQuery = searchQuery.toLowerCase();
    return users.filter(
      u => (u.full_name && u.full_name.toLowerCase().includes(lowerQuery)) || 
           (u.email && u.email.toLowerCase().includes(lowerQuery))
    );
  }, [users, searchQuery]);

  // 🚀 XỬ LÝ GÁN USER VÀO TEAM
  const handleAssignUser = async (userId: string) => {
    if (!targetTeamId || !targetDeptId) return;

    setAssigningUserId(userId);
    try {
      await orgApi.assignUserToTeam(userId, targetTeamId, targetDeptId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      fetchTree();
    } catch (error: any) {
      console.error("Lỗi khi gán user:", error);
      alert(error.response?.data?.message || "Có lỗi xảy ra khi gán nhân sự.");
    } finally {
      setAssigningUserId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[1.25rem] md:rounded-[24px] w-full max-w-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col max-h-[90vh] md:max-h-[85vh] relative overflow-hidden">
        
        {/* HEADER */}
        <div className="px-5 md:px-8 py-5 md:py-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2.5 md:p-3 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100">
              <UserPlus size={22} className="md:w-6 md:h-6" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-black text-lg md:text-xl text-slate-800 tracking-tight">Thêm thành viên</h2>
              <p className="text-[11px] md:text-xs font-medium text-slate-400 mt-0.5">Chọn nhân sự chưa có nhóm làm việc</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 -mr-1 md:mr-0 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors self-start"
          >
            <X size={20} />
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="px-5 md:px-8 py-4 md:py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 md:w-[18px] md:h-[18px]" />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo tên hoặc email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 md:pl-11 pr-4 py-2.5 md:py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all text-[13px] md:text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm"
            />
          </div>
        </div>

        {/* USER LIST */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/30 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-indigo-600">
              <Loader2 className="animate-spin mb-3 w-7 h-7 md:w-8 md:h-8" strokeWidth={2.5} />
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">Đang tải dữ liệu...</span>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-2 md:space-y-2.5">
              {filteredUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="group flex items-center justify-between p-3 md:p-4 bg-white hover:bg-indigo-50/50 rounded-xl md:rounded-2xl border border-slate-100 hover:border-indigo-100 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center gap-3 md:gap-4 min-w-0 pr-3">
                    {/* Avatar Gradient Đồng Bộ */}
                    <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-black text-xs md:text-sm flex items-center justify-center uppercase shadow-sm shrink-0">
                      {user.full_name ? user.full_name.charAt(0) : <User size={16} className="md:w-[18px] md:h-[18px]" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[13px] md:text-sm text-slate-800 group-hover:text-indigo-700 transition-colors truncate">
                        {user.full_name}
                      </p>
                      <p className="text-[11px] md:text-[12px] font-medium text-slate-400 mt-0.5 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleAssignUser(user.id)}
                    disabled={assigningUserId === user.id}
                    className="flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200 shrink-0"
                  >
                    {assigningUserId === user.id ? (
                      <>
                        <Loader2 size={14} className="animate-spin md:w-4 md:h-4" />
                        <span className="hidden sm:inline">Đang gán...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} className="md:w-4 md:h-4" />
                        <span className="hidden sm:inline">Thêm</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 md:py-16 px-4">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 border-4 border-white shadow-sm">
                <User size={24} className="text-slate-300 md:w-8 md:h-8" />
              </div>
              <p className="text-[15px] md:text-base font-bold text-slate-600 mb-1">
                {searchQuery ? "Không tìm thấy kết quả phù hợp" : "Tất cả nhân sự đã có nhóm"}
              </p>
              <p className="text-[13px] md:text-sm text-slate-400 max-w-[250px] mx-auto leading-relaxed">
                {searchQuery ? "Vui lòng thử tìm kiếm với từ khóa khác." : "Không có nhân viên nào đang trống trong hệ thống hiện tại."}
              </p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default UserPickerModal;