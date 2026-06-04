import React, { useEffect, useMemo } from 'react';
import { Shield, Plus, Settings2, Layout, Edit2, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useRbacStore } from '../features/rbac/store/useRbacStore';

// ==============================================================================
// 1. CÁC COMPONENT UI PHỤ TRỢ
// ==============================================================================

const PageHeader = ({ onNewRole }: { onNewRole: () => void }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
    <div className="space-y-1">
      <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-2.5 md:gap-3 text-slate-800">
        <div className="p-1.5 md:p-2 bg-white/80 backdrop-blur-sm rounded-lg md:rounded-xl shadow-sm border border-indigo-100">
          <Shield className="text-indigo-600 w-5 h-5 md:w-6 md:h-6" />
        </div>
        Quản lý Phân Quyền
      </h1>
      <p className="text-[11px] md:text-sm font-medium text-slate-500 pl-10 md:pl-12 leading-relaxed">
        Cấu hình vai trò và kiểm soát quyền hạn trong hệ thống.
      </p>
    </div>
    <div className="flex items-center gap-2 md:gap-3">
      <button className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 bg-white border border-slate-200 text-slate-700 px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[12px] md:text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
        <Settings2 size={14} className="md:w-4 md:h-4" />
        <span>Mã Quyền</span>
      </button>
      <button 
        onClick={onNewRole} 
        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg md:rounded-xl text-[12px] md:text-sm font-bold shadow-md md:shadow-lg shadow-indigo-200/50 transition-all duration-200 active:scale-95"
      >
        <Plus size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5} />
        <span>Vai trò mới</span>
      </button>
    </div>
  </div>
);

const PermissionToggleCard = ({ perm, isChecked, isSystemAdmin, onToggle }: any) => (
  <label
    className={`group relative flex items-center justify-between p-3 md:p-4 rounded-xl border transition-all duration-200 ${
      isSystemAdmin
        ? 'bg-slate-50 border-slate-100 opacity-70 cursor-not-allowed'
        : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm cursor-pointer'
    }`}
  >
    <div className="pr-3 md:pr-4">
      <div className="font-bold text-[11px] md:text-xs text-slate-800 mb-0.5 font-mono">{perm.code}</div>
      <div className="text-[10px] md:text-[11px] text-slate-500 line-clamp-2">{perm.description}</div>
    </div>
    <div className="relative inline-flex items-center shrink-0">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={isChecked}
        disabled={isSystemAdmin}
        onChange={() => {
          if (!isSystemAdmin) onToggle(perm.id, isChecked);
        }}
      />
      <div className="w-8 h-4 md:w-9 md:h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 transition-all duration-300 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 md:after:h-4 after:w-3 md:after:w-4 after:transition-all after:duration-300 peer-checked:after:translate-x-4 shadow-inner" />
    </div>
  </label>
);

