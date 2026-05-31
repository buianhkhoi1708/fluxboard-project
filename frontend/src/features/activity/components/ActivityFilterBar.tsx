import React, { useEffect, useMemo, useState } from "react";
import {
  FunnelIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ClockIcon
} from "@heroicons/react/24/outline";
import { AlertTriangle } from "lucide-react";
import { useActivityFilters } from "../hooks/useActivityFilters";

const firstValue = (value?: string[]) => {
  return Array.isArray(value) && value.length > 0 ? value[0] : "";
};

const isoToDisplayDate = (iso?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear());

  return `${day}/${month}/${year}`;
};

const formatDateText = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  if (digits.length <= 2) return day;
  if (digits.length <= 4) return `${day}/${month}`;
  return `${day}/${month}/${year}`;
};

const parseDisplayDateToIso = (value: string, endOfDay = false) => {
  if (!value) return undefined;
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return null;

  const [dayText, monthText, yearText] = value.split("/");
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  if (year < 2000 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  ));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date.toISOString();
};

const ActivityFilterBar = () => {
  const [filters, setFilters] = useActivityFilters();

  const filterSnapshot = useMemo(() => {
    return JSON.stringify({
      sourceType: firstValue(filters.sourceTypes),
      action: firstValue(filters.actions),
      from: filters.from,
      to: filters.to,
    });
  }, [filters.sourceTypes, filters.actions, filters.from, filters.to]);

  const [localFilters, setLocalFilters] = useState({
    action: firstValue(filters.actions),
    sourceType: firstValue(filters.sourceTypes),
    startDate: isoToDisplayDate(filters.from),
    endDate: isoToDisplayDate(filters.to),
  });

  const [error, setError] = useState("");

  useEffect(() => {
    setLocalFilters({
      action: firstValue(filters.actions),
      sourceType: firstValue(filters.sourceTypes),
      startDate: isoToDisplayDate(filters.from),
      endDate: isoToDisplayDate(filters.to),
    });
  }, [filterSnapshot]);

  const updateLocalFilter = (key: keyof typeof localFilters, value: string) => {
    setError("");

    setLocalFilters((prev) => ({
      ...prev,
      [key]: key === "startDate" || key === "endDate" ? formatDateText(value) : value,
    }));
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();

    const fromIso = parseDisplayDateToIso(localFilters.startDate, false);
    const toIso = parseDisplayDateToIso(localFilters.endDate, true);

    if (fromIso === null || toIso === null) {
      setError("Ngày không hợp lệ. Vui lòng nhập theo định dạng dd/mm/yyyy, ví dụ 30/05/2026.");
      return;
    }

    if (fromIso && toIso && new Date(fromIso).getTime() > new Date(toIso).getTime()) {
      setError("Từ ngày không được lớn hơn Đến ngày.");
      return;
    }

    setFilters({
      sourceTypes: localFilters.sourceType ? [localFilters.sourceType] : undefined,
      actions: localFilters.action ? [localFilters.action] : undefined,
      from: fromIso || undefined,
      to: toIso || undefined,
    });
  };

  const handleClearFilter = () => {
    setError("");

    setLocalFilters({
      action: "",
      sourceType: "",
      startDate: "",
      endDate: "",
    });

    setFilters({});
  };

  return (
    <form
      onSubmit={handleApplyFilter}
      className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-5 mb-8 transition-all duration-200"
    >
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 tracking-wide">
            Phạm vi
          </label>
          <select
            value={localFilters.sourceType}
            onChange={(e) => updateLocalFilter("sourceType", e.target.value)}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200 text-slate-700"
          >
            <option value="">Tất cả</option>
            <option value="PROJECT">📁 Project</option>
            <option value="BOARD">📌 Board</option>
            <option value="TASK">✅ Task</option>
            <option value="USER">👤 User</option>
            <option value="AUTH">🔐 Auth</option>
          </select>
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 tracking-wide">
            Hành động
          </label>
          <select
            value={localFilters.action}
            onChange={(e) => updateLocalFilter("action", e.target.value)}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200 text-slate-700"
          >
            <option value="">Tất cả</option>
            <option value="CREATE">✨ Tạo mới</option>
            <option value="UPDATE">✏️ Cập nhật</option>
            <option value="DELETE">🗑️ Xóa</option>
            <option value="MOVE">🔄 Di chuyển</option>
            <option value="ADD_MEMBER">👥 Thêm thành viên</option>
            <option value="LOGIN">🔑 Đăng nhập</option>
            <option value="PASSWORD_CHANGED">🛡️ Đổi mật khẩu</option>
            <option value="PASSWORD_RESET">♻️ Đặt lại mật khẩu</option>
            <option value="ACCOUNT_CREATED">👤 Tạo tài khoản</option>
            <option value="ACCOUNT_UPDATED">📝 Cập nhật tài khoản</option>
            <option value="ACCOUNT_DELETED">🚫 Xóa tài khoản</option>
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 tracking-wide flex items-center gap-1">
            <CalendarDaysIcon className="w-3.5 h-3.5" />
            Từ ngày
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            placeholder="dd/mm/yyyy"
            value={localFilters.startDate}
            onChange={(e) => updateLocalFilter("startDate", e.target.value)}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200 text-slate-700 placeholder:text-slate-400"
          />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 tracking-wide flex items-center gap-1">
            <ClockIcon className="w-3.5 h-3.5" />
            Đến ngày
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            placeholder="dd/mm/yyyy"
            value={localFilters.endDate}
            onChange={(e) => updateLocalFilter("endDate", e.target.value)}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200 text-slate-700 placeholder:text-slate-400"
          />
        </div>

        <div className="flex gap-3 lg:w-auto w-full">
          <button
            type="submit"
            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
          >
            <FunnelIcon className="w-4 h-4" />
            <span>Lọc</span>
          </button>

          <button
            type="button"
            onClick={handleClearFilter}
            className="flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 p-2.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            title="Xóa tất cả bộ lọc"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}
    </form>
  );
};

export default ActivityFilterBar;