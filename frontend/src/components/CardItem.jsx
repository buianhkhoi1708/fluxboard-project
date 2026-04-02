import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Check, X, AlignLeft, Flag, CheckSquare, Square, Plus } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBoardStore } from '../store/useBoardStore';

const priorityColors = { Low: 'bg-blue-100 text-blue-700', Medium: 'bg-yellow-100 text-yellow-700', High: 'bg-orange-100 text-orange-700', Critical: 'bg-red-100 text-red-700' };

const CardItem = ({ card, listId, isOverlay }) => {
  const { updateCard, deleteCard, toggleSubtask } = useBoardStore();
  const [isEditing, setIsEditing] = useState(false);
  
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDesc, setEditDesc] = useState(card.description || '');
  const [editPriority, setEditPriority] = useState(card.priority || 'Medium');
  const [editTags, setEditTags] = useState(card.tags ? card.tags.join(', ') : '');
  const [editSubtasks, setEditSubtasks] = useState(card.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Reset form nếu đổi card
  useEffect(() => {
    if (!isEditing) {
      setEditTitle(card.title); setEditDesc(card.description || '');
      setEditPriority(card.priority || 'Medium'); setEditTags(card.tags ? card.tags.join(', ') : '');
      setEditSubtasks(card.subtasks || []);
    }
  }, [card, isEditing]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id, data: { type: 'Card', card, listId }
  });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const handleSave = (e) => {
    e.stopPropagation();
    updateCard(listId, card.id, { 
      title: editTitle, description: editDesc, priority: editPriority,
      tags: editTags.split(',').map(t => t.trim()).filter(Boolean), subtasks: editSubtasks
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

  if (isEditing) {
    return (
      <div className="bg-white p-3 rounded-xl shadow-md border border-blue-400 flex flex-col gap-2 cursor-default z-10" onClick={(e)=>e.stopPropagation()}>
        <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Tiêu đề..." className="text-sm font-bold border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500" />
        <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} placeholder="Mô tả..." className="text-xs text-slate-600 border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500 resize-none" />
        <div className="flex gap-2">
          <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} className="text-xs border border-gray-200 rounded px-1 py-1 w-2/5 outline-none font-medium">
            {Object.keys(priorityColors).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="Tags (VD: UI, Bug)" className="text-xs border border-gray-200 rounded px-2 py-1 w-3/5 outline-none" />
        </div>
        <div className="mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Checklist công việc</span>
          {editSubtasks.map(st => (
            <div key={st.id} className="flex items-center justify-between group/st">
              <span className={`text-[11px] truncate pr-2 ${st.is_done ? 'line-through text-slate-400' : 'text-slate-700'}`}>• {st.title}</span>
              <button onClick={(e) => { e.stopPropagation(); setEditSubtasks(editSubtasks.filter(s => s.id !== st.id)); }} className="text-slate-300 hover:text-red-500"><X size={12} /></button>
            </div>
          ))}
          <div className="flex items-center gap-1 mt-1">
            <Plus size={12} className="text-slate-400" />
            <input value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)} onKeyDown={handleAddSubtask} placeholder="Nhập & nhấn Enter để thêm..." className="text-[11px] bg-transparent outline-none w-full text-slate-600" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); }} className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded text-xs font-medium">Hủy</button>
          <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center gap-1 text-xs font-medium"><Check size={14}/> Lưu thẻ</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={isOverlay ? null : setNodeRef} style={style} {...attributes} {...listeners} className={`group relative flex flex-col bg-white p-3.5 rounded-xl shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md transition-all ${isOverlay ? 'rotate-2 scale-105 shadow-xl border-blue-400' : ''}`}>
      {card.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {card.tags.map((tag, idx) => <span key={idx} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded">{tag}</span>)}
        </div>
      )}
      <h4 className="text-sm font-semibold text-slate-800 break-words pr-8">{card.title}</h4>
      {card.description && (
        <div className="mt-1.5 flex items-start gap-1.5 text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
          <AlignLeft size={12} className="shrink-0 mt-0.5" />
          <p className="text-xs line-clamp-2 leading-relaxed">{card.description}</p>
        </div>
      )}
      {card.subtasks?.length > 0 && (
        <div className="mt-2 flex flex-col gap-1 border-t border-gray-50 pt-2 cursor-default">
          {card.subtasks.map(st => (
            <div key={st.id} onClick={(e) => { e.stopPropagation(); toggleSubtask(listId, card.id, st.id); }} className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 p-1 rounded">
              {st.is_done ? <CheckSquare size={12} className="text-green-500" /> : <Square size={12} className="text-slate-300" />}
              <span className={`text-[11px] ${st.is_done ? 'line-through text-slate-400' : 'text-slate-600'}`}>{st.title}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2.5 flex items-center justify-between text-xs font-medium border-t border-gray-50 pt-2">
        <div className="flex items-center gap-2">
          {card.priority && <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${priorityColors[card.priority] || priorityColors.Medium}`}><Flag size={10} /> <span className="text-[10px]">{card.priority}</span></span>}
        </div>
        {card.story_points > 0 && <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">{card.story_points}</span>}
      </div>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-md p-0.5 shadow-sm">
        <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); if(window.confirm("Xóa thẻ này?")) deleteCard(listId, card.id); }} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
      </div>
    </div>
  );
};

export default CardItem;