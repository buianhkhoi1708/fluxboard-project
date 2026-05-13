import React, { useState, memo } from 'react';
import { useParams } from 'react-router-dom';
import { MoreHorizontal, Plus, Trash2, Flag, Target, User, Calendar, Clock, Check } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import TaskItem from './TaskItem';

// 🚀 Tầng Data: Nhập Hooks TanStack Query
import { useBoardData, useProjectMembersSync, useCreateTask, useDeleteColumn } from '../hooks/useBoardQueries';
import { useBoardCalculations } from '../hooks/useBoardCalculations';

// 🚀 IMPORT TYPES
import { Column as ColumnType } from '../types/board.types';

interface ColumnProps {
  list: ColumnType;
}

const Column: React.FC<ColumnProps> = memo(({ list }) => {
  // 1. Lấy Board ID từ URL để truyền cho các hooks
  const { id } = useParams<{ id: string }>();
  const boardId = id || '69d22692ef24ae604f65ae89'; 

  // 2. Sử dụng TanStack Query thay cho Zustand
  const { data: board } = useBoardData(boardId);
  const projectId = board?.projectId || (board as any)?.project_id;
  
  const { data: projectMembers = [] } = useProjectMembersSync(projectId);
  const { mutate: addTask } = useCreateTask(boardId);
  const { mutate: deleteColumn } = useDeleteColumn(boardId);
  
  const { columnPoints } = useBoardCalculations(board);

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<string>('Medium');
  const [newPoints, setNewPoints] = useState<string | number>('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newEstimatedDays, setNewEstimatedDays] = useState<string | number>('');
  const [newAssignees, setNewAssignees] = useState<string[]>([]);
  
  // UI States (Cái này giữ nguyên ở Local State vì nó thuần túy UI)
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const listId: string = list.id || (list as any)._id || '';
  
  // Lấy tổng điểm từ logic tính toán tập trung
  const totalPoints = columnPoints[listId] || 0;
  const tasks = list.tasks || [];

  const { setNodeRef } = useDroppable({
    id: listId,
    data: { type: 'List', listId: listId }
  });

  const handleToggleAssignee = (userId: string) => {
    setNewAssignees(prev => 
      prev.includes(userId) ? prev.filter(uid => uid !== userId) : [...prev, userId]
    );
  };

  const handleAddTaskClick = () => {
    if (newTitle.trim() && listId !== '') {
      // Gọi API thông qua Hook Mutation
      addTask({
        title: newTitle,
        description: newDesc,
        column_id: listId, // Đảm bảo đúng chuẩn snake_case của backend
        priority: newPriority.toUpperCase(),
        story_point: Number(newPoints) || 0,
        start_date: newStartDate || null,
        due_date: newDueDate || null,
        estimated_days: Number(newEstimatedDays) || null,
        assignees_user_id: newAssignees 
      });

      // Reset form sau khi gọi API
      setIsAdding(false);
      setNewTitle('');
      setNewDesc('');
      setNewStartDate('');
      setNewDueDate('');
      setNewPoints('');
      setNewEstimatedDays('');
      setNewAssignees([]);
    }
  };

  const handleDeleteColumnClick = () => {
    const listName = (list as any).list_name || list.title || 'Cột này';
    if(window.confirm(`Xóa danh sách "${listName}"? Toàn bộ task bên trong sẽ bị xóa!`)) {
      deleteColumn(listId);
    }
    setIsMenuOpen(false); 
  };

  const taskIds: string[] = tasks.map(t => t.id || (t as any)._id || '');

  return (
    <div className="w-[85vw] max-w-[300px] sm:w-[300px] shrink-0 flex flex-col bg-slate-100/80 backdrop-blur-md rounded-2xl max-h-full relative border border-white/60 shadow-sm">
      {isMenuOpen && <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>}
      
      <div className="flex justify-between items-start p-3.5 pb-2 cursor-grab active:cursor-grabbing">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              {(list as any).list_name || list.title || 'Untitled Column'}
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-bold text-slate-600 bg-white shadow-sm rounded-full border border-slate-200/60">
              {tasks.length}
            </span>
          </div>
          {totalPoints > 0 && (
            <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50/50 w-max px-1.5 py-0.5 rounded-md border border-indigo-100">
              {totalPoints} pts
            </span>
          )}
        </div>
        
        <div className="relative z-20">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors">
            <MoreHorizontal size={18} />
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 top-8 w-44 bg-white/90 backdrop-blur-xl rounded-xl shadow-xl border border-slate-100 py-1 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
              <button 
                onClick={handleDeleteColumnClick} 
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
              >
                <Trash2 size={14} /> Xóa danh sách
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={setNodeRef} className="flex-1 overflow-y-auto flex flex-col gap-2.5 px-2 pb-2 custom-scrollbar min-h-[50px]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => <TaskItem key={task.id || (task as any)._id} task={task} listId={listId} />)}
        </SortableContext>
      </div>

      <div className="p-2 pt-0">
        {isAdding ? (
          <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 relative z-10">
            <input 
              autoFocus 
              value={newTitle} 
              onChange={e => setNewTitle(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddTaskClick()} 
              placeholder="Tên task mới..." 
              className="text-sm font-bold bg-transparent border-none p-1 outline-none w-full text-slate-800 placeholder:text-slate-400 focus:ring-0" 
            />
            
            <div className="bg-slate-50 border border-slate-200 rounded-lg focus-within:ring-1 focus-within:ring-indigo-400 focus-within:border-indigo-400 transition-all p-1">
              <textarea 
                value={newDesc} 
                onChange={e => setNewDesc(e.target.value)} 
                placeholder="Mô tả chi tiết..." 
                rows={2} 
                className="text-xs text-slate-600 bg-transparent border-none outline-none w-full p-1 resize-none custom-scrollbar" 
              />
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsAssigneeOpen(!isAssigneeOpen)}
                className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 w-full"
              >
                <User size={12} className="text-indigo-500" />
                {newAssignees.length === 0 ? "Gán thành viên" : `Đã chọn ${newAssignees.length} người`}
              </button>
              
              {isAssigneeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsAssigneeOpen(false)}></div>
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg z-50 p-1 max-h-40 overflow-y-auto custom-scrollbar">
                    {projectMembers.map((member: any) => (
                      <div 
                        key={member.id} 
                        onClick={() => handleToggleAssignee(member.id)}
                        className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <img src={member.avatar_url || '/default-avatar.png'} alt="avatar" className="w-5 h-5 rounded-full object-cover" />
                          <span className="text-xs text-slate-700">{member.full_name || member.username}</span>
                        </div>
                        {newAssignees.includes(member.id) && <Check size={14} className="text-indigo-600" />}
                      </div>
                    ))}
                    {projectMembers.length === 0 && <div className="text-xs text-center text-slate-400 p-2">Chưa có thành viên</div>}
                  </div>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><Calendar size={12} className="text-slate-400" /></div>
                <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} title="Start Date" className="text-[11px] border border-slate-200 rounded-lg pl-7 pr-1 py-1.5 outline-none w-full text-slate-600 focus:border-indigo-400 transition-all" />
              </div>
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><Calendar size={12} className="text-slate-400" /></div>
                <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} title="Due Date" className="text-[11px] border border-slate-200 rounded-lg pl-7 pr-1 py-1.5 outline-none w-full text-slate-600 focus:border-indigo-400 transition-all" />
              </div>
            </div>

            <div className="flex gap-2 items-center">
               <div className="relative flex-[1.5]">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><Flag size={12} className="text-slate-400" /></div>
                <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="text-xs border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 outline-none w-full font-medium focus:border-indigo-400 appearance-none bg-white transition-all">
                  <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option>
                </select>
              </div>
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><Target size={12} className="text-slate-400" /></div>
                <input type="number" min="0" value={newPoints} onChange={e => setNewPoints(e.target.value)} placeholder="Pts" className="text-xs font-bold text-indigo-600 border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 outline-none w-full focus:border-indigo-400 transition-all" />
              </div>
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><Clock size={12} className="text-slate-400" /></div>
                <input type="number" min="0" value={newEstimatedDays} onChange={e => setNewEstimatedDays(e.target.value)} placeholder="Days" title="Estimated Days" className="text-xs font-bold text-amber-600 border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 outline-none w-full focus:border-indigo-400 transition-all" />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-100">
              <button onClick={handleAddTaskClick} className="flex-1 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-all active:scale-95">Tạo Task</button>
              <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors">Hủy</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)} className="group w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-200/50 hover:text-indigo-600 rounded-xl transition-all">
            <Plus size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" /> <span>Thêm Task mới</span>
          </button>
        )}
      </div>
    </div>
  );
});

export default Column;