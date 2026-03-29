import React from 'react';
import { Bell, ChevronDown, CircleUser, Search } from 'lucide-react';

const TopNavbar = () => {
  return (
    <nav className="navbar">
      <div className="nav-left">
        <div className="logo">
          <div className="logo-icon">💠</div>
          <span className="logo-text">TaskHub</span>
        </div>
        <div className="workspace-selector">
          <div className="avatar-t">T</div>
          <span>Test Workspace</span>
          <ChevronDown size={16} />
        </div>
      </div>
      <div className="nav-right">
        <div className="search-box">
          <Search size={18} />
          <input type="text" placeholder="Search..." />
        </div>
        <div className="noti-icon">
          <Bell size={20} />
          <span className="badge">2</span>
        </div>
        <CircleUser size={32} className="profile-icon" />
      </div>
    </nav>
  );
};

export default TopNavbar;