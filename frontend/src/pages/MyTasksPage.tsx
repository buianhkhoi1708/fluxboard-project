import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  ListTodo,
  SearchX,
} from "lucide-react";
import axiosClient from "../lib/axiosClient";
import { Task } from "../features/board/types";

type TaskGroup = "IN_PROGRESS" | "DONE" | "OVERDUE";

const unwrap = (res: any) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

const getTaskId = (task: Task) => String(task.id || task._id || "");
const getBoardId = (task: Task) => task.boardId || task.board_id;
const getDueDate = (task: Task) => task.due_date || task.dueDate;
const isDone = (task: Task) => String(task.status || "").toUpperCase() === "DONE" || task.is_done || task.isDone;

const isOverdue = (task: Task) => {
  const dueDate = getDueDate(task);
  if (!dueDate || isDone(task)) return false;
  return new Date(dueDate).getTime() < Date.now();
};

const isDueSoon = (task: Task) => {
  const dueDate = getDueDate(task);
  if (!dueDate || isDone(task) || isOverdue(task)) return false;
  const diff = new Date(dueDate).getTime() - Date.now();
  return diff > 0 && diff <= 24 * 60 * 60 * 1000;
};

const getTaskGroup = (task: Task): TaskGroup => {
  if (isDone(task)) return "DONE";
  if (isOverdue(task)) return "OVERDUE";
  return "IN_PROGRESS";
};

