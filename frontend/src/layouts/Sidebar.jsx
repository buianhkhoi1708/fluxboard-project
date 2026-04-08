import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, LogOut, Briefcase, ListTodo, KanbanSquare } from 'lucide-react';

const Sidebar = () => {
  // 👉 Dùng đường dẫn (path) thay vì id để tương thích với React Router
  const menuItems = [
    { path: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { path: '/board', icon: <KanbanSquare size={18} />, label: 'Kanban Board' }, // Chèn thêm menu Bảng Kanban
    { path: '/workspaces', icon: <Briefcase size={18} />, label: 'Workspaces' },
    { path: '/tasks', icon: <ListTodo size={18} />, label: 'My Tasks' },
    { path: '/members', icon: <Users size={18} />, label: 'Members' },
    { path: '/settings', icon: <Settings size={18} />, label: 'Settings' },
  ];

  return (
    // 👉 Dùng bg-slate-50 thay vì màu tự chế, thêm bóng mờ phân cách
    <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-full shrink-0">
      
      {/* KHU VỰC MENU CHÍNH */}
      <div className="flex-1 py-6 px-3 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm ring-1 ring-indigo-100/50' // Trạng thái đang chọn
                  : 'text-slate-600 font-medium hover:bg-white hover:text-slate-900 hover:shadow-sm hover:ring-1 hover:ring-slate-200' // Trạng thái bình thường
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`${isActive ? 'text-indigo-600' : 'text-slate-400'} transition-colors`}>
                  {item.icon}
                </span>
                <span className="text-sm">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
      
      {/* KHU VỰC NÚT LOGOUT NẰM ĐÁY */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <button className="flex items-center w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all group">
          <LogOut size={18} className="text-slate-400 group-hover:text-red-500 transition-colors" />
          <span>Đăng xuất</span>
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;