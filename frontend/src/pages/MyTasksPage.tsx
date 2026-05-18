import React from "react";
import { useNavigate } from "react-router-dom";
import { useGetMyTasks } from "../features/tasks/hooks/useTaskQueries"; // Nhớ check lại đường dẫn import hook này
import {
  Calendar,
  Clock,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  User,
} from "lucide-react";

const MyTasksPage = () => {
  const navigate = useNavigate();
  const { data: myTasks, isLoading, isError } = useGetMyTasks();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-red-500 text-center mt-10">
        Lỗi khi tải công việc! Vui lòng thử lại.
      </div>
    );
  }

  // Hàm render màu cho Mức độ ưu tiên
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-700 border-red-200";
      case "MEDIUM":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "LOW":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Hàm format ngày tháng
  const formatDate = (dateString: string) => {
    if (!dateString) return "Chưa cấu hình hạn";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Kiểm tra thời gian quá hạn chính xác
  const isOverdue = (dateString: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8">
      {/* HEADER */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Công việc của tôi
          </h1>
          <p className="text-gray-500 mt-1">
            Hệ thống ghi nhận {myTasks?.length || 0} công việc được phân bổ cho
            tài khoản.
          </p>
        </div>
      </div>

      {/* EMPTY STATE */}
      {myTasks?.length === 0 && (
        <div className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl p-12 border border-dashed border-gray-300">
          <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Tuyệt vời!</h2>
          <p className="text-gray-500">
            Không còn đầu việc nào cần xử lý vào lúc này.
          </p>
        </div>
      )}

      {/* TASKS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myTasks?.map((task: any) => (
          <div
            key={task.id}
            // 🚀 Bấm vào sẽ nhảy sang trang chi tiết (Sếp đổi lại URL này cho hợp với Route thực tế của app nhé)
           onClick={() => {
              if (task.board_id) {
                // 🚀 ĐÍNH KÈM TASK ID VÀO ĐƯỜNG DẪN
                navigate(`/board/${task.board_id}?taskId=${task.id}`);
              } else {
                console.warn(`Task ${task.id} không tìm thấy thông tin board_id.`);
              }
            }}
            // 🚀 Thêm hiệu ứng trỏ chuột (cursor-pointer) và viền xanh khi hover
            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 cursor-pointer transition-all duration-200 p-5 flex flex-col"
          >
            {/* Thẻ trạng thái & Priority */}
            <div className="flex justify-between items-start mb-3">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getPriorityColor(task.priority)}`}
              >
                {task.priority || "MEDIUM"}
              </span>
              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md">
                {task.status}
              </span>
            </div>

            {/* Tiêu đề & Mô tả */}
            <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 leading-snug">
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-grow">
                {task.description}
              </p>
            )}

            {/* Thông tin thêm (AI Point, Date, Author) */}
            <div className="space-y-2 mt-auto pt-4 border-t border-gray-100">
              {/* Điểm gợi ý từ AI */}
              {task.ai_suggested_point && (
                <div className="flex items-center text-sm text-indigo-600 font-medium bg-indigo-50 w-fit px-2 py-1 rounded-md">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  AI ước tính: {task.ai_suggested_point} Point
                </div>
              )}

              {/* Hạn chót */}
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-2 text-gray-400" />
                <span
                  className={
                    isOverdue(task.due_date) ? "text-red-500 font-semibold" : ""
                  }
                >
                  Hạn chót: {formatDate(task.due_date)}
                </span>
              </div>

              {/* Người khởi tạo/giao việc */}
              {task.author && (
                <div className="flex items-center text-sm text-gray-600 pt-2">
                  {task.author.avatar_url ? (
                    <img
                      src={task.author.avatar_url}
                      alt="avatar"
                      className="w-6 h-6 rounded-full mr-2"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                      <User className="w-3 h-3 text-blue-600" />
                    </div>
                  )}
                  <span className="truncate">
                    Giao bởi:{" "}
                    <span className="font-medium text-gray-700">
                      {task.author.full_name}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyTasksPage;
