import React, { useState, useEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom'; 
import { X, AlignLeft, CheckSquare, Clock, Calendar, Flag, Target, Sparkles, Plus, Square, Save, Trash2, User } from 'lucide-react';
import { useBoardStore } from '../stores/useBoardStore';

// 👉 IMPORT THƯ VIỆN LỊCH VÀ TIẾNG VIỆT VÀO ĐÂY
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import vi from 'date-fns/locale/vi';

// Kích hoạt tiếng Việt cho lịch
registerLocale('vi', vi);

const priorityColors = { 
  Low: 'bg-blue-100 text-blue-700', 
  Medium: 'bg-yellow-100 text-yellow-700', 
  High: 'bg-orange-100 text-orange-700', 
  Critical: 'bg-red-100 text-red-700' 
};

// 👉 TẠO NÚT BẤM TÙY CHỈNH CHO CÁI LỊCH (Đẹp hơn thẻ input mặc định rất nhiều)
const CustomDateInput = forwardRef(({ value, onClick, placeholder }, ref) => (
  <button
    type="button"
    onClick={onClick}
    ref={ref}
    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none hover:border-indigo-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-slate-50 flex items-center justify-between"
  >
    <span className={value ? "font-bold text-indigo-700" : "text-slate-400"}>
      {value || placeholder}
    </span>
  </button>
));

const TaskDetailModal = ({ isOpen, onClose, task, listId }) => {
  const { updateTask, toggleSubtask, addSubtask, deleteTask } = useBoardStore();

  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState('Medium');
  const [editStoryPoints, setEditStoryPoints] = useState(0);
  
  // 👉 ĐỔI SANG DÙNG OBJECT DATE THAY VÌ STRING
  const [editStartDate, setEditStartDate] = useState(null);
  const [editDueDate, setEditDueDate] = useState(null);
  
  const [editEstimatedDays, setEditEstimatedDays] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // 1. ĐỔ DỮ LIỆU TỪ BACKEND
  useEffect(() => {
    if (isOpen && task) {
      setEditTitle(task.title || '');
      setEditDesc(task.description || '');
      setEditPriority(task.priority || 'Medium');
      setEditStoryPoints(task.story_points || task.story_point || 0);
      
      // Khôi phục lại đối tượng Date từ chuỗi ISO của Backend
      setEditStartDate(task.start_date ? new Date(task.start_date) : null);
      setEditDueDate(task.due_date ? new Date(task.due_date) : null);
      
      setEditEstimatedDays(task.estimated_days || '');
    }
  }, [isOpen, task]);

  // 2. AUTO-CALCULATE ESTIMATED DAYS (Đã tối ưu cho Date Object)
  useEffect(() => {
    if (editStartDate && editDueDate) {
      if (editDueDate >= editStartDate) {
        const diffTime = editDueDate.getTime() - editStartDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setEditEstimatedDays(diffDays === 0 ? 1 : diffDays);
      } else {
        setEditEstimatedDays(0);
      }
    } else {
      setEditEstimatedDays('');
    }
  }, [editStartDate, editDueDate]);

  if (!isOpen || !task) return null;

  const handleSave = () => {
    updateTask(listId, task.id || task._id, {
      title: editTitle.trim() || 'Task không tên',
      description: editDesc,
      priority: editPriority,
      story_points: Number(editStoryPoints),
      // Format lại ra chuẩn ISO cho Backend cất
      start_date: editStartDate ? editStartDate.toISOString() : null,
      due_date: editDueDate ? editDueDate.toISOString() : null,
      estimated_days: Number(editEstimatedDays)
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Bạn có chắc muốn xóa task "${task.title}"?`)) {
      deleteTask(listId, task.id || task._id);
      onClose();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}></div>

      <div className="relative w-full max-w-4xl bg-slate-50 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-start gap-4">
          <div className="flex-1">
            <input 
              value={editTitle} 
              onChange={e => setEditTitle(e.target.value)}
              className="w-full text-2xl font-bold text-slate-800 bg-transparent border-2 border-transparent hover:border-slate-200 focus:border-indigo-400 focus:bg-white rounded-lg px-2 py-1 outline-none transition-all"
            />
            <p className="text-sm text-slate-500 px-2 mt-1">Đang nằm trong danh sách <span className="font-semibold underline decoration-slate-300 underline-offset-4">{task.status}</span></p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="flex flex-col md:flex-row gap-8">
            
            {/* CỘT TRÁI */}
            <div className="flex-1 flex flex-col gap-8">
              <div>
                <div className="flex items-center gap-2 text-slate-700 mb-3 font-semibold text-lg">
                  <AlignLeft size={20} /> <h3>Mô tả chi tiết</h3>
                </div>
                <textarea 
                  value={editDesc} 
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Thêm mô tả chi tiết hơn cho công việc này..."
                  className="w-full min-h-[120px] p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-y custom-scrollbar shadow-sm"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 text-slate-700 mb-3 font-semibold text-lg">
                  <CheckSquare size={20} /> <h3>Checklist Việc Con</h3>
                  <span className="ml-2 text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{(task.subtasks || []).length}</span>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
                  <div className="flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                    {(task.subtasks || []).map(st => (
                      <div key={st.id || st._id} className="group/st flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                        <button onClick={() => toggleSubtask(listId, task.id || task._id, st.id || st._id)} className="mt-0.5 shrink-0">
                          {st.status === 'DONE' ? <CheckSquare size={16} className="text-emerald-500" /> : <Square size={16} className="text-slate-300 hover:text-indigo-400 transition-colors" />}
                        </button>
                        <span className={`text-sm flex-1 ${st.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{st.title}</span>
                        <button onClick={() => deleteTask(listId, st.id || st._id)} className="opacity-0 group-hover/st:opacity-100 p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-2 p-2 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <Plus size={16} className="text-slate-400" />
                    <input 
                      value={newSubtaskTitle} 
                      onChange={e => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                          e.preventDefault();
                          addSubtask(listId, task.id || task._id, newSubtaskTitle);
                          setNewSubtaskTitle('');
                        }
                      }}
                      placeholder="Thêm một việc con..."
                      className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {task.ai_estimation_reason && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100/50 rounded-xl p-4 flex gap-3 shadow-sm">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg h-fit"><Sparkles size={20} /></div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-800 mb-1">AI Phân tích ({task.ai_suggested_points} Pts)</h4>
                    <p className="text-sm text-amber-700/80 leading-relaxed">{task.ai_estimation_reason}</p>
                  </div>
                </div>
              )}
            </div>

            {/* CỘT PHẢI */}
            <div className="w-full md:w-64 flex flex-col gap-6 shrink-0">
              
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thông số thẻ</h4>
                
                <div className="flex flex-col gap-2 mb-2">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><User size={14} /> Người thực hiện</label>
                  <div className="flex items-center gap-2">
                    {task.assignees?.length > 0 ? (
                      <div className="flex -space-x-2">
                        {task.assignees.map((assigneeId, idx) => (
                          <div key={idx} className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-indigo-600 shadow-sm" title={assigneeId}>
                            <User size={14} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400 italic bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 border-dashed">Chưa phân công</span>
                    )}
                    <button className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors bg-slate-50" title="Thêm người">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><Flag size={14} /> Ưu tiên</label>
                  <select value={editPriority} onChange={e => setEditPriority(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none font-medium text-slate-700 focus:border-indigo-400 transition-all cursor-pointer bg-slate-50">
                    {Object.keys(priorityColors).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><Target size={14} /> Điểm số (Story Points)</label>
                  <input type="number" min="0" value={editStoryPoints} onChange={e => setEditStoryPoints(e.target.value)} className="w-full text-sm font-bold text-indigo-600 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 transition-all bg-slate-50" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian</h4>
                
                {/* 👉 LỊCH BẮT ĐẦU */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><Calendar size={14} /> Ngày bắt đầu</label>
                  <DatePicker
                    selected={editStartDate}
                    onChange={(date) => setEditStartDate(date)}
                    selectsStart
                    startDate={editStartDate}
                    endDate={editDueDate}
                    locale="vi"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Chọn ngày..."
                    customInput={<CustomDateInput />}
                    isClearable
                  />
                </div>

                {/* 👉 LỊCH KẾT THÚC */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><Calendar size={14} /> Ngày kết thúc (Due)</label>
                  <DatePicker
                    selected={editDueDate}
                    onChange={(date) => setEditDueDate(date)}
                    selectsEnd
                    startDate={editStartDate}
                    endDate={editDueDate}
                    minDate={editStartDate}
                    locale="vi"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Chọn ngày..."
                    customInput={<CustomDateInput />}
                    isClearable
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><Clock size={14} /> Số ngày dự kiến</label>
                  <input 
                    type="number" 
                    value={editEstimatedDays} 
                    readOnly
                    title="Được tính toán tự động dựa trên ngày bắt đầu và kết thúc"
                    className="w-full text-sm font-bold text-amber-700 border border-amber-200 rounded-lg px-3 py-2 outline-none bg-amber-50 cursor-not-allowed transition-all" 
                  />
                  <span className="text-[10px] text-slate-400 italic mt-0.5">*Hệ thống tự động tính toán</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="bg-white px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50/50">
          <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-bold transition-colors">
            <Trash2 size={16} /> Xóa thẻ này
          </button>
          
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl text-sm font-bold transition-colors">
              Hủy
            </button>
            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95">
              <Save size={16} /> Lưu thay đổi
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TaskDetailModal;