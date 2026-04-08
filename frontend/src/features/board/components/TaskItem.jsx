import React, { useState, memo } from 'react';
import { Trash2, Edit2, Check, X, AlignLeft, Flag, CheckSquare, Square, Plus, Target, Sparkles } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBoardStore } from '../stores/useBoardStore';
import DeleteConfirmModal from './DeleteConfirmModal'; 

const priorityColors = { 
  Low: 'bg-blue-100 text-blue-700', 
  Medium: 'bg-yellow-100 text-yellow-700', 
  High: 'bg-orange-100 text-orange-700', 
  Critical: 'bg-red-100 text-red-700' 
};

const TaskItem = memo(({ task, listId, isOverlay }) => {
  const { updateTask, deleteTask, toggleSubtask, addSubtask } = useBoardStore(); // 👉 Lấy thêm addSubtask
  
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState('Medium');
  const [editTags, setEditTags] = useState('');
  const [editStoryPoints, setEditStoryPoints] = useState(0);
  
  // 👉 ĐÃ XÓA: [editSubtasks, setEditSubtasks] vì không dùng State ảo nữa
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id || task._id, 
    data: { type: 'Task', task, listId }
  });

  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition, 
    opacity: isDragging ? 0.4 : 1 
  };

 const handleOpenEdit = (e) => {
    e.stopPropagation();
    setEditTitle(task.title); 
    setEditDesc(task.description || '');
    setEditPriority(task.priority || 'Medium'); 
    setEditTags(task.tags ? task.tags.join(', ') : '');
    setEditStoryPoints(task.story_points || task.story_point || 0); 
    setIsEditing(true);
  };

  const handleSave = (e) => {
    e?.stopPropagation();
    // 👉 ĐÃ XÓA: Gửi 'subtasks' lên API vì Backend của Mạnh không có trường này
    updateTask(listId, task.id || task._id, { 
      title: editTitle.trim() || 'Task không tên', 
      description: editDesc, 
      priority: editPriority,
      story_points: Number(editStoryPoints),
      tags: editTags.split(',').map(t => t.trim()).filter(Boolean)
    });
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave(e);
    }
  };

  // ==========================================
  // GIAO DIỆN CHỈNH SỬA (EDIT MODE)
  // ==========================================
  if (isEditing) {
    return (
      <div 
        className="bg-white p-4 rounded-xl shadow-lg border-2 border-indigo-400 flex flex-col gap-3 cursor-default z-10 relative animate-in fade-in zoom-in-95 duration-150" 
        onClick={(e)=>e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div>
          <input 
            autoFocus 
            value={editTitle} 
            onChange={(e) => setEditTitle(e.target.value)} 
            placeholder="Nhập tiêu đề task..." 
            className="w-full text-sm font-bold text-slate-800 placeholder:text-slate-400 border-none outline-none focus:ring-0 bg-transparent p-0" 
          />
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 transition-all">
          <textarea 
            value={editDesc} 
            onChange={(e) => setEditDesc(e.target.value)} 
            rows={2} 
            placeholder="Thêm mô tả chi tiết..." 
            className="w-full text-xs text-slate-600 bg-transparent border-none outline-none p-2 resize-none custom-scrollbar" 
          />
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
             <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><Flag size={12} className="text-slate-400" /></div>
            <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg pl-7 pr-2 py-1.5 outline-none font-medium text-slate-700 bg-white hover:border-indigo-300 focus:border-indigo-400 transition-all appearance-none cursor-pointer">
              {Object.keys(priorityColors).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="w-1/3 relative">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><Target size={12} className="text-slate-400" /></div>
            <input type="number" min="0" value={editStoryPoints} onChange={(e) => setEditStoryPoints(e.target.value)} placeholder="Điểm" className="w-full text-xs border border-slate-200 rounded-lg pl-7 pr-2 py-1.5 outline-none font-bold text-blue-600 bg-white hover:border-indigo-300 focus:border-indigo-400 transition-all" />
          </div>
        </div>
        
        <div className="relative">
          <input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="Thêm tags (cách nhau bằng dấu phẩy)..." className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 outline-none text-slate-600 bg-white hover:border-indigo-300 focus:border-indigo-400 transition-all" />
        </div>

        {task.ai_estimation_reason && (
           <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 flex gap-2 items-start">
             <Sparkles size={12} className="text-amber-500 shrink-0 mt-0.5" />
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-amber-700">AI Ước tính: {task.ai_suggested_points} điểm</span>
                <span className="text-[10px] text-amber-600/80 leading-tight">{task.ai_estimation_reason}</span>
             </div>
           </div>
        )}

        {/* 👉 UI SUBTASK REAL-TIME GỌI API THẲNG */}
        <div className="bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <CheckSquare size={12} /> Checklist con
          </span>
          
          <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
            {(task.subtasks || []).map(st => (
              <div key={st.id || st._id} className="flex items-center justify-between group/st bg-slate-50 rounded px-2 py-1 border border-transparent hover:border-slate-200">
                
                <div 
                  className="flex items-center gap-2 cursor-pointer flex-1"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    toggleSubtask(listId, task.id || task._id, st.id || st._id); 
                  }}
                >
                  {st.status === 'DONE' ? <CheckSquare size={13} className="text-emerald-500" /> : <Square size={13} className="text-slate-300" />}
                  <span className={`text-[11px] truncate pr-2 ${st.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>
                    {st.title}
                  </span>
                </div>

                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    deleteTask(listId, st.id || st._id); 
                  }} 
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover/st:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
            <Plus size={14} className="text-indigo-400" />
            <input 
              value={newSubtaskTitle} 
              onChange={e => setNewSubtaskTitle(e.target.value)} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                  e.preventDefault(); 
                  e.stopPropagation();
                  addSubtask(listId, task.id || task._id, newSubtaskTitle);
                  setNewSubtaskTitle('');
                }
              }} 
              placeholder="Gõ & Nhấn Enter để thêm việc..." 
              className="text-[11px] bg-transparent outline-none w-full text-slate-600 font-medium placeholder:font-normal" 
            />
          </div>
        </div>

        <div className="flex justify-between items-center mt-1">
          <span className="text-[9px] text-slate-400 font-medium hidden sm:block">Nhấn <kbd className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">⌘</kbd> + <kbd className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Enter</kbd> để lưu</span>
          <div className="flex gap-2 ml-auto">
            <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); }} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors">Hủy</button>
            <button onClick={handleSave} className="px-4 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95"><Check size={14}/> Lưu thẻ</button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // GIAO DIỆN HIỂN THỊ (VIEW MODE)
  // ==========================================
  return (
    <>
      <div 
        ref={isOverlay ? null : setNodeRef} 
        style={style} 
        {...attributes} 
        {...listeners} 
        className={`group relative flex flex-col bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all ${isOverlay ? 'rotate-3 scale-105 shadow-2xl border-indigo-500 ring-4 ring-indigo-50/80 z-50' : ''}`}
      >
        {task.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {task.tags.map((tag, idx) => <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded">{tag}</span>)}
          </div>
        )}
        
        <h4 className="text-sm font-semibold text-slate-800 break-words pr-8 leading-snug">{task.title}</h4>
        
        {task.description && (
          <div className="mt-2 flex items-start gap-1.5 text-slate-500">
            <AlignLeft size={12} className="shrink-0 mt-0.5 text-slate-400" />
            <p className="text-xs line-clamp-2 leading-relaxed">{task.description}</p>
          </div>
        )}

        {task.subtasks?.length > 0 && (
          <div className="mt-2.5 flex flex-col gap-1 border-t border-slate-100 pt-2 cursor-default">
            {task.subtasks.map(st => (
              <div key={st.id || st._id} onClick={(e) => { e.stopPropagation(); toggleSubtask(listId, task.id || task._id, st.id || st._id); }} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 -mx-1 rounded transition-colors">
                {st.status === 'DONE' ? <CheckSquare size={13} className="text-emerald-500" /> : <Square size={13} className="text-slate-300" />}
                <span className={`text-[11px] ${st.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-600 font-medium'}`}>{st.title}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs font-medium border-t border-slate-100 pt-2.5">
          <div className="flex items-center gap-2">
            {task.priority && <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${priorityColors[task.priority] || priorityColors.Medium}`}><Flag size={10} /> <span className="text-[10px] font-bold uppercase">{task.priority}</span></span>}
          </div>
          {task.story_points > 0 && (
            <span className="min-w-[24px] h-6 px-1.5 flex items-center justify-center rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-extrabold border border-indigo-100 shadow-sm" title="Story Points">
              {task.story_points}
            </span>
          )}
        </div>

        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-lg p-0.5 shadow-sm border border-slate-100">
          <button onClick={handleOpenEdit} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Edit2 size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <DeleteConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => deleteTask(listId, task.id || task._id)}
        taskTitle={task.title}
      />
    </>
  );
});

export default TaskItem;