const formatDate = (value?: string | null) => {
  if (!value) return "Chưa có hạn";
  try {
    return new Date(value).toLocaleString("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
};

const getRemainingLabel = (task: Task) => {
  const dueDate = getDueDate(task);
  if (!dueDate) return "Chưa đặt deadline";

  const now = Date.now();
  const due = new Date(dueDate).getTime();
  const diff = due - now;

  if (diff < 0) {
    const abs = Math.abs(diff);
    const hours = Math.floor(abs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    return days > 0 ? `Trễ ${days} ngày` : `Trễ ${Math.max(hours, 1)} giờ`;
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `Còn ${days} ngày`;
  return `Còn ${Math.max(hours, 1)} giờ`;
};

const statusTabs: { key: TaskGroup; label: string; icon: React.ReactNode }[] = [
  {
    key: "IN_PROGRESS",
    label: "Đang thực hiện",
    icon: <Clock size={18} />,
  },
  {
    key: "DONE",
    label: "Đã hoàn thành",
    icon: <CheckCircle2 size={18} />,
  },
  {
    key: "OVERDUE",
    label: "Trễ hạn",
    icon: <AlertTriangle size={18} />,
  },
];

const TaskCard = ({ task }: { task: Task }) => {
  const navigate = useNavigate();
  const boardId = getBoardId(task);
  const taskId = getTaskId(task);
  const group = getTaskGroup(task);
  const dueSoon = isDueSoon(task);

  const openTask = () => {
    if (boardId && taskId) navigate(`/board/${boardId}?taskId=${taskId}`);
  };

  const statusClass =
    group === "OVERDUE"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : group === "DONE"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : dueSoon
          ? "bg-orange-50 text-orange-700 border-orange-200"
          : "bg-indigo-50 text-indigo-700 border-indigo-200";

  const dueClass =
    group === "OVERDUE"
      ? "text-rose-600 bg-rose-50 border-rose-200"
      : dueSoon
        ? "text-orange-600 bg-orange-50 border-orange-200 animate-pulse"
        : "text-slate-500 bg-slate-50 border-slate-200";

  return (
    <div
      className={`rounded-3xl border bg-white p-5 shadow-sm hover:shadow-lg transition-all ${
        group === "OVERDUE"
          ? "border-rose-200"
          : group === "DONE"
            ? "border-emerald-100 opacity-75"
            : dueSoon
              ? "border-orange-200"
              : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg border ${statusClass}`}>
              {group === "OVERDUE"
                ? "Trễ hạn"
                : group === "DONE"
                  ? "Đã hoàn thành"
                  : "Đang thực hiện"}
            </span>

            {dueSoon && group === "IN_PROGRESS" && (
              <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-orange-100 text-orange-700 border border-orange-200">
                Gần hạn dưới 24 giờ
              </span>
            )}
          </div>

          <h3
            className={`text-base font-extrabold leading-snug ${
              group === "DONE"
                ? "text-slate-400 line-through"
                : "text-slate-800"
            }`}
          >
            {task.title || "Công việc không tên"}
          </h3>

          {task.description && (
            <p className="mt-2 text-sm text-slate-500 leading-relaxed line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${dueClass}`}>
              <CalendarClock size={14} />
              {formatDate(getDueDate(task))}
            </span>

            <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${dueClass}`}>
              <Clock size={14} />
              {getRemainingLabel(task)}
            </span>

            {(task.story_point || task.story_points || task.storyPoint) && (
              <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                {task.story_point || task.story_points || task.storyPoint} điểm
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={openTask}
          disabled={!boardId || !taskId}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          <ExternalLink size={15} />
          Mở task
        </button>
      </div>
    </div>
  );
};

const MyTasksPage = () => {
  const [activeTab, setActiveTab] = useState<TaskGroup>("IN_PROGRESS");

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/tasks/my-tasks");
      return unwrap(res) as Task[];
    },
    refetchInterval: 30000,
  });

  const groupedTasks = useMemo(() => {
    const result: Record<TaskGroup, Task[]> = {
      IN_PROGRESS: [],
      DONE: [],
      OVERDUE: [],
    };

    tasks.forEach((task) => result[getTaskGroup(task)].push(task));

    result.IN_PROGRESS.sort((a, b) => {
      const aSoon = isDueSoon(a) ? 0 : 1;
      const bSoon = isDueSoon(b) ? 0 : 1;
      if (aSoon !== bSoon) return aSoon - bSoon;
      return new Date(getDueDate(a) || "2999-12-31").getTime() - new Date(getDueDate(b) || "2999-12-31").getTime();
    });

    result.OVERDUE.sort((a, b) => {
      return new Date(getDueDate(a) || "2999-12-31").getTime() - new Date(getDueDate(b) || "2999-12-31").getTime();
    });

    result.DONE.sort((a, b) => {
      return new Date(b.updated_at || b.updatedAt || 0).getTime() - new Date(a.updated_at || a.updatedAt || 0).getTime();
    });

    return result;
  }, [tasks]);

  const currentTasks = groupedTasks[activeTab];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                <ListTodo size={23} />
              </div>
              Công việc của tôi
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-2">
              Theo dõi các công việc đang làm, đã hoàn thành và trễ hạn.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {statusTabs.map((tab) => {
            const active = activeTab === tab.key;
            const count = groupedTasks[tab.key].length;

            const activeClass =
              tab.key === "OVERDUE"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : tab.key === "DONE"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-indigo-200 bg-indigo-50 text-indigo-700";

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  active
                    ? activeClass + " shadow-sm"
                    : "border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:bg-indigo-50/40"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-extrabold">
                    {tab.icon}
                    {tab.label}
                  </div>
                  <span className="text-xl font-black">{count}</span>
                </div>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            <Loader2 size={28} className="animate-spin mx-auto mb-3 text-indigo-500" />
            <p className="font-bold">Đang tải công việc...</p>
          </div>
        ) : isError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-12 text-center text-rose-600">
            <AlertTriangle size={30} className="mx-auto mb-3" />
            <p className="font-bold">Không thể tải danh sách công việc.</p>
          </div>
        ) : currentTasks.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            <SearchX size={34} className="mx-auto mb-3 text-slate-300" />
            <p className="text-lg font-extrabold text-slate-700">Không có công việc nào</p>
            <p className="text-sm mt-1">
              Không có công việc trong trạng thái “{statusTabs.find((tab) => tab.key === activeTab)?.label}”.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentTasks.map((task) => (
              <TaskCard key={getTaskId(task)} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTasksPage;