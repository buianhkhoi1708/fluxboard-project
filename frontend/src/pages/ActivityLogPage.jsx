// ActivityLogPage.jsx
import React, { useEffect, useState } from "react";
import { useActivityStore } from "../features/activity/store/useActivityStore";
import { useUserStore } from "../features/user/store/useUserStore";
import {
  ClockIcon,
  UserCircleIcon,
  EllipsisHorizontalIcon,
  FunnelIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

const ActivityLogPage = () => {
  const { activities, meta, fetchAdminLogs, loading, loadingMore, setFilters } = useActivityStore();
  const { userDictionary, fetchAllSystemUsers } = useUserStore();

  // State cục bộ cho form bộ lọc
  const [localFilters, setLocalFilters] = useState({
    action: "",
    source_type: "",
    startDate: "",
    endDate: ""
  });

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

  // Biến chuỗi ID thành tên người dùng
  const formatMessage = (message) => {
    if (!message) return "";
    
    // Regex quét tìm chính xác chuỗi ID 24 ký tự của MongoDB
    const objectIdRegex = /[0-9a-fA-F]{24}/g;
    
    return message.replace(objectIdRegex, (match) => {
      // Dò ID trong từ điển. Nếu có thì nhả tên ra, nếu không thì cứ in ID gốc
      return userDictionary[match]?.full_name || match;
    });
  };

  // Hàm xử lý khi bấm nút lọc
  const handleApplyFilter = () => {
    const formattedFilters = {};

    if (localFilters.source_type) formattedFilters.sourceTypes = localFilters.source_type;
    if (localFilters.action) formattedFilters.actions = localFilters.action;

    if (localFilters.startDate) {
      formattedFilters.from = new Date(`${localFilters.startDate}T00:00:00Z`).toISOString();
    }

    if (localFilters.endDate) {
      formattedFilters.to = new Date(`${localFilters.endDate}T23:59:59.999Z`).toISOString();
    }

    // Đẩy xuống store để gọi API
    setFilters(formattedFilters);
  };

  // HÀM XỬ LÝ KHI BẤM NÚT XÓA LỌC
  const handleClearFilter = () => {
    const emptyFilters = { action: "", source_type: "", startDate: "", endDate: "" };
    setLocalFilters(emptyFilters);
    setFilters(emptyFilters);
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

        {/* Thanh bộ lọc*/}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Phạm vi</label>
            <select 
              value={localFilters.source_type} 
              onChange={(e) => setLocalFilters({...localFilters, source_type: e.target.value})}
              className="w-full text-sm p-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-400"
            >
              <option value="">Tất cả</option>
              <option value="USER">Hệ thống (Nhân sự)</option>
              <option value="PROJECT">Dự án</option>
              <option value="BOARD">Bảng (Board)</option>
              <option value="TASK">Công việc (Task)</option>
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Hành động</label>
            <select 
              value={localFilters.action} 
              onChange={(e) => setLocalFilters({...localFilters, action: e.target.value})}
              className="w-full text-sm p-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-400"
            >
              <option value="">Tất cả</option>
              <option value="CREATE">Tạo mới</option>
              <option value="UPDATE">Cập nhật</option>
              <option value="DELETE">Xóa</option>
              <option value="ADD_MEMBER">Thêm thành viên</option>
              <option value="MOVE_STATUS">Chuyển trạng thái</option>
            </select>
          </div>

          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Từ ngày</label>
            <input 
              type="date" 
              value={localFilters.startDate}
              onChange={(e) => setLocalFilters({...localFilters, startDate: e.target.value})}
              className="w-full text-sm p-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-400 text-gray-600"
            />
          </div>

          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Đến ngày</label>
            <input 
              type="date" 
              value={localFilters.endDate}
              onChange={(e) => setLocalFilters({...localFilters, endDate: e.target.value})}
              className="w-full text-sm p-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-400 text-gray-600"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={handleApplyFilter}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              <FunnelIcon className="w-4 h-4" /> Lọc
            </button>
            <button 
              onClick={handleClearFilter}
              className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-lg transition"
              title="Xóa bộ lọc"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

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
                <div
                  key={log.id}
                  className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-gray-200"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {log.actor?.avatar_url ? (
                          <img loading="lazy"
                            src={log.actor.avatar_url}
                            alt={log.actor.full_name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center text-white font-semibold shadow-sm"
                          style={{ display: log.actor?.avatar_url ? 'none' : 'flex' }}
                        >
                          {(log.actor?.full_name || "S").charAt(0).toUpperCase()}
                        </div>
                      </div>

                      {/* Nội dung */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2 mb-1">
                          <span className="font-semibold text-gray-900">
                            {log.actor?.full_name || "Hệ thống"}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {log.source_type}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {getRelativeTime(log.created_at)}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed mt-1">
                          {formatMessage(log.message)}
                        </p>
                        <div className="mt-2 text-xs text-gray-400 transition-opacity duration-200">
                          {new Date(log.created_at).toLocaleString("vi-VN")}
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
           ))}
      </div>
    </div>
  );
};

export default ActivityLogPage;