import React, { useEffect, useState } from "react";
import { useActivityStore } from "../features/activity/store/useActivityStore";
import { useUserStore } from "../features/user/store/useUserStore";
import ActivityFilterBar from "../features/activity/components/ActivityFilterBar";
import {
  ClockIcon,
  UserCircleIcon,
  EllipsisHorizontalIcon,
  FunnelIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

const ActivityLogPage = () => {
  const { activities, meta, fetchAdminLogs, loading, loadingMore } = useActivityStore();

    const { userDictionary, fetchAllSystemUsers } = useUserStore();


  useEffect(() => {
    fetchAdminLogs(0); // Load trang đầu tiên lúc mới vào

    if (Object.keys(userDictionary).length === 0) {
      fetchAllSystemUsers();
    }
  }, []);

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  };

  // Hạm dịch ID 24 ký tự và đổi thành tên người dùng
  const formatMessage = (message) => {
    if (!message) return "";
    
    // Regex tìm chuỗi ID 24 ký tự chuẩn MongoDB
    const objectIdRegex = /[0-9a-fA-F]{24}/g;
    
    return message.replace(objectIdRegex, (match) => {
      return userDictionary[match]?.full_name || match;
    });
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
              </div>
              <div className="h-4 w-full bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-10">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Nhật ký hoạt động
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Theo dõi mọi thay đổi và hành động trong hệ thống
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ClockIcon className="w-4 h-4" />
            <span>Cập nhật theo thời gian thực</span>
          </div>
        </div>

        {/* Component bộ lọc*/}
        <ActivityFilterBar />

        {/* Loading Spinner cho lượt tải đầu tiên */}
        {loading && activities.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          /* Danh sách logs */
          activities?.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
              <UserCircleIcon className="w-16 h-16 mx-auto text-gray-300" />
              <p className="mt-4 text-gray-500">Không tìm thấy hoạt động nào phù hợp.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities?.map((log) => (
                <div key={log.id} className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-gray-200">
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {log.actor?.avatarUrl || log.actor?.avatar_url ? (
                          <img loading="lazy"
                            src={log.actor?.avatarUrl || log.actor?.avatar_url}
                            alt={log.actor?.fullName || log.actor?.full_name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center text-white font-semibold shadow-sm"
                          style={{ display: (log.actor?.avatarUrl || log.actor?.avatar_url) ? 'none' : 'flex' }}
                        >
                          {((log.actor?.fullName || log.actor?.full_name) || "S").charAt(0).toUpperCase()}
                        </div>
                      </div>

                      {/* Nội dung */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2 mb-1">
                          <span className="font-semibold text-gray-900">
                            {log.actor?.fullName || log.actor?.full_name || "Hệ thống"}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {log.source_type || log.sourceType}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {getRelativeTime(log.created_at || log.createdAt)}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed mt-1">
                          {formatMessage(log.message)}
                        </p>
                        <div className="mt-2 text-xs text-gray-400 transition-opacity duration-200">
                          {new Date(log.created_at || log.createdAt).toLocaleString("vi-VN")}
                        </div>
                      </div>
                      
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-gray-600">
                        <EllipsisHorizontalIcon className="w-5 h-5" />
                      </button>

                    </div>
                  </div>
                </div>
              ))}

              {/* Nút Load More */}
              {meta?.has_next && (
                <div className="flex justify-center mt-6 pt-4">
                  <button 
                    onClick={() => fetchAdminLogs(meta.page + 1)}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-full shadow-sm hover:shadow hover:border-indigo-200 hover:text-indigo-600 transition-all disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <><div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div> Đang tải...</>
                    ) : 'Xem thêm hoạt động cũ'}
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ActivityLogPage;