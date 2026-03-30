import React from 'react';
import { Bell, ChevronDown, CircleUser, Search } from 'lucide-react';

const TopNavbar = ({ apiStatus }) => {
  return (
    <nav className="flex justify-between items-center px-5 h-[60px] border-b border-mac-border bg-white sticky top-0 z-50">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2.5 w-[220px]">
          <div className="text-xl">💠</div>
          <span className="font-bold text-lg tracking-tight">TaskHub</span>
        </div>
        
        <div className="flex items-center gap-2.5 border border-gray-300 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-all group">
          <div className="bg-[#ff5722] text-white w-6 h-6 flex items-center justify-center rounded text-xs font-bold">T</div>
          <span className="text-sm font-medium">Test Workspace</span>
          <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600" />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{apiStatus}</span>
        <div className="relative cursor-pointer text-gray-500 hover:text-black">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full border-2 border-white">2</span>
        </div>
        <CircleUser size={32} className="text-blue-600 cursor-pointer hover:opacity-80" />
      </div>
    </nav>
  );
};

export default TopNavbar;