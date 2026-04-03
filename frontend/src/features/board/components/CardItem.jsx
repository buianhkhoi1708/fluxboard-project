import React, { useState } from 'react';
import { Trash2, Edit2, Check, X, AlignLeft, Flag, CheckSquare, Square, Plus, Target, Sparkles } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBoardStore } from '../stores/useBoardStore';

const priorityColors = { Low: 'bg-blue-100 text-blue-700', Medium: 'bg-yellow-100 text-yellow-700', High: 'bg-orange-100 text-orange-700', Critical: 'bg-red-100 text-red-700' };

const CardItem = ({ card, listId, isOverlay }) => {
  const { updateCard, deleteCard, toggleSubtask } = useBoardStore();
  const [isEditing, setIsEditing] = useState(false);
  
  // Các state lưu trữ tạm thời cho form Edit
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState('Medium');
  const [editTags, setEditTags] = useState('');
  const [editStoryPoints, setEditStoryPoints] = useState(0);
  const [editSubtasks, setEditSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id, data: { type: 'Card', card, listId }
  });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  // 👉 HÀM MỚI: Chỉ nạp data vào state khi bắt đầu bấm nút Edit
  const handleOpenEdit = (e) => {
    e.stopPropagation();
    setEditTitle(card.title); 
    setEditDesc(card.description || '');
    setEditPriority(card.priority || 'Medium'); 
    setEditTags(card.tags ? card.tags.join(', ') : '');
    setEditStoryPoints(card.story_points || 0);
    setEditSubtasks(card.subtasks || []);
    setIsEditing(true);
  };

  const handleSave = (e) => {
    e.stopPropagation();
    updateCard(listId, card.id, { 
      title: editTitle, 
      description: editDesc, 
      priority: editPriority,
      story_points: Number(editStoryPoints),
      tags: editTags.split(',').map(t => t.trim()).filter(Boolean), 
      subtasks: editSubtasks
    });
    setIsEditing(false);
  };

  const handleAddSubtask = (e) => {
    if (e.key === 'Enter' && newSubtaskTitle.trim()) {
      e.preventDefault(); e.stopPropagation();
      setEditSubtasks([...editSubtasks, { id: `st-${Date.now()}`, title: newSubtaskTitle.trim(), is_done: false }]);
      setNewSubtaskTitle('');
    }
  };

  // ==========================================
  // GIAO DIỆN CHỈNH SỬA (EDIT MODE)
  // ==========================================
  if (isEditing) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-indigo-400 flex flex-col gap-3 cursor-default z-10 relative" onClick={(e)=>e.stopPropagation()}>
        
        <div>
          <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Nhập tiêu đề thẻ..." className="w-full text-sm font-bold text-slate-800 placeholder:text-slate-400 border-none outline-none focus:ring-0 bg-transparent p-0" />
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 transition-all">
          <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} placeholder="Thêm mô tả chi tiết..." className="w-full text-xs text-slate-600 bg-transparent border-none outline-none p-2 resize-none custom-scrollbar" />
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

        {card.ai_estimation_reason && (
           <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 flex gap-2 items-start">
             <Sparkles size={12} className="text-amber-500 shrink-0 mt-0.5" />
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-amber-700">AI Ước tính: {card.ai_suggested_points} điểm</span>
                <span className="text-[10px] text-amber-600/80 leading-tight">{card.ai_estimation_reason}</span>
             </div>
           </div>
        )}

        <div className="bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><CheckSquare size={12} /> Checklist con</span>
          <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
            {editSubtasks.map(st => (
              <div key={st.id} className="flex items-center justify-between group/st bg-slate-50 rounded px-2 py-1 border border-transparent hover:border-slate-200">
                <span className={`text-[11px] truncate pr-2 ${st.is_done ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>• {st.title}</span>
                <button onClick={(e) => { e.stopPropagation(); setEditSubtasks(editSubtasks.filter(s => s.id !== st.id)); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover/st:opacity-100 transition-opacity"><X size={12} /></button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
            <Plus size={14} className="text-indigo-400" />
            <input value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)} onKeyDown={handleAddSubtask} placeholder="Gõ & Nhấn Enter để thêm việc..." className="text-[11px] bg-transparent outline-none w-full text-slate-600 font-medium placeholder:font-normal" />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-1">
          <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); }} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors">Hủy bỏ</button>
          <button onClick={handleSave} className="px-4 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95"><Check size={14}/> Lưu thẻ</button>
        </div>
      </div>
    );
  }

  // ==========================================
  // GIAO DIỆN HIỂN THỊ (VIEW MODE) 
  // ==========================================
  return (
    <div ref={isOverlay ? null : setNodeRef} style={style} {...attributes} {...listeners} className={`group relative flex flex-col bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all ${isOverlay ? 'rotate-2 scale-105 shadow-xl border-indigo-400 ring-4 ring-indigo-50' : ''}`}>
      
      {card.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {card.tags.map((tag, idx) => <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded">{tag}</span>)}
        </div>
      )}
      
      <h4 className="text-sm font-semibold text-slate-800 break-words pr-8 leading-snug">{card.title}</h4>
      
      {card.description && (
        <div className="mt-2 flex items-start gap-1.5 text-slate-500">
          <AlignLeft size={12} className="shrink-0 mt-0.5 text-slate-400" />
          <p className="text-xs line-clamp-2 leading-relaxed">{card.description}</p>
        </div>
      )}

      {card.subtasks?.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-1 border-t border-slate-100 pt-2 cursor-default">
          {card.subtasks.map(st => (
            <div key={st.id} onClick={(e) => { e.stopPropagation(); toggleSubtask(listId, card.id, st.id); }} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 -mx-1 rounded transition-colors">
              {st.is_done ? <CheckSquare size={13} className="text-emerald-500" /> : <Square size={13} className="text-slate-300" />}
              <span className={`text-[11px] ${st.is_done ? 'line-through text-slate-400' : 'text-slate-600 font-medium'}`}>{st.title}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs font-medium border-t border-slate-100 pt-2.5">
        <div className="flex items-center gap-2">
          {card.priority && <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${priorityColors[card.priority] || priorityColors.Medium}`}><Flag size={10} /> <span className="text-[10px] font-bold uppercase">{card.priority}</span></span>}
        </div>
        {card.story_points > 0 && (
          <span className="min-w-[24px] h-6 px-1.5 flex items-center justify-center rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-extrabold border border-indigo-100 shadow-sm" title="Story Points">
            {card.story_points}
          </span>
        )}
      </div>

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-lg p-0.5 shadow-sm border border-slate-100">
        {/* 👉 GẮN HÀM MỚI VÀO NÚT EDIT NÀY */}
        <button onClick={handleOpenEdit} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Edit2 size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); if(window.confirm("Xóa thẻ này?")) deleteCard(listId, card.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14} /></button>
      </div>
    </div>
  );
};

export default CardItem;