const PermissionsPanel = ({ activeRole, isSystemAdmin, groupedPermissions, activeRolePermissionIds, togglePermission }: any) => (
  <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
    <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-100 shrink-0 bg-slate-50/50 lg:bg-white/90 sticky top-0 z-10">
      <div>
        <h2 className="text-[15px] md:text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="w-1.5 h-4 md:h-5 bg-indigo-500 rounded-full" />
          Quyền hạn: <span className="text-indigo-600 truncate max-w-[200px] md:max-w-none">{activeRole?.name || 'Chưa chọn'}</span>
        </h2>
        <p className="text-[10px] md:text-xs text-slate-500 mt-1 ml-3 md:ml-3.5 font-medium leading-relaxed">
          {isSystemAdmin
            ? '⚠️ SYSTEM_ADMIN có toàn quyền mặc định, không thể chỉnh sửa.'
            : 'Bật/tắt công tắc để phân quyền. Thay đổi được tự động lưu.'}
        </p>
      </div>
    </div>

    <div className="p-3 md:p-4 lg:p-6 flex-1 bg-white lg:bg-transparent overflow-y-visible lg:overflow-y-auto custom-scrollbar">
      <div className="flex flex-col gap-5 md:gap-8">
        {Object.entries(groupedPermissions).map(([moduleName, permsInModule]: [string, any]) => (
          <div key={moduleName}>
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <div className="p-1 bg-indigo-50 rounded text-indigo-600">
                <Layout size={12} className="md:w-[14px] md:h-[14px]" />
              </div>
              <h3 className="text-[10px] md:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                {moduleName}
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-slate-200 lg:from-slate-100 to-transparent" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
              {permsInModule.map((perm: any) => (
                <PermissionToggleCard
                  key={perm.id}
                  perm={perm}
                  isSystemAdmin={isSystemAdmin}
                  isChecked={isSystemAdmin || activeRolePermissionIds.includes(perm.id)}
                  onToggle={(permId: string, isChecked: boolean) => togglePermission(activeRole.id, permId, isChecked)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Trạng thái trống nếu không có quyền nào */}
        {Object.keys(groupedPermissions).length === 0 && (
          <div className="text-center py-8 md:py-12 text-slate-400">
            <Shield className="mx-auto mb-2 opacity-30 w-6 h-6 md:w-8 md:h-8" />
            <p className="text-[11px] md:text-xs font-medium">Chưa có mã quyền nào được định nghĩa.</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

const RoleCard = ({ role, isActive, onClick, isSystemAdmin, groupedPermissions, activeRolePermissionIds, togglePermission }: any) => (
  <div className="flex flex-col border border-slate-100 lg:border-none rounded-xl overflow-hidden mb-2 lg:mb-0 transition-all">
    {/* ROLE HEADER (Nhấp để chọn/mở rộng trên Mobile) */}
    <div
      onClick={onClick}
      className={`group p-3 md:p-4 cursor-pointer transition-all duration-200 ${
        isActive
          ? 'bg-indigo-50/50 lg:bg-white border-l-4 lg:border-l-0 lg:border-2 border-indigo-500 lg:rounded-xl lg:shadow-md lg:scale-[1.02]'
          : 'bg-white lg:bg-white/60 lg:border-2 border-transparent hover:border-slate-200 lg:hover:bg-white lg:rounded-xl shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start mb-1 md:mb-1.5">
        <h3 className={`font-bold text-[13px] md:text-sm transition-colors ${isActive ? 'text-indigo-700' : 'text-slate-700 group-hover:text-indigo-600'}`}>
          {role.name}
        </h3>
        <div className="flex items-center gap-1.5">
          <span className={`text-[8px] md:text-[9px] font-bold px-1.5 md:px-2 py-0.5 rounded uppercase tracking-wider ${role.scope === 'GLOBAL' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
            {role.scope}
          </span>
          <div className="lg:hidden text-slate-400">
            {isActive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>
      <p className="text-[10px] md:text-[11px] text-slate-500 line-clamp-2 font-medium leading-relaxed pr-6 lg:pr-0">
        {role.description || 'Chưa có mô tả chi tiết.'}
      </p>

      {isActive && role.name !== 'SYSTEM_ADMIN' && (
        <div className="flex gap-3 md:gap-4 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-slate-200 lg:border-slate-100">
          <button className="text-[9px] md:text-[10px] font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors p-1 -m-1">
            <Edit2 size={10} className="md:w-3 md:h-3" /> Chỉnh sửa
          </button>
          <button className="text-[9px] md:text-[10px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors p-1 -m-1">
            <Trash2 size={10} className="md:w-3 md:h-3" /> Xóa
          </button>
        </div>
      )}
    </div>

    {/* MOBILE/TABLET ACCORDION BODY (Chỉ hiện khi isActive và màn hình < lg) */}
    {isActive && (
      <div className="lg:hidden border-t border-slate-100 bg-slate-50/50">
        <PermissionsPanel 
          activeRole={role}
          isSystemAdmin={isSystemAdmin}
          groupedPermissions={groupedPermissions}
          activeRolePermissionIds={activeRolePermissionIds}
          togglePermission={togglePermission}
        />
      </div>
    )}
  </div>
);


// ==============================================================================
// 2. COMPONENT CHÍNH
// ==============================================================================

const AdminRBACPage = () => {
  const {
    roles,
    permissions,
    activeRoleId,
    activeRolePermissionIds,
    fetchInitialData,
    setActiveRole,
    togglePermission,
    isLoading,
  } = useRbacStore();

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Derived states
  const activeRole = roles.find((r) => r.id === activeRoleId);
  const isSystemAdmin = activeRole?.name === 'SYSTEM_ADMIN';

  // Gom nhóm quyền theo Module
  const groupedPermissions = useMemo(() => {
    return permissions.reduce((acc: any, perm: any) => {
      const moduleName = perm.module || 'Chung';
      if (!acc[moduleName]) acc[moduleName] = [];
      acc[moduleName].push(perm);
      return acc;
    }, {});
  }, [permissions]);

  // Hàm xử lý thêm mới vai trò (tạm thời placeholder)
  const handleCreateNewRole = () => {
    // Logic mở modal tạo role (có thể tích hợp sau)
    alert('Chức năng tạo vai trò mới sẽ được phát triển.');
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto custom-scrollbar p-3 md:p-6 lg:p-8 pb-20 md:pb-8">
      <div className="max-w-[1600px] mx-auto h-full flex flex-col">
        
        <PageHeader onNewRole={handleCreateNewRole} />

        {/* HIỆN LOADER NẾU LẦN ĐẦU TẢI */}
        {isLoading && roles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 md:py-20 text-slate-400 flex-1">
            <Loader2 className="animate-spin mb-3 md:mb-4 text-indigo-500" size={24} />
            <p className="text-[11px] md:text-sm font-medium">Đang tải cấu hình phân quyền...</p>
          </div>
        )}

        {/* KHU VỰC NỘI DUNG CHÍNH */}
        {roles.length > 0 && (
          <div className="flex-1 flex flex-col lg:bg-white/80 lg:backdrop-blur-sm lg:rounded-2xl lg:border lg:border-slate-200/80 lg:shadow-lg lg:overflow-hidden min-h-[500px]">
            <div className="flex flex-col lg:flex-row gap-0 h-full">
              
              {/* CỘT TRÁI (HOẶC LIST DỌC TRÊN MOBILE): Danh sách Roles */}
              {/* Đã sửa lỗi thanh cuộn không hoạt động: Set max-height hoặc height linh hoạt */}
              <aside className="w-full lg:w-[300px] xl:w-[320px] shrink-0 lg:border-r border-slate-200 lg:bg-slate-50/50 lg:p-5 xl:p-6 flex flex-col max-h-none lg:max-h-[calc(100vh-12rem)]">
                <div className="flex items-center justify-between mb-2 md:mb-3 px-1 shrink-0">
                  <span className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Danh sách vai trò</span>
                  <span className="text-[9px] md:text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                    {roles.length}
                  </span>
                </div>
                
                <div className="lg:overflow-y-auto custom-scrollbar flex-1 lg:-mx-2 pt-1 lg:pt-2 px-1 lg:px-2 pb-4 lg:space-y-2.5">
                  {roles.map((role) => (
                    <RoleCard 
                      key={role.id} 
                      role={role} 
                      isActive={activeRoleId === role.id} 
                      
                      // 🚀 CHIÊU THỨC TẮT/MỞ ACCORDION:
                      // Nếu role được click là role đang active -> Set về null để đóng lại.
                      // Nếu là role khác -> Chọn role đó để mở ra.
                      onClick={() => setActiveRole(activeRoleId === role.id ? null : role.id)}
                      
                      isSystemAdmin={role.name === 'SYSTEM_ADMIN'}
                      groupedPermissions={groupedPermissions}
                      activeRolePermissionIds={activeRolePermissionIds}
                      togglePermission={togglePermission}
                    />
                  ))}
                </div>
              </aside>

              {/* CỘT PHẢI (CHỈ HIỆN TRÊN DESKTOP): Bảng điều khiển Quyền */}
              <section className={`hidden lg:flex flex-1 flex-col min-h-0 transition-all duration-300 bg-white/50 ${
                isLoading && roles.length > 0 ? 'opacity-50 pointer-events-none scale-[0.99]' : 'opacity-100 scale-100'
              }`}>
                {activeRole ? (
                  <PermissionsPanel 
                    activeRole={activeRole}
                    isSystemAdmin={isSystemAdmin}
                    groupedPermissions={groupedPermissions}
                    activeRolePermissionIds={activeRolePermissionIds}
                    togglePermission={togglePermission}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                    <Shield className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Chọn một vai trò bên trái để xem chi tiết quyền hạn.</p>
                  </div>
                )}
              </section>

            </div>
          </div>
        )}

        {/* TRẠNG THÁI TRỐNG: không có roles */}
        {!isLoading && roles.length === 0 && (
          <div className="bg-white/80 backdrop-blur-sm border border-dashed border-indigo-200 rounded-[1.25rem] md:rounded-2xl p-8 md:p-16 flex flex-col items-center justify-center text-center shadow-sm mt-4 flex-1">
            <div className="p-4 md:p-5 bg-indigo-50 rounded-full mb-4 md:mb-5">
              <Shield className="text-indigo-400 w-10 h-10 md:w-14 md:h-14" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-1.5 md:mb-2 px-2">Chưa có vai trò nào</h3>
            <p className="text-slate-500 text-xs md:text-sm mb-5 md:mb-6 max-w-sm px-4 leading-relaxed">
              Bắt đầu bằng cách tạo vai trò đầu tiên để phân quyền cho hệ thống.
            </p>
            <button
              onClick={handleCreateNewRole}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-5 md:px-6 py-2.5 md:py-3 rounded-xl font-bold shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/40 transition-all active:scale-95 text-[12px] md:text-sm"
            >
              <span className="flex items-center gap-1.5 md:gap-2">
                <Plus size={16} className="md:w-[18px] md:h-[18px]" /> Tạo vai trò mới
              </span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        @media (min-width: 768px) { .custom-scrollbar::-webkit-scrollbar { width: 6px; } }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default AdminRBACPage;