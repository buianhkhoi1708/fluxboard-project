import React, { useState } from 'react';
import Logo from '../../src/assets/icon.svg'; 
import { ChevronDown, Search, User } from 'lucide-react';
import { useAuthUser, useLogout } from '../features/auth/hooks/useAuthQueries'; 
import { useRoleAccess } from '../features/rbac/hooks/useRoleAccess'; 

import NotificationDropdown from '../features/notification/components/NotificationDropdown';

const TopNavbar = () => {
  const { data: user } = useAuthUser(); // Lấy dữ liệu user từ Cache
  const { mutate: logout } = useLogout(); // Lấy hàm kích hoạt đăng xuất
  const { currentRoleName } = useRoleAccess(); 
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const userName = user?.full_name || user?.fullName || "Khách";
  const userInitial = userName.charAt(0).toUpperCase();
  const avatarUrl = user?.avatar_url || user?.avatarUrl;

  const handleUserProfile = () => {
    // Điều hướng đến trang cài đặt/hồ sơ
    window.location.href = '/settings'; // hoặc dùng useNavigate nếu có router context
  };

  return (
    <nav className="flex justify-between items-center px-4 md:px-6 h-[64px] border-b border-slate-200/80 bg-gradient-to-r from-white/90 via-white/80 to-indigo-50/50 backdrop-blur-md sticky top-0 z-50 shadow-sm shrink-0 select-none">
      
      {/* LEFT SECTION: Logo & Workspace */}
      <div className="flex items-center gap-4 md:gap-8 min-w-0">
        <div className="flex items-center gap-2 md:gap-2.5 min-w-0 sm:min-w-[200px]">
          <img 
            src={Logo}
            alt="Fluxboard" 
            className="h-7 md:h-8 w-auto object-contain shrink-0" 
          />
          <span className="font-black text-lg md:text-xl tracking-tight text-slate-900 truncate">
            Fluxboard
          </span>
        </div>
      </div>

      {/* RIGHT SECTION: Notifications & Profile */}
      <div className="flex items-center gap-3 md:gap-5 shrink-0">
        
        {/* Dropdown thông báo */}
        <NotificationDropdown />
        
        {/* Vertical Divider */}
        <div className="h-5 w-px bg-slate-200 hidden md:block"></div>

        {/* User Profile Section */}
        <div className="relative">
          <button 
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-1.5 md:gap-2 hover:opacity-80 transition-all p-1 rounded-full focus:outline-none focus:ring-4 focus:ring-indigo-100"
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={userName} 
                className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-sm border border-indigo-200 shrink-0">
                {userInitial}
              </div>
            )}
            <ChevronDown size={14} className={`text-slate-400 hidden sm:block transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-52 md:w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right backdrop-blur-sm">
              <div className="px-4 py-2.5 border-b border-slate-100 mb-1">
                <p className="text-xs md:text-sm font-black text-slate-800 truncate">{userName}</p>
                <p className="text-[10px] md:text-[11px] font-semibold text-slate-400 truncate mt-0.5">{user?.email || "Chưa có email"}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase rounded-md border border-indigo-100">
                  {currentRoleName || "Thành viên"}
                </span>
              </div>
              
              <button 
                type="button"
                onClick={handleUserProfile} 
                className="w-[calc(100%-8px)] text-left px-3 py-2 text-[13px] md:text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-2 rounded-xl mx-1"
              >
                <User size={14} className="md:w-4 md:h-4 text-slate-400 group-hover:text-indigo-600" /> Hồ sơ cá nhân
              </button>
              
              <button 
                type="button"
                onClick={() => logout()} 
                className="w-[calc(100%-8px)] text-left px-3 py-2 text-[13px] md:text-sm font-bold text-rose-600 hover:bg-rose-50/60 transition-colors flex items-center gap-2 rounded-xl mx-1"
              >
                <div className="w-3.5 h-3.5 md:w-4 md:h-4" /> Đăng xuất
              </button>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
};

export default TopNavbar;