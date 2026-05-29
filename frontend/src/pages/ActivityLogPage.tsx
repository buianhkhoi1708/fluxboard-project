import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActivityFilters } from "../features/activity/hooks/useActivityFilters";
import { useInfiniteAdminLogs } from "../features/activity/api/useInfiniteAdminLogs";
import { activityApi, AccountUser, Activity as ActivityItem } from "../features/activity/api/activityApi";
import ActivityFilterBar from "../features/activity/components/ActivityFilterBar";
import { useRolesDictionary } from "../features/rbac/hooks/useRbacQueries";
import {
  Clock, RefreshCw, Activity, Loader2, ShieldAlert, Users,
  MoreVertical, Trash2, PencilLine, X, AlertTriangle, CheckCircle2
} from "lucide-react";

const TABS = [
  { key: "activity_log", label: "Nhật ký hoạt động", icon: Activity },
  { key: "accounts", label: "Quản lý tài khoản", icon: Users },
  { key: "security_audit", label: "Bảo mật hệ thống", icon: ShieldAlert },
] as const;

const SOURCE_TYPE_STYLES: Record<string, string> = {
  PROJECT: "bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200/80",
  BOARD: "bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 border-indigo-200/80",
  TASK: "bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border-amber-200/80",
  USER: "bg-gradient-to-r from-sky-50 to-sky-100 text-sky-700 border-sky-200/80",
  AUTH: "bg-gradient-to-r from-rose-50 to-rose-100 text-rose-700 border-rose-200/80",
  SYSTEM: "bg-gradient-to-r from-rose-50 to-rose-100 text-rose-700 border-rose-200/80",
};

const ACTION_STYLES: Record<string, string> = {
  CREATE: "text-emerald-600 font-semibold",
  UPDATE: "text-amber-600 font-semibold",
  DELETE: "text-rose-600 font-semibold",
  MOVE: "text-indigo-600 font-semibold",
  LOGIN: "text-indigo-600 font-semibold",
  PASSWORD_CHANGED: "text-rose-600 font-semibold",
  PASSWORD_RESET: "text-rose-600 font-semibold",
  ACCOUNT_CREATED: "text-emerald-600 font-semibold",
  ACCOUNT_UPDATED: "text-amber-600 font-semibold",
  ACCOUNT_DELETED: "text-rose-600 font-semibold",
};

const getField = (obj: any, camel: string, snake: string) => obj?.[camel] ?? obj?.[snake];

const getDisplayName = (user?: any) => {
  if (!user) return "Hệ thống";
  return getField(user, "fullName", "full_name") || user.name || user.email || "Người dùng";
};

const getAvatar = (user?: any) => getField(user, "avatarUrl", "avatar_url");

const getRoleName = (user?: any) => {
  return getField(user, "roleName", "role_name") || "Chưa xác định";
};

const getCreatedAt = (log: ActivityItem) => getField(log, "createdAt", "created_at");
const getSourceType = (log: ActivityItem) => getField(log, "sourceType", "source_type") || "UNKNOWN";
const getIpAddress = (log: ActivityItem) => getField(log, "ipAddress", "ip_address");
const getDeviceInfo = (log: ActivityItem) => getField(log, "deviceInfo", "device_info");

const getAccountRoleName = (user: AccountUser) => {
  return getField(user, "roleName", "role_name") || "Chưa xác định";
};

const getAccountFullName = (user: AccountUser) => {
  return getField(user, "fullName", "full_name") || user.email || "Người dùng";
};

const getAccountAvatar = (user: AccountUser) => {
  return getField(user, "avatarUrl", "avatar_url");
};

const getAccountRoleId = (user: AccountUser) => {
  return getField(user, "roleId", "role_id") || "";
};

const getLastSeen = (user: AccountUser) => {
  return getField(user, "lastSeenAt", "last_seen_at");
};

const formatDateTime = (value?: string) => {
  if (!value) return "";
  return new Date(value).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
};

const getRelativeTime = (dateString?: string) => {
  if (!dateString) return "Không rõ thời gian";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
};

const ActivityLogSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-12 bg-slate-200 rounded-xl" />
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-white/80 rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-slate-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 bg-slate-200 rounded-md" />
            <div className="h-4 w-3/4 bg-slate-200 rounded-md" />
            <div className="h-3 w-1/4 bg-slate-200 rounded-md" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="bg-white/80 backdrop-blur-sm border border-dashed border-indigo-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
    <div className="p-5 bg-indigo-50 rounded-full mb-5">
      <Activity size={56} className="text-indigo-400" />
    </div>
    <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
    <p className="text-slate-500 text-sm max-w-md">{description}</p>
  </div>
);

