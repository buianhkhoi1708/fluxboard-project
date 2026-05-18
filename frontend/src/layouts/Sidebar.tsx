import React, { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../features/auth/store/useAuthStore";
import { useRoleAccess } from "../features/rbac/hooks/useRoleAccess"; // 👈 Import Custom Hook phân quyền
import {
  LayoutDashboard, Briefcase, KanbanSquare, ListTodo,
  Building2, ShieldCheck, Activity, Settings, LogOut,
} from "lucide-react";

const Sidebar = () => {
  const { logout } = useAuthStore();

  // 🚀 Gọi 1 dòng duy nhất để lấy hàm kiểm tra quyền (Đã bao gồm logic dịch Role ID động)
  const { hasAccess } = useRoleAccess();

  // ==========================================
  // DANH SÁCH MENU
  // ==========================================
  const executionItems = [
    { path: "/dashboard", icon: <LayoutDashboard size={20} />, label: "Dashboard", roles: ["MEMBER", "LEAD", "MANAGER", "ADMIN"] },
    { path: "/workspaces", icon: <Briefcase size={20} />, label: "Workspaces", roles: ["MEMBER", "LEAD", "MANAGER", "ADMIN"] },
    { path: "/aigenerateboard", icon: <KanbanSquare size={20} />, label: "AI Boards", roles: ["LEAD", "MANAGER", "ADMIN"] }, 
    { path: "/mytasks", icon: <ListTodo size={20} />, label: "My Tasks", roles: ["MEMBER", "LEAD", "MANAGER", "ADMIN"] },
  ];

  const managementItems = [
    { path: "/organization", icon: <Building2 size={20} />, label: "Organization", roles: ["ADMIN"] },
    { path: "/createuser", icon: <Building2 size={20} />, label: "Create User", roles: ["ADMIN"] },
    { path: "/adminrbac", icon: <ShieldCheck size={20} />, label: "Role Access (RBAC)", roles: ["ADMIN"] },
    { path: "/activity", icon: <Activity size={20} />, label: "Activities", roles: ["MANAGER", "ADMIN"] },
    { path: "/settings", icon: <Settings size={20} />, label: "Settings", roles: ["MEMBER", "LEAD", "MANAGER", "ADMIN"] },
  ];

  // ==========================================
  // 🛠️ BỘ LỌC THỰC THI (Tự động cập nhật khi hook load xong từ điển Quyền)
  // ==========================================
  const visibleExecutionItems = useMemo(() => {
    return executionItems.filter(item => hasAccess(item.roles));
  }, [hasAccess]); // Đưa hasAccess vào dependency

  const visibleManagementItems = useMemo(() => {
    return managementItems.filter(item => hasAccess(item.roles));
  }, [hasAccess]);

  // Component Item con (Giữ nguyên UI của bạn)
  const NavItem = ({ item, isAiHighlight }: { item: any, isAiHighlight?: boolean }) => (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex flex-col md:flex-row items-center md:justify-start gap-1 md:gap-3 px-2 py-2 md:px-3 md:py-2.5 rounded-xl transition-all duration-200 min-w-[64px] md:min-w-0 ${
          isActive
            ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200/50"
            : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 font-medium"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`${isActive ? "text-white" : isAiHighlight ? "text-amber-500" : "text-slate-400"} transition-all`}>
            {item.icon}
          </span>
          <span className={`text-[10px] md:text-sm whitespace-nowrap ${isAiHighlight && !isActive ? "text-indigo-600 font-semibold" : ""}`}>
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );

  return (
    <aside className="fixed bottom-0 left-0 w-full z-50 bg-white border-t border-slate-200 flex flex-row md:relative md:w-64 md:h-screen md:flex-col md:border-t-0 md:border-r shrink-0 transition-all shadow-[-2px_0_10px_rgba(0,0,0,0.05)] md:shadow-none">
      <div className="flex-1 flex flex-row md:flex-col gap-1 md:gap-4 overflow-x-auto md:overflow-y-auto no-scrollbar px-2 py-2 md:px-4 pb-20 md:pb-0">
        
        {/* SECTION EXECUTION */}
        {visibleExecutionItems.length > 0 && (
          <div className="flex flex-row md:flex-col gap-1">
            <p className="hidden md:block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-3 mt-6">
              Execution
            </p>
            {visibleExecutionItems.map((item) => (
              <NavItem key={item.path} item={item} isAiHighlight={item.path === "/aigenerateboard"} />
            ))}
          </div>
        )}

        {/* SECTION MANAGEMENT */}
        {visibleManagementItems.length > 0 && (
          <div className="flex flex-row md:flex-col gap-1 md:mt-2">
            <p className="hidden md:block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-3 mt-4">
              Management
            </p>
            {visibleManagementItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
            
            {/* Nút Logout luôn hiển thị */}
            <button 
              onClick={logout} 
              className="flex flex-col md:flex-row items-center justify-center md:justify-start w-full gap-1 md:gap-3 px-3 py-2.5 rounded-xl text-[10px] md:text-sm font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all group min-w-[64px] md:min-w-0 border border-transparent mt-auto md:mb-6"
            >
              <LogOut size={20} className="group-hover:text-rose-500 transition-colors" />
              <span className="whitespace-nowrap">Logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;