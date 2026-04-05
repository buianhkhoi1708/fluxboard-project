import React, { useState, memo } from 'react';
import { MoreHorizontal, Plus, X, Trash2, Flag, Target, User, Tag } from 'lucide-react';
import CardItem from './CardItem';
import { useBoardStore } from '../stores/useBoardStore';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// 👉 TỐI ƯU 1: Bọc React.memo để chống re-render vô ích toàn bộ các cột
const Column = memo(({ list }) => {
  const { getColumnTotalPoints, addCard, deleteList } = useBoardStore();
  
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newAssignee, setNewAssignee] = useState('');
  const [newPoints, setNewPoints] = useState('');
  const [newTags, setNewTags] = useState('');

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const totalPoints = getColumnTotalPoints ? getColumnTotalPoints(list.id) : 0;
  const cards = list.cards || [];

  const { setNodeRef } = useDroppable({
    id: list.id,
    data: { type: 'List', listId: list.id }
  });

  const handleAddCardClick = () => {
    if (newTitle.trim()) {
      addCard(list.id, {
        title: newTitle.trim(),
        description: newDesc.trim(),
        priority: newPriority,
        assignee: newAssignee.trim(),
        story_points: newPoints,
        tags: newTags
      });

      setNewTitle(''); setNewDesc(''); setNewAssignee(''); 
      setNewPoints(''); setNewTags(''); setNewPriority('Medium');
      setIsAdding(false);
    }
  };

  return (
    // 👉 TỐI ƯU 2: Giao diện Glassmorphism (Kính mờ) viền nổi
    <div className="w-[300px] shrink-0 flex flex-col bg-slate-100/80 backdrop-blur-md rounded-2xl max-h-full relative border border-white/60 shadow-sm">
      {isMenuOpen && <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>}
      
      {/* HEADER CỦA CỘT */}
      <div className="flex justify-between items-start p-3.5 pb-2 cursor-grab active:cursor-grabbing">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">{list.list_name}</h3>
            <span className="px-2 py-0.5 text-[11px] font-bold text-slate-600 bg-white shadow-sm rounded-full border border-slate-200/60">
              {cards.length}
            </span>
          </div>
          {totalPoints > 0 && (
            <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50/50 w-max px-1.5 py-0.5 rounded-md border border-indigo-100">
              {totalPoints} pts
            </span>
          )}
        </div>
        
        {/* NÚT TÙY CHỌN (OPTIONS) */}
        <div className="relative z-20">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors">
            <MoreHorizontal size={18} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-8 w-44 bg-white/90 backdrop-blur-xl rounded-xl shadow-xl border border-slate-100 py-1 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
              <button onClick={() => { if(window.confirm(`Xóa danh sách "${list.list_name}"?`)) deleteList(list.id); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors">
                <Trash2 size={14} /> Xóa danh sách
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VÙNG THẢ THẺ (DRAG & DROP AREA) */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto flex flex-col gap-2.5 px-2 pb-2 custom-scrollbar min-h-[50px]">
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => <CardItem key={card.id} card={card} listId={list.id} />)}
        </SortableContext>
      </div>

      {/* TỐI ƯU 3: FORM THÊM THẺ MỞ RỘNG (SANG TRỌNG) */}
      <div className="p-2 pt-0">
        {isAdding ? (
          <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 relative z-10">
            <input 
              autoFocus 
              value={newTitle} 
              onChange={e => setNewTitle(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddCardClick()} 
              placeholder="Tên thẻ mới..." 
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
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><User size={12} className="text-slate-400" /></div>
                <input value={newAssignee} onChange={e => setNewAssignee(e.target.value)} placeholder="Giao cho..." className="text-xs border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 outline-none w-full focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all" />
              </div>
              <div className="relative w-1/3">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><Target size={12} className="text-slate-400" /></div>
                <input type="number" min="0" value={newPoints} onChange={e => setNewPoints(e.target.value)} placeholder="Điểm" className="text-xs font-bold text-indigo-600 border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 outline-none w-full focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all" />
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><Flag size={12} className="text-slate-400" /></div>
                <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="text-xs border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 outline-none w-full font-medium focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 appearance-none bg-white transition-all">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="relative flex-[1.5]">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><Tag size={12} className="text-slate-400" /></div>
                <input value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="VD: Bug, UI, API..." className="text-xs border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 outline-none w-full focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all" />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-100">
              <button onClick={handleAddCardClick} className="flex-1 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-all active:scale-95">Tạo thẻ</button>
              <button onClick={() => { setIsAdding(false); setNewTitle(''); setNewDesc(''); }} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg text-xs font-semibold transition-colors">Hủy</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)} className="group w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-200/50 hover:text-indigo-600 rounded-xl transition-all">
            <Plus size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" /> 
            <span>Thêm thẻ mới</span>
          </button>
        )}
      </div>
    </div>
  );
});

export default Column;