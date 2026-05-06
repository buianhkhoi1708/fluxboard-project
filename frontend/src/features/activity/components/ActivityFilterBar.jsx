import React, { useState, useEffect } from "react";
import { useActivityStore } from "../store/useActivityStore";
import { FunnelIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

const ActivityFilterBar = () => {
    const { filters, setFilters } = useActivityStore();

    const [localFilters, setLocalFilters] = useState({
    action: filters?.actions || "",
    source_type: filters?.sourceTypes || "",
    startDate: filters?.from ? filters.from.split('T')[0] : "",
    endDate: filters?.to ? filters.to.split('T')[0] : ""
    });

    useEffect(() => {
        setLocalFilters({
            action: filters?.actions || "",
            source_type: filters?.sourceTypes || "",
            startDate: filters?.from ? filters.from.split('T')[0] : "",
            endDate: filters?.to ? filters.to.split('T')[0] : ""
        });
    }, [filters]);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        const formattedFilters = {};

        if (localFilters.source_type) formattedFilters.sourceTypes = localFilters.source_type;
        if (localFilters.action) formattedFilters.actions = localFilters.action;

        if (localFilters.startDate) {
            formattedFilters.from = new Date(`${localFilters.startDate}T00:00:00Z`).toISOString();
        }

        if (localFilters.endDate) {
            formattedFilters.to = new Date(`${localFilters.endDate}T23:59:59.999Z`).toISOString();
        }

        setFilters(formattedFilters);
    };

    const handleClearFilter = () => {
        const emptyFilters = { action: "", source_type: "", startDate: "", endDate: "" };
        setLocalFilters(emptyFilters);
        setFilters({});
    };

    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Phạm vi</label>
                <select 
                    value={localFilters.source_type} 
                    onChange={(e) => setLocalFilters({...localFilters, source_type: e.target.value})}
                    className="w-full text-sm p-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-400"
                >
                    <option value="">Tất cả</option>
                    <option value="PROJECT">Project</option>
                    <option value="BOARD">Board</option>
                    <option value="TASK">Task</option>
                    <option value="USER">User</option>
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
                    type="button"
                    onClick={handleApplyFilter}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                    <FunnelIcon className="w-4 h-4" /> Lọc
                </button>
                <button
                    type="button"
                    onClick={handleClearFilter}
                    className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-lg transition"
                    title="Xóa bộ lọc"
                >
                    <ArrowPathIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default ActivityFilterBar;