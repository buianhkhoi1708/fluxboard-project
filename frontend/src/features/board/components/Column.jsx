import React, { useState } from 'react';
import { MoreHorizontal, Plus, X, Trash2 } from 'lucide-react';
import CardItem from './CardItem';
import { useBoardStore } from '../stores/useBoardStore';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const Column = ({ list }) => {
  const { getColumnTotalPoints, addCard, deleteList } = useBoardStore();
  
  // State quản lý form thêm thẻ (Mở rộng thêm nhiều trường)
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
      // Gửi nguyên 1 cục Object chứa đủ các trường lên Store
      addCard(list.id, {
        title: newTitle.trim(),
        description: newDesc.trim(),
        priority: newPriority,
        assignee: newAssignee.trim(),
        story_points: newPoints,
        tags: newTags
      });

      // Reset form sau khi thêm xong
      setNewTitle(''); setNewDesc(''); setNewAssignee(''); 
      setNewPoints(''); setNewTags(''); setNewPriority('Medium');
      setIsAdding(false);
    }
  };

  return (
    <div className="w-[300px] shrink-0 flex flex-col bg-[#f1f2f4] rounded-2xl max-h-full relative">
      {isMenuOpen && <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>}
      
      {/* Header Column */}
      <div className="flex justify-between items-center p-3 pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">{list.list_name}</span>
            <span className="px-2 py-0.5 text-xs font-medium text-slate-600 bg-slate-200/60 rounded-full">{cards.length}</span>
          </div>
          {totalPoints > 0 && <span className="text-[10px] text-slate-400 font-medium ml-1">Tổng điểm: {totalPoints} pt</span>}
        </div>
        <div className="relative z-20">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-md">
            <MoreHorizontal size={16} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-8 w-44 bg-white rounded-lg shadow-xl border border-gray-100 py-1 overflow-hidden z-50">
              <button onClick={() => { if(window.confirm(`Xóa danh sách "${list.list_name}"?`)) deleteList(list.id); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                <Trash2 size={14} /> Xóa danh sách
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Vùng thả thẻ */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto flex flex-col gap-2 px-2 pb-2 custom-scrollbar min-h-[50px]">
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => <CardItem key={card.id} card={card} listId={list.id} />)}
        </SortableContext>
      </div>

      {/* FORM THÊM THẺ MỞ RỘNG */}
      <div className="p-2 pt-0">
        {isAdding ? (
          <div className="bg-white p-2.5 rounded-xl shadow-sm border border-blue-400 flex flex-col gap-2">
            <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddCardClick()} placeholder="Tiêu đề thẻ (*)..." className="text-sm font-bold border border-gray-200 rounded px-2 py-1.5 outline-none w-full focus:border-blue-500" />
            
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Mô tả chi tiết..." rows={2} className="text-xs text-slate-600 border border-gray-200 rounded px-2 py-1.5 outline-none w-full focus:border-blue-500 resize-none" />
            
            {/* Nhập Assignee và Điểm */}
            <div className="flex gap-2">
              <input value={newAssignee} onChange={e => setNewAssignee(e.target.value)} placeholder="Người làm..." className="text-xs border border-gray-200 rounded px-2 py-1.5 outline-none w-1/2 focus:border-blue-500" />
              <input type="number" value={newPoints} onChange={e => setNewPoints(e.target.value)} placeholder="Điểm (pt)" className="text-xs border border-gray-200 rounded px-2 py-1.5 outline-none w-1/2 focus:border-blue-500" />
            </div>

            {/* Nhập Priority và Tags */}
            <div className="flex gap-2">
              <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="text-xs border border-gray-200 rounded px-1 py-1 w-2/5 outline-none font-medium focus:border-blue-500">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
              <input value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="Tags (Cắt nhau bởi dấu phẩy)" className="text-xs border border-gray-200 rounded px-2 py-1.5 outline-none w-3/5 focus:border-blue-500" />
            </div>

            {/* Nút hành động */}
            <div className="flex items-center gap-2 mt-1">
              <button onClick={handleAddCardClick} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 w-full text-center flex justify-center">Tạo thẻ mới</button>
              <button onClick={() => { setIsAdding(false); setNewTitle(''); setNewDesc(''); }} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg shrink-0"><X size={16}/></button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-800 rounded-lg"><Plus size={16} /> Thêm thẻ</button>
        )}
      </div>
    </div>
  );
};

export default Column;