const ActivityCard = ({ log, securityMode = false }: { log: ActivityItem; securityMode?: boolean }) => {
  const actor = log.actor;
  const target = getField(log, "targetUser", "target_user");
  const sourceType = getSourceType(log);
  const createdAt = getCreatedAt(log);
  const sourceStyle = SOURCE_TYPE_STYLES[sourceType] || "bg-slate-100 text-slate-700 border-slate-200/80";
  const actionStyle = ACTION_STYLES[log?.action] || "text-slate-600 font-medium";
  const avatar = getAvatar(actor);

  return (
    <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:shadow-indigo-100/20 hover:border-indigo-300 transition-all duration-200 hover:-translate-y-0.5">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            {avatar ? (
              <img
                loading="lazy"
                src={avatar}
                alt={getDisplayName(actor)}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {getDisplayName(actor).charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-slate-800 text-sm">{getDisplayName(actor)}</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide bg-indigo-50 text-indigo-600 border border-indigo-100">
                {getRoleName(actor)}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border tracking-wide uppercase shadow-sm ${sourceStyle}`}>
                {sourceType}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
                <Clock className="w-3.5 h-3.5 stroke-[1.5]" />
                {getRelativeTime(createdAt)}
              </span>
            </div>

            <p className="text-slate-700 text-sm leading-relaxed break-words bg-slate-50/80 p-2 rounded-lg">
              <span className={`text-xs uppercase mr-1 tracking-wider ${actionStyle}`}>
                [{log?.action || "LOG"}]
              </span>{" "}
              {log?.message || "Không có nội dung"}
            </p>

            {target && (
              <div className="text-xs text-slate-500">
                Đối tượng: <span className="font-bold text-slate-700">{getDisplayName(target)}</span>
                <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold text-[10px]">
                  {getRoleName(target)}
                </span>
              </div>
            )}

            {securityMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px] text-slate-500">
                {getIpAddress(log) && (
                  <div className="bg-white border border-slate-100 rounded-lg px-2 py-1">
                    IP: <span className="font-semibold text-slate-700">{getIpAddress(log)}</span>
                  </div>
                )}
                {getDeviceInfo(log) && (
                  <div className="bg-white border border-slate-100 rounded-lg px-2 py-1 truncate">
                    Thiết bị: <span className="font-semibold text-slate-700">{getDeviceInfo(log)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDateTime(createdAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AccountsTab = () => {
  const queryClient = useQueryClient();
  const { data: roles = [], isLoading: isLoadingRoles } = useRolesDictionary();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AccountUser | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [deleteUser, setDeleteUser] = useState<AccountUser | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["activity", "accounts"],
    queryFn: () => activityApi.getAccounts(0, 100),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => activityApi.updateAccountRole(userId, roleId),
    onSuccess: () => {
      setMessage({ type: "success", text: "Cập nhật role thành công." });
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["activity", "accounts"] });
    },
    onError: () => setMessage({ type: "error", text: "Cập nhật role thất bại." }),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => activityApi.deleteAccount(userId),
    onSuccess: () => {
      setMessage({ type: "success", text: "Đã xóa tài khoản." });
      setDeleteUser(null);
      queryClient.invalidateQueries({ queryKey: ["activity", "accounts"] });
    },
    onError: () => setMessage({ type: "error", text: "Xóa tài khoản thất bại." }),
  });

  const openEditModal = (user: AccountUser) => {
    setEditingUser(user);
    setSelectedRoleId(getAccountRoleId(user));
    setOpenMenuId(null);
  };

  if (isLoading) return <ActivityLogSkeleton />;

  return (
    <div className="space-y-5">
      {message.text && (
        <div className={`p-3 rounded-xl border text-sm font-semibold flex items-center gap-2 ${
          message.type === "success"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-rose-50 text-rose-700 border-rose-200"
        }`}>
          {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {message.text}
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400">
          <div className="col-span-4">Tài khoản</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Trạng thái</div>
          <div className="col-span-3">Lần hoạt động</div>
          <div className="col-span-1 text-right">Thao tác</div>
        </div>

        {accounts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">Chưa có tài khoản nào.</div>
        ) : (
          accounts.map((user) => {
            const avatar = getAccountAvatar(user);
            const isOnline = Boolean(user.online);
            const roleName = getAccountRoleName(user);
            const lastSeen = getLastSeen(user);

            return (
              <div key={user.id} className="grid grid-cols-12 gap-3 px-5 py-4 border-b border-slate-100 last:border-b-0 items-center hover:bg-slate-50/70 transition-colors">
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  {avatar ? (
                    <img src={avatar} alt={getAccountFullName(user)} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                      {getAccountFullName(user).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{getAccountFullName(user)}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="col-span-2">
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-100">
                    {roleName}
                  </span>
                </div>

                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                    isOnline ? "text-emerald-600" : "text-slate-400"
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                    {isOnline ? "Online" : "Offline"}
                  </span>
                  {user.status && (
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{user.status}</p>
                  )}
                </div>

                <div className="col-span-3 text-xs text-slate-500">
                  {lastSeen ? formatDateTime(lastSeen) : "Chưa ghi nhận"}
                </div>

                <div className="col-span-1 flex justify-end relative">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {openMenuId === user.id && (
                    <div className="absolute right-0 top-10 w-44 bg-white rounded-2xl border border-slate-100 shadow-xl py-2 z-20">
                      <button
                        onClick={() => openEditModal(user)}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2"
                      >
                        <PencilLine size={16} />
                        Sửa role
                      </button>
                      <button
                        onClick={() => {
                          setDeleteUser(user);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <Trash2 size={16} />
                        Xóa tài khoản
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">Sửa role tài khoản</h3>
                <p className="text-xs text-slate-500 mt-1">{getAccountFullName(editingUser)}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Role mới</label>
              <select
                value={selectedRoleId}
                disabled={isLoadingRoles}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none font-semibold text-slate-700"
              >
                {roles.map((role: any) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>

              <div className="flex justify-end gap-3 mt-7">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  disabled={!selectedRoleId || updateRoleMutation.isPending}
                  onClick={() => updateRoleMutation.mutate({ userId: editingUser.id, roleId: selectedRoleId })}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
                >
                  {updateRoleMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Lưu role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteUser && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800">Xóa tài khoản?</h3>
              <p className="text-sm text-slate-500 mt-2">
                Tài khoản <span className="font-bold text-slate-700">{getAccountFullName(deleteUser)}</span> sẽ bị xóa mềm khỏi hệ thống.
              </p>

              <div className="flex justify-end gap-3 mt-7">
                <button
                  onClick={() => setDeleteUser(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deleteUser.id)}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-60 flex items-center gap-2"
                >
                  {deleteMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Xóa tài khoản
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LogsTab = ({ tab }: { tab: "activity_log" | "security_audit" }) => {
  const [filters] = useActivityFilters();
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteAdminLogs(tab, filters);
  const isSecurity = tab === "security_audit";
  const isEmpty = !data || data.pages?.[0]?.data?.length === 0;

  return (
    <>
      <div className="mb-6">
        <ActivityFilterBar />
      </div>

      {isLoading ? (
        <ActivityLogSkeleton />
      ) : isEmpty ? (
        <EmptyState
          title="Không có bản ghi nào"
          description="Không tìm thấy hoạt động nào phù hợp với bộ lọc."
        />
      ) : (
        <div className="space-y-4">
          {data?.pages?.map((page, pageIndex) => (
            <React.Fragment key={pageIndex}>
              {page?.data?.map((log: ActivityItem) => (
                <ActivityCard key={log?.id || `${pageIndex}-${Math.random()}`} log={log} securityMode={isSecurity} />
              ))}
            </React.Fragment>
          ))}

          {hasNextPage && (
            <div className="flex justify-center mt-8 pt-2">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white disabled:from-slate-400 disabled:to-slate-500 text-sm font-bold rounded-xl shadow-lg shadow-indigo-200/50 transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:shadow-none"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tải thêm...</span>
                  </>
                ) : (
                  <>
                    <span>Xem thêm bản ghi cũ</span>
                    <RefreshCw className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

const ActivityLogPage = () => {
  const [activeTab, setActiveTab] = useState<"activity_log" | "accounts" | "security_audit">("activity_log");

  const subtitle = useMemo(() => {
    if (activeTab === "activity_log") return "Lưu trữ các hoạt động của toàn bộ tài khoản trong hệ thống.";
    if (activeTab === "accounts") return "Xem tài khoản, trạng thái online/offline, sửa role và xóa tài khoản.";
    return "Theo dõi sự kiện bảo mật như tạo tài khoản, đổi mật khẩu, đăng nhập và đặt lại mật khẩu.";
  }, [activeTab]);

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-indigo-100">
                <Activity className="text-indigo-600" size={22} />
              </div>
              Hoạt động
            </h1>
            <p className="text-sm font-medium text-slate-500 pl-12">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 bg-white/80 backdrop-blur-sm p-1 rounded-2xl border border-slate-200/80 shadow-sm mb-8 w-fit">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-200/50"
                    : "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === "activity_log" && <LogsTab tab="activity_log" />}
        {activeTab === "accounts" && <AccountsTab />}
        {activeTab === "security_audit" && <LogsTab tab="security_audit" />}
      </div>
    </div>
  );
};

export default ActivityLogPage;