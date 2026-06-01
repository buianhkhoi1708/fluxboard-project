import React, { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../features/auth/store/useAuthStore";
import { useRoleAccess } from "../features/rbac/hooks/useRoleAccess";
import {
  LayoutDashboard,
  Briefcase,
  KanbanSquare,
  ListTodo,
  Building2,
  ShieldCheck,
  Activity,
  Settings,
  LogOut,
  Bell,
} from "lucide-react";

type MenuItem = {
  path: string;
  icon: React.ReactNode;
  label: string;
  roles: string[];
};

const Sidebar = () => {
  const { logout } = useAuthStore();
  const { hasAccess } = useRoleAccess();

  // Danh sách menu
  const executionItems: MenuItem[] = [
    {
      path: "/dashboard",
      icon: <LayoutDashboard className="w-5 h-5 md:w-5 md:h-5" />,
      label: "Bảng điều khiển",
      roles: ["MEMBER", "LEAD", "MANAGER", "ADMIN", "EMPLOYEE", "SYSTEM_ADMIN"],
    },
    {
      path: "/workspaces",
      icon: <Briefcase className="w-5 h-5 md:w-5 md:h-5" />,
      label: "Không gian làm việc",
      roles: ["EMPLOYEE", "LEAD", "MANAGER", "ADMIN", "MEMBER", "SYSTEM_ADMIN"],
    },
    {
      path: "/aigenerateboard",
      icon: <KanbanSquare className="w-5 h-5 md:w-5 md:h-5" />,
      label: "Tạo Board AI",
      roles: ["LEAD", "MANAGER", "ADMIN", "SYSTEM_ADMIN"],
    },
    {
      path: "/mytasks",
      icon: <ListTodo className="w-5 h-5 md:w-5 md:h-5" />,
      label: "Công việc của tôi",
      roles: ["MEMBER", "LEAD", "MANAGER", "ADMIN", "EMPLOYEE", "SYSTEM_ADMIN"],
    },
    {
      path: "/notifications",
      icon: <Bell className="w-5 h-5 md:w-5 md:h-5" />,
      label: "Thông báo",
      roles: ["MEMBER", "LEAD", "MANAGER", "ADMIN", "EMPLOYEE", "SYSTEM_ADMIN"],
    },
  ];

  const managementItems: MenuItem[] = [
    {
      path: "/organization",
      icon: <Building2 className="w-5 h-5 md:w-5 md:h-5" />,
      label: "Tổ chức",
      roles: ["ADMIN", "MANAGER", "SYSTEM_ADMIN"],
    },
    {
      path: "/createuser",
      icon: <Building2 className="w-5 h-5 md:w-5 md:h-5" />,
      label: "Tạo người dùng",
      roles: ["ADMIN", "SYSTEM_ADMIN"],
    },
    {
      path: "/adminrbac",
      icon: <ShieldCheck className="w-5 h-5 md:w-5 md:h-5" />,
      label: "Phân quyền (RBAC)",
      roles: ["ADMIN", "SYSTEM_ADMIN"],
    },
    {
      path: "/activity",
      icon: <Activity className="w-5 h-5 md:w-5 md:h-5" />,
      label: "Hoạt động",
      roles: ["MANAGER", "ADMIN", "SYSTEM_ADMIN"],
    },
    {
      path: "/settings",
      icon: <Settings className="w-5 h-5 md:w-5 md:h-5" />,
      label: "Cài đặt",
      roles: ["MEMBER", "LEAD", "MANAGER", "ADMIN", "EMPLOYEE", "SYSTEM_ADMIN"],
    },
  ];

  // Lọc menu theo quyền
  const visibleExecutionItems = useMemo(
    () => executionItems.filter((item) => hasAccess(item.roles)),
    [hasAccess]
  );

  const visibleManagementItems = useMemo(
    () => managementItems.filter((item) => hasAccess(item.roles)),
    [hasAccess]
  );

  // Component NavItem đã được tối ưu responsive
  const NavItem = ({
    item,
    isAiHighlight,
  }: {
    item: MenuItem;
    isAiHighlight?: boolean;
  }) => (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `group flex flex-col md:flex-row items-center md:justify-start gap-0.5 md:gap-3 px-2 py-2 md:px-4 md:py-3 rounded-2xl transition-all duration-200 min-w-[4rem] md:min-w-0 font-semibold select-none touch-manipulation ${
          isActive
            ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-200/50 scale-[1.02]"
            : "text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm active:scale-95"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`transition-colors ${
              isActive
                ? "text-white"
                : isAiHighlight
                ? "text-amber-500"
                : "text-slate-400 group-hover:text-indigo-500"
            }`}
          >
            {item.icon}
          </span>

          <span
            className={`text-[11px] md:text-sm leading-tight whitespace-nowrap ${
              isAiHighlight && !isActive ? "text-indigo-600 font-bold" : ""
            }`}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );

  return (
    <aside
      className="fixed bottom-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-t border-slate-200/80 
                 flex flex-row md:relative md:w-64 md:h-screen md:flex-col md:border-t-0 md:border-r md:border-slate-200/80 
                 shrink-0 transition-all shadow-[-2px_0_10px_rgba(0,0,0,0.05)] md:shadow-none
                 pb-[env(safe-area-inset-bottom,0px)] md:pb-0"
    >
      <div
        className="flex-1 flex flex-row md:flex-col gap-1 md:gap-4 overflow-x-auto md:overflow-y-auto no-scrollbar 
                   px-2 py-2 md:px-4 md:py-6 scroll-smooth touch-pan-x md:touch-pan-y"
      >
        {/* SECTION THỰC THI */}
        {visibleExecutionItems.length > 0 && (
          <div className="flex flex-row md:flex-col gap-1 md:gap-1.5 shrink-0">
            <p className="hidden md:block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 px-3 mt-2">
              Thực thi
            </p>
            {visibleExecutionItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isAiHighlight={item.path === "/aigenerateboard"}
              />
            ))}
          </div>
        )}

        {/* SECTION QUẢN TRỊ */}
        {visibleManagementItems.length > 0 && (
          <div className="flex flex-row md:flex-col gap-1 md:gap-1.5 md:mt-2 shrink-0">
            <p className="hidden md:block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 px-3 mt-6">
              Quản trị
            </p>
            {visibleManagementItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>
        )}

        {/* NÚT ĐĂNG XUẤT */}
        <button
          type="button"
          onClick={logout}
          className="flex flex-col md:flex-row items-center justify-center md:justify-start w-full gap-0.5 md:gap-3 px-2 py-2 md:px-4 md:py-3 
                     rounded-2xl text-[11px] md:text-sm font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-600 
                     transition-all group min-w-[4rem] md:min-w-0 md:mt-auto md:mb-6 active:scale-95 select-none touch-manipulation shrink-0"
        >
          <LogOut className="w-5 h-5 group-hover:text-rose-500 transition-colors" />
          <span className="whitespace-nowrap">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;