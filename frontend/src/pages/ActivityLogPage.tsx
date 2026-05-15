import React, { useEffect, startTransition } from "react";
import { useActivityFilters } from "../features/activity/hooks/useActivityFilters";
import { useInfiniteAdminLogs } from "../features/activity/api/useInfiniteAdminLogs";
import { useUserStore } from "../features/user/store/useUserStore";
import ActivityFilterBar from "../features/activity/components/ActivityFilterBar";
import { ClockIcon, UserCircleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

// Bảng màu trực quan cho Source Type (có gradient)
const SOURCE_TYPE_STYLES: Record<string, string> = {
  PROJECT: "bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200",
  BOARD: "bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 border-indigo-200",
  TASK: "bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border-amber-200",
  USER: "bg-gradient-to-r from-sky-50 to-sky-100 text-sky-700 border-sky-200",
  SYSTEM: "bg-gradient-to-r from-rose-50 to-rose-100 text-rose-700 border-rose-200",
};

// Màu sắc cho Action
const ACTION_STYLES: Record<string, string> = {
  CREATE: "text-emerald-600 font-semibold",
  UPDATE: "text-amber-600 font-semibold",
  DELETE: "text-rose-600 font-semibold",
  MOVE: "text-indigo-600 font-semibold",
};

const ActivityLogPage = () => {
  const [filters] = useActivityFilters();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteAdminLogs(filters);

  const { userDictionary, fetchAllSystemUsers } = useUserStore();

  useEffect(() => {
    if (!userDictionary || Object.keys(userDictionary || {}).length === 0) {
      startTransition(() => {
        fetchAllSystemUsers();
      });
    }
  }, [fetchAllSystemUsers, userDictionary]);

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

  const formatMessage = (message?: string) => {
    if (!message) return "";
    const objectIdRegex = /[0-9a-fA-F]{24}/g;
    return message.replace(objectIdRegex, (match) => {
      return userDictionary?.[match]?.full_name || match;
    });
  };

  const isEmpty = !data || data.pages?.[0]?.data?.length === 0;

  // Skeleton loading cải tiến, khớp với layout card
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 pb-12">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-gray-200 rounded-xl" />
            <div className="h-4 w-72 bg-gray-100 rounded-lg" />
            <div className="h-24 bg-gray-100 rounded-2xl" />
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm animate-pulse"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-gray-200 rounded" />
                    <div className="h-3 w-3/4 bg-gray-100 rounded" />
                    <div className="h-3 w-1/4 bg-gray-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-12">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight">
              Nhật ký hoạt động
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Theo dõi và kiểm toán toàn bộ luồng thay đổi trạng thái hệ thống
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50/80 backdrop-blur-sm border border-indigo-200 px-3 py-1.5 rounded-full shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
            </span>
            <span>Real-time tracking</span>
          </div>
        </div>

        {/* Thanh lọc */}
        <ActivityFilterBar />

        {/* Nội dung chính */}
        {isEmpty ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100 transition-all">
            <div className="w-20 h-20 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <UserCircleIcon className="w-10 h-10 text-slate-300 stroke-1" />
            </div>
            <p className="text-slate-500 text-base font-medium">
              Không tìm thấy bản ghi hoạt động nào phù hợp.
            </p>
            <p className="text-slate-400 text-sm mt-1">
              Hãy thử điều chỉnh bộ lọc hoặc tải lại trang.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.pages?.map((page, pageIndex) => (
              <React.Fragment key={pageIndex}>
                {page?.data?.map((log: any) => {
                  const sourceStyle =
                    SOURCE_TYPE_STYLES[log?.source_type] ||
                    "bg-slate-100 text-slate-700 border-slate-200";
                  const actionStyle =
                    ACTION_STYLES[log?.action] || "text-slate-600 font-medium";

                  return (
                    <div
                      key={log?.id || Math.random()}
                      className="group bg-white rounded-xl shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            {log?.actor?.avatar_url ? (
                              <img
                                loading="lazy"
                                src={log.actor.avatar_url}
                                alt={log.actor.full_name || "User"}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                                onError={(e: any) => {
                                  e.target.style.display = "none";
                                  const fallback = e.target.nextSibling;
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-sm"
                              style={{
                                display: log?.actor?.avatar_url
                                  ? "none"
                                  : "flex",
                              }}
                            >
                              {(log?.actor?.full_name || "S")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          </div>

                          {/* Nội dung */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="font-semibold text-slate-800 text-sm">
                                {log?.actor?.full_name || "Hệ thống"}
                              </span>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border tracking-wide uppercase shadow-sm ${sourceStyle}`}
                              >
                                {log?.source_type || "UNKNOWN"}
                              </span>
                              <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
                                <ClockIcon className="w-3.5 h-3.5 stroke-[1.5]" />
                                {getRelativeTime(log?.created_at)}
                              </span>
                            </div>

                            <p className="text-slate-700 text-sm leading-relaxed break-words bg-slate-50/50 p-2 rounded-lg -mx-2">
                              <span
                                className={`text-xs uppercase mr-1 tracking-wider ${actionStyle}`}
                              >
                                [{log?.action || "LOG"}]
                              </span>{" "}
                              {formatMessage(log?.message)}
                            </p>

                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <ClockIcon className="w-3 h-3" />
                              {log?.created_at
                                ? new Date(log.created_at).toLocaleString(
                                    "vi-VN",
                                    {
                                      dateStyle: "medium",
                                      timeStyle: "short",
                                    }
                                  )
                                : ""}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}

            {/* Nút tải thêm */}
            {hasNextPage && (
              <div className="flex justify-center mt-10 pt-2">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-700 disabled:text-slate-400 text-sm font-semibold border border-slate-200 hover:border-indigo-300 rounded-full shadow-sm transition-all duration-200 hover:shadow-md active:scale-95 disabled:pointer-events-none"
                >
                  {isFetchingNextPage ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 text-indigo-500 animate-spin" />
                      <span>Đang tải lịch sử cũ...</span>
                    </>
                  ) : (
                    <>
                      <span>Xem thêm hoạt động cũ</span>
                      <ArrowPathIcon className="w-4 h-4 opacity-50 group-hover:rotate-180 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogPage;