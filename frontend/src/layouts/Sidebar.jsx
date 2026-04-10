import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, LogOut, Briefcase, ListTodo, KanbanSquare, Shield } from 'lucide-react';

const Sidebar = () => {
  const menuItems = [
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/board', icon: <KanbanSquare size={20} />, label: 'Kanban' }, // Rút gọn tên cho mobile dễ nhìn
    { path: '/workspaces', icon: <Briefcase size={20} />, label: 'Workspaces' },
    { path: '/tasks', icon: <ListTodo size={20} />, label: 'My Tasks' },
    { path: '/members', icon: <Users size={20} />, label: 'Members' },
    { path: '/adminrbac', icon: <Shield size={20} />, label: 'RBAC' }, // Rút gọn chữ Phân Quyền
    { path: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <aside className="
      fixed bottom-0 left-0 w-full z-50 bg-slate-50 border-t border-slate-200 flex flex-row shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]
      md:relative md:w-64 md:h-full md:flex-col md:border-t-0 md:border-r md:shadow-none shrink-0 transition-all
    ">
      
      {/* KHU VỰC MENU CHÍNH */}
      {/* Mobile: Nằm ngang, cuộn ngang được | Desktop: Nằm dọc */}
      <div className="flex-1 flex flex-row md:flex-col gap-1 md:gap-1.5 overflow-x-auto md:overflow-y-auto no-scrollbar md:custom-scrollbar px-2 py-2 md:py-6 md:px-3">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col md:flex-row items-center md:justify-start gap-1 md:gap-3 px-2 py-2 md:px-3 md:py-2.5 rounded-xl transition-all duration-200 min-w-[64px] md:min-w-0 ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-bold md:shadow-sm md:ring-1 md:ring-indigo-100/50' 
                  : 'text-slate-500 md:text-slate-600 font-medium hover:bg-white hover:text-slate-900 md:hover:shadow-sm md:hover:ring-1 md:hover:ring-slate-200' 
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`${isActive ? 'text-indigo-600 scale-110' : 'text-slate-400'} transition-all duration-200`}>
                  {item.icon}
                </span>
                {/* Mobile: Chữ nhỏ xíu dưới icon | Desktop: Chữ to nằm ngang */}
                <span className="text-[10px] md:text-sm whitespace-nowrap">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
      
      {/* KHU VỰC NÚT LOGOUT */}
      {/* Mobile: Nằm chốt sổ bên phải Bottom Bar | Desktop: Nằm dưới đáy Sidebar */}
      <div className="p-2 md:p-4 md:border-t md:border-slate-200 bg-slate-50 flex items-center justify-center md:justify-start shrink-0 border-l border-slate-200 md:border-l-0">
        <button className="flex flex-col md:flex-row items-center md:justify-start w-full gap-1 md:gap-3 px-2 md:px-3 py-2 md:py-2.5 rounded-xl text-[10px] md:text-sm font-bold text-slate-500 md:text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all group min-w-[64px] md:min-w-0">
          <LogOut size={20} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
          <span className="whitespace-nowrap">Đăng xuất</span>
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;