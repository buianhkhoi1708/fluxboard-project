import React from 'react';
import { LayoutDashboard, Users, CheckCircle, Settings, LogOut, Briefcase, ListTodo } from 'lucide-react';

const Sidebar = ({ activeMenu, setActiveMenu }) => {
  const menuItems = [
    { id: 'Dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { id: 'Workspaces', icon: <Briefcase size={20} />, label: 'Workspaces' },
    { id: 'My Tasks', icon: <ListTodo size={20} />, label: 'My Tasks' },
    { id: 'Members', icon: <Users size={20} />, label: 'Members' },
    { id: 'Achieved', icon: <CheckCircle size={20} />, label: 'Achieved' },
    { id: 'Settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <aside className="w-[240px] bg-mac-sidebar border-r border-mac-border flex flex-col h-full">
      <div className="flex-1 py-4">
        {menuItems.map((item) => (
          <div 
            key={item.id} 
            onClick={() => setActiveMenu(item.id)}
            className={`flex items-center gap-4 px-6 py-3 cursor-pointer transition-all border-l-4 
              ${activeMenu === item.id 
                ? 'bg-white text-blue-600 border-blue-600 font-bold shadow-sm' 
                : 'text-gray-500 border-transparent hover:bg-gray-200'}`}
          >
            <span className={activeMenu === item.id ? 'text-blue-600' : 'text-gray-400'}>{item.icon}</span>
            <span className="text-sm">{item.label}</span>
          </div>
        ))}
      </div>
      
      <div className="border-t border-mac-border px-6 py-5 flex items-center gap-4 text-gray-500 hover:bg-red-50 hover:text-red-500 cursor-pointer transition-colors group">
        <LogOut size={20} className="group-hover:rotate-180 transition-transform duration-300" />
        <span className="text-sm font-medium">Logout</span>
      </div>
    </aside>
  );
};

export default Sidebar;