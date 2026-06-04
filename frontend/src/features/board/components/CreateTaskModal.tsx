import React, { useState, useEffect, forwardRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  X, AlignLeft, Calendar, Flag, Target, User, ChevronDown, Plus, Check, CheckSquare, Square 
} from "lucide-react";
import { useBoardStore } from "../stores/useBoardStore";
import { useUserStore } from "../../user/store/useUserStore";
import { useGetBoardDetail, useCreateTask, useGetProjectMembers } from '../hooks/useBoardQueries';

import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {vi} from "date-fns/locale/vi";

registerLocale("vi", vi);

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  columnId: string;
  columnName: string;
}

interface CustomDateInputProps {
  value?: string;
  onClick?: () => void;
  placeholder?: string;
}

const CustomDateInput = forwardRef<HTMLButtonElement, CustomDateInputProps>(
  ({ value, onClick, placeholder }, ref) => (
    <button
      type="button"
      onClick={onClick}
      ref={ref}
      className="w-full text-xs md:text-sm border border-slate-200/80 rounded-xl px-3 md:px-3.5 py-2.5 outline-none hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 transition-all bg-white flex items-center justify-between shadow-sm group"
    >
      <div className="flex items-center gap-2">
        <Calendar size={14} className={`md:w-[15px] md:h-[15px] ${value ? "text-indigo-500" : "text-slate-400 group-hover:text-indigo-400 transition-colors"}`} />
        <span className={value ? "font-bold text-slate-800 truncate max-w-[120px]" : "text-slate-400 font-medium"}>{value || placeholder}</span>
      </div>
      <ChevronDown size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
    </button>
  )
);
CustomDateInput.displayName = 'CustomDateInput';

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, columnId, columnName }) => {
  const { activeBoardId } = useBoardStore();
  const { data: board } = useGetBoardDetail(activeBoardId as string); 
  const getUser = useUserStore((state) => state.getUser);
  
  const projectId = board?.projectId || board?.project_id;
  const { data: apiMembers, isLoading: isMembersLoading } = useGetProjectMembers(projectId as string);
  const { mutateAsync: createTaskApi } = useCreateTask();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setNewPriority] = useState("MEDIUM");
  const [storyPoints, setStoryPoints] = useState<number | string>("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [assignees, setAssignees] = useState<string[]>([]);
  
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const [isAssigneePopupOpen, setIsAssigneePopupOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDesc("");
      setNewPriority("MEDIUM");
      setStoryPoints("");
      setStartDate(null);
      setDueDate(null);
      setAssignees([]);
      setSubtasks([]);
      setNewSubtaskTitle("");
      setIsSaving(false);
      setIsAssigneePopupOpen(false);
    }
  }, [isOpen]);

  const projectMembers = useMemo(() => {
    if (!apiMembers) return [];
    if (Array.isArray(apiMembers)) return apiMembers;
    if (apiMembers.data && Array.isArray(apiMembers.data)) return apiMembers.data;
    return apiMembers.content || [];
  }, [apiMembers]);

  const toggleAssignee = (userId: string) => {
    const safeId = String(userId);
    if (!safeId || safeId === "undefined" || safeId.startsWith('temp-')) return;
    setAssignees(prev => prev.includes(safeId) ? prev.filter(id => id !== safeId) : [...prev, safeId]);
  };

  const handleAddLocalSubtask = () => {
    if (newSubtaskTitle.trim()) {
      setSubtasks([...subtasks, newSubtaskTitle.trim()]);
      setNewSubtaskTitle("");
    }
  };

  const handleRemoveLocalSubtask = (indexToRemove: number) => {
    setSubtasks(subtasks.filter((_, idx) => idx !== indexToRemove));
  };

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!title.trim() || !activeBoardId) return;
    setIsSaving(true);

    try {
      const createdTaskResponse: any = await createTaskApi({
        boardId: activeBoardId,
        taskData: {
          title: title.trim(),
          description: desc,
          column_id: String(columnId),
          priority: priority.toUpperCase(),
          status: "TODO",
          assignees_user_id: assignees,
          story_point: Number(storyPoints) || 0,
          start_date: startDate ? startDate.toISOString() : null,
          due_date: dueDate ? dueDate.toISOString() : null,
          parent_task_id: null
        }
      });

      const newParentId = createdTaskResponse?.data?.id || createdTaskResponse?.data?._id || createdTaskResponse?.id || createdTaskResponse?._id;

      if (newParentId && subtasks.length > 0) {
        await Promise.all(subtasks.map(stTitle => 
          createTaskApi({
            boardId: activeBoardId,
            taskData: {
              title: stTitle,
              description: "",
              column_id: String(columnId),
              parent_task_id: String(newParentId),
              priority: "MEDIUM",
              status: "TODO",
              story_point: 0,
              assignees_user_id: []
            }
          })
        ));
      }

      onClose();
    } catch (error) {
      console.error("Lỗi tạo Task mới:", error);
      alert("Tạo Task thất bại! Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-12">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}></div>

      <div className="relative w-full max-w-[900px] bg-slate-50/95 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] md:max-h-[95vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-white/50">
        
        {/* Header Responsive */}
        <div className="bg-white/80 backdrop-blur-sm px-4 md:px-6 py-3.5 md:py-5 border-b border-slate-200/60 flex justify-between items-start gap-3 md:gap-6 shrink-0 z-10">
          <div className="flex-1 min-w-0">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-lg sm:text-xl md:text-2xl font-extrabold text-slate-800 bg-transparent border-2 border-transparent hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 rounded-xl px-2 py-1 md:px-3 md:py-1.5 outline-none transition-all placeholder:text-slate-300 truncate"
              placeholder="Tiêu đề công việc mới..."
            />
            <p className="text-[11px] md:text-[13px] text-slate-500 px-2 md:px-3 mt-1 font-medium truncate">
              Tạo trong danh sách: <span className="font-bold px-1.5 md:px-2 py-0.5 rounded-md border border-slate-200/60 bg-indigo-50 text-indigo-700">{columnName}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 md:p-2.5 bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-all shrink-0 mt-1 md:mt-1">
            <X size={18} className="md:w-5 md:h-5" />
          </button>
        </div>

        {/* Form Body Responsive - Scrollable Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8">
          <div className="flex flex-col md:flex-row gap-5 md:gap-8 lg:gap-10">
            
            {/* CỘT TRÁI */}
            <div className="flex-1 flex flex-col gap-5 md:gap-8 min-w-0">
              
              {/* Box Mô tả */}
              <div>
                <div className="flex items-center gap-2 md:gap-2.5 text-slate-800 mb-2.5 md:mb-4 font-bold text-[15px] md:text-lg">
                  <div className="p-1.5 md:p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0"><AlignLeft size={16} className="md:w-[18px] md:h-[18px]" /></div>
                  <h3 className="truncate">Mô tả công việc</h3>
                </div>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Thêm mô tả chi tiết công việc tại đây..."
                  className="w-full min-h-[100px] md:min-h-[140px] p-3.5 md:p-5 bg-white border border-slate-200/80 rounded-xl md:rounded-2xl text-[13px] md:text-[15px] leading-relaxed text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all resize-y shadow-sm custom-scrollbar"
                />
              </div>

              {/* BOX VIỆC CON */}
              <div>
                <div className="flex items-center gap-2 md:gap-2.5 text-slate-800 mb-2.5 md:mb-4 font-bold text-[15px] md:text-lg">
                  <div className="p-1.5 md:p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0"><CheckSquare size={16} className="md:w-[18px] md:h-[18px]" /></div>
                  <h3 className="truncate">Checklist Việc Con</h3>
                  {subtasks.length > 0 && <span className="ml-1 md:ml-1.5 text-[10px] md:text-xs font-black bg-slate-200 text-slate-600 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">{subtasks.length}</span>}
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl md:rounded-2xl p-2 md:p-2.5 shadow-sm">
                  <div className="flex flex-col gap-1 max-h-40 md:max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {subtasks.map((stTitle, idx) => (
                      <div key={idx} className="group/st flex items-center gap-2 md:gap-3 p-1.5 md:p-2.5 hover:bg-slate-50/80 rounded-lg md:rounded-xl transition-all border border-transparent hover:border-slate-100">
                        <Square size={14} className="md:w-[18px] md:h-[18px] text-slate-300 shrink-0" />
                        <span className="text-[13px] md:text-[15px] flex-1 truncate text-slate-700 font-medium">{stTitle}</span>
                        <button type="button" onClick={() => handleRemoveLocalSubtask(idx)} className="opacity-100 md:opacity-0 group-hover/st:opacity-100 p-1 md:p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0">
                          <X size={14} className="md:w-[16px] md:h-[16px]" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-1 md:mt-2 p-1 md:p-1.5 pt-2 md:pt-3 border-t border-slate-100 flex items-center gap-2 md:gap-3">
                    <div className="p-1 md:p-1.5 bg-slate-100 rounded-md md:rounded-lg text-slate-400 shrink-0"><Plus size={14} className="md:w-[16px] md:h-[16px]" /></div>
                    <input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newSubtaskTitle.trim()) {
                          e.preventDefault();
                          handleAddLocalSubtask();
                        }
                      }}
                      placeholder="Gõ tên việc con và nhấn Enter..."
                      className="flex-1 text-[13px] md:text-[15px] font-medium bg-transparent outline-none text-slate-700 placeholder:text-slate-400 min-w-0"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* CỘT PHẢI (Thuộc tính) */}
            <div className="w-full md:w-[260px] lg:w-[280px] flex flex-col gap-4 md:gap-6 shrink-0">
              <div className="bg-white p-3.5 md:p-5 rounded-xl md:rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-3 md:gap-5">
                <h4 className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 md:gap-2">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-indigo-500 shrink-0"></span> Thuộc tính
                </h4>

                {/* Gán Người */}
                <div className="flex flex-col gap-1.5 md:gap-2">
                  <label className="text-[12px] md:text-[13px] font-bold text-slate-600 flex items-center gap-1.5 md:gap-2"><User size={14} className="text-slate-400 md:w-[15px] md:h-[15px] shrink-0" /> Người thực hiện</label>
                  <div className="flex flex-wrap gap-1.5 md:gap-2 relative">
                    {assignees.length > 0 ? (
                      assignees.map((userId, idx) => {
                        const apiMember = projectMembers.find((m: any) => String(m.user_id || m.id || m._id) === userId);
                        const member = apiMember || getUser(userId, projectId);
                        
                        const displayName = member?.full_name || member?.name || "Unnamed";
                        const avatarUrl = member?.avatar_url || member?.avatarUrl;
                        const initial = String(displayName).charAt(0).toUpperCase();

                        return (
                          <div key={`chosen-${userId || idx}`} className="flex items-center gap-1.5 md:gap-2 px-1.5 py-1 md:px-2 md:py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg md:rounded-xl shadow-sm group/name">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={displayName} className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover border border-indigo-200 shadow-sm shrink-0" />
                            ) : (
                              <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] md:text-[10px] font-black text-white shadow-sm shrink-0">{initial}</div>
                            )}
                            <span className="text-[11px] md:text-[12px] font-bold text-indigo-700 truncate max-w-[80px] md:max-w-[100px]" title={displayName}>{displayName}</span>
                            <button type="button" onClick={() => toggleAssignee(userId)} className="opacity-100 md:opacity-0 group-hover/name:opacity-100 p-0.5 hover:bg-indigo-200 rounded-full text-indigo-400 hover:text-indigo-600 transition-all shrink-0"><X size={10} /></button>
                          </div>
                        );
                      })
                    ) : (
                      <span className="w-full text-[11px] md:text-xs text-slate-400 italic bg-slate-50 p-2 md:p-2.5 rounded-lg md:rounded-xl border border-slate-200 border-dashed text-center">Chưa phân công</span>
                    )}

                    <button type="button" onClick={() => setIsAssigneePopupOpen(!isAssigneePopupOpen)} className="flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-[10px] md:text-[11px]">
                      <Plus size={12} className="shrink-0" /> Phân công
                    </button>

                    {/* Popup Member List - Fixed Overflow on Mobile */}
                    {isAssigneePopupOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsAssigneePopupOpen(false)}></div>
                        <div className="absolute top-full mt-1.5 left-0 w-full sm:w-64 md:w-72 bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-1.5 md:p-2 max-h-48 md:max-h-56 overflow-y-auto custom-scrollbar">
                          <h5 className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Thành viên</h5>
                          {isMembersLoading ? (
                            <div className="text-[11px] md:text-xs text-center text-slate-400 p-2">Đang tải...</div>
                          ) : projectMembers.length > 0 ? (
                            projectMembers.map((member: any, idx: number) => {
                              const rawId = member.user_id || member.id || member._id;
                              if (!rawId) return null;
                              const safeId = String(rawId);
                              const isSelected = assignees.includes(safeId);
                              const name = member.full_name || member.name || "Unnamed";
                              const initial = String(name).charAt(0).toUpperCase();
                              
                              return (
                                <div key={`pop-${safeId || idx}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleAssignee(safeId); }} className={`flex items-center justify-between p-1.5 md:p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                  <div className="flex items-center gap-2 min-w-0 pr-2">
                                    {member.avatar_url ? <img src={member.avatar_url} className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover shrink-0" /> : <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-slate-200 flex items-center justify-center text-[9px] md:text-[10px] font-bold text-slate-600 shrink-0">{initial}</div>}
                                    <span className="text-[12px] md:text-[13px] font-medium text-slate-700 truncate">{name}</span>
                                  </div>
                                  {isSelected && <Check size={14} className="text-indigo-600 md:w-4 md:h-4 shrink-0" />}
                                </div>
                              );
                            })
                          ) : <div className="text-[11px] md:text-xs text-center text-slate-400 p-2">Dự án trống</div>}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Container Grid 2 cột trên Mobile cho Ưu tiên và Points */}
                <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:gap-4 mt-1 md:mt-0">
                  <div className="flex flex-col gap-1.5 md:gap-2">
                    <label className="text-[12px] md:text-[13px] font-bold text-slate-600 flex items-center gap-1.5 md:gap-2"><Flag size={14} className="text-slate-400 md:w-[15px] md:h-[15px] shrink-0" /> Mức Ưu tiên</label>
                    <div className="relative">
                      <select value={priority} onChange={(e) => setNewPriority(e.target.value)} className="w-full text-[12px] md:text-sm font-bold border border-slate-200/80 rounded-lg md:rounded-xl px-2.5 md:px-3.5 py-2 md:py-2.5 outline-none text-slate-700 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 appearance-none bg-white transition-all shadow-sm">
                        <option value="LOW">Low (Thấp)</option>
                        <option value="MEDIUM">Medium (Vừa)</option>
                        <option value="HIGH">High (Cao)</option>
                        <option value="CRITICAL">Critical (Gấp)</option>
                      </select>
                      <div className="absolute right-2 md:right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronDown size={14} className="md:w-4 md:h-4" /></div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 md:gap-2">
                    <label className="text-[12px] md:text-[13px] font-bold text-slate-600 flex items-center gap-1.5 md:gap-2"><Target size={14} className="text-slate-400 md:w-[15px] md:h-[15px] shrink-0" /> Story Points</label>
                    <input type="number" min="0" value={storyPoints} onChange={(e) => setStoryPoints(e.target.value)} placeholder="0" className="w-full text-[12px] md:text-sm font-black text-indigo-600 border border-slate-200/80 rounded-lg md:rounded-xl px-2.5 md:px-3.5 py-2 md:py-2.5 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all bg-white shadow-sm" />
                  </div>
                </div>
              </div>

              {/* Box Thời gian */}
              <div className="bg-white p-3.5 md:p-5 rounded-xl md:rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-3 md:gap-4">
                <div className="flex flex-col gap-1.5 md:gap-2">
                  <label className="text-[12px] md:text-[13px] font-bold text-slate-600 flex items-center gap-1.5 md:gap-2"><Calendar size={14} className="text-slate-400 md:w-[15px] md:h-[15px] shrink-0" /> Ngày Bắt đầu</label>
                  <div className="w-full">
                    <DatePicker selected={startDate} onChange={(date: Date | null) => setStartDate(date)} selectsStart startDate={startDate} endDate={dueDate} locale="vi" dateFormat="dd/MM/yyyy" placeholderText="Chọn ngày đầu" customInput={<CustomDateInput />} isClearable wrapperClassName="w-full" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 md:gap-2">
                  <label className="text-[12px] md:text-[13px] font-bold text-slate-600 flex items-center gap-1.5 md:gap-2"><Calendar size={14} className="text-slate-400 md:w-[15px] md:h-[15px] shrink-0" /> Ngày Hạn chót</label>
                  <div className="w-full">
                    <DatePicker selected={dueDate} onChange={(date: Date | null) => setDueDate(date)} selectsEnd startDate={startDate} endDate={dueDate} minDate={startDate || undefined} locale="vi" dateFormat="dd/MM/yyyy" placeholderText="Chọn ngày cuối" customInput={<CustomDateInput />} isClearable wrapperClassName="w-full" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Responsive - Fixed at Bottom */}
        <div className="bg-white/90 backdrop-blur-md px-4 py-3 md:px-6 md:py-4 border-t border-slate-200/60 flex flex-col sm:flex-row justify-end gap-2.5 md:gap-3 items-center shrink-0 z-10">
          <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 bg-slate-50 border border-slate-200/80 rounded-xl text-[13px] md:text-sm font-bold transition-all">Hủy</button>
          <button type="button" onClick={handleCreate} disabled={isSaving || !title.trim()} className="w-full sm:w-auto flex justify-center items-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[13px] md:text-sm font-bold shadow-md md:shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus size={16} className="md:w-[18px] md:h-[18px]" /> {isSaving ? "Đang tạo..." : "Tạo công việc"}
          </button>
        </div>

      </div>
      
      {/* DatePicker Custom Styles Override to ensure it fits mobile screens */}
      <style>{`
        .react-datepicker-wrapper {
          width: 100%;
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CreateTaskModal;