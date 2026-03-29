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
    <aside className="sidebar">
      <div className="menu-group">
        {menuItems.map((item) => (
          <div 
            key={item.id} 
            className={`nav-item ${activeMenu === item.id ? 'active' : ''}`} 
            onClick={() => setActiveMenu(item.id)}
          >
            {item.icon} <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="spacer"></div>
      <div className="nav-item logout">
        <LogOut size={20} /> <span>Logout</span>
      </div>
    </aside>
  );
};

export default Sidebar;