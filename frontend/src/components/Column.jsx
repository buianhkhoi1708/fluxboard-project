import React, { useState } from 'react';
import { MoreHorizontal, Plus, X, Trash2 } from 'lucide-react';
import CardItem from './CardItem';
import { useBoardStore } from '../store/useBoardStore';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const Column = ({ list }) => {
  const { board, setBoard, getColumnTotalPoints } = useBoardStore();
  
  // Trạng thái form thêm thẻ
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const totalPoints = getColumnTotalPoints ? getColumnTotalPoints(list.id) : 0;

  const { setNodeRef } = useDroppable({
    id: list.id,
    data: { type: 'List', listId: list.id }
  });

  // --- LOGIC THÊM THẺ MỚI CHUẨN TYPESCRIPT ---
  const handleAddCard = () => {
    if (newTitle.trim()) {
      // Khởi tạo thẻ mới đầy đủ các trường của ICard
      const newCard = {
        id: `card-${Date.now()}`,
        title: newTitle.trim(),
        description: newDesc.trim(),
        assignee: "",
        priority: "Medium",
        start_date: new Date().toISOString().split('T')[0],
        due_date: null,
        estimated_days: 0,
        story_points: 0,
        ai_suggested_points: 0,
        ai_estimation_reason: "",
        tags: [],
        subtasks: []
      };
      
      // Chèn thẻ mới vào list tương ứng
      const updatedLists = board.lists.map(l => {
        if (l.id === list.id) {
          return { ...l, cards: [...(l.cards || []), newCard] };
        }
        return l;
      });

      // Nạp lại Bảng
      setBoard({ ...board, lists: updatedLists });
      
      // Reset Form
      setNewTitle(''); 
      setNewDesc(''); 
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddCard();
    }
  };

  const deleteList = () => {
    setBoard({ ...board, lists: board.lists.filter(l => l.id !== list.id) });
  };

  return (
    <div className="w-[300px] shrink-0 flex flex-col bg-[#f1f2f4] rounded-2xl max-h-full relative">
      {isMenuOpen && <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>}

      {/* Header Danh sách */}
      <div className="flex justify-between items-center p-3 pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">{list.list_name}</span>
            <span className="px-2 py-0.5 text-xs font-medium text-slate-600 bg-slate-200/60 rounded-full">{list.cards?.length || 0}</span>
          </div>
          {totalPoints > 0 && <span className="text-[10px] text-slate-400 font-medium ml-1">Tổng điểm: {totalPoints} pt</span>}
        </div>
        
        <div className="relative z-20">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-md transition-colors">
            <MoreHorizontal size={16} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-8 w-44 bg-white rounded-lg shadow-xl border border-gray-100 py-1 overflow-hidden">
              <button onClick={() => { if(window.confirm(`Xóa danh sách "${list.list_name}"?`)) deleteList(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors">
                <Trash2 size={14} /> Xóa danh sách
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Vùng chứa Thẻ */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto flex flex-col gap-2 px-2 pb-2 custom-scrollbar min-h-[50px]">
        <SortableContext items={(list.cards || []).map(c => c.id)} strategy={verticalListSortingStrategy}>
          {(list.cards || []).map((card) => (
            <CardItem key={card.id} card={card} listId={list.id} />
          ))}
        </SortableContext>
      </div>

      {/* KHUNG THÊM THẺ MỚI */}
      <div className="p-2 pt-0">
        {isAdding ? (
          <div className="bg-white p-2.5 rounded-xl shadow-sm border border-blue-400 flex flex-col gap-2">
            <input 
              autoFocus 
              value={newTitle} 
              onChange={e => setNewTitle(e.target.value)} 
              onKeyDown={handleKeyDown} 
              placeholder="Tiêu đề thẻ..." 
              className="text-sm font-medium border border-gray-200 rounded px-2 py-1.5 outline-none w-full focus:border-blue-500" 
            />
            <textarea 
              value={newDesc} 
              onChange={e => setNewDesc(e.target.value)} 
              onKeyDown={handleKeyDown} 
              placeholder="Mô tả chi tiết (tùy chọn)..." 
              rows={2} 
              className="text-xs text-slate-600 border border-gray-200 rounded px-2 py-1.5 outline-none w-full focus:border-blue-500 resize-none custom-scrollbar" 
            />
            <div className="flex items-center gap-2 mt-1">
              <button onClick={handleAddCard} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 shadow-sm">
                Thêm thẻ
              </button>
              <button onClick={() => { setIsAdding(false); setNewTitle(''); setNewDesc(''); }} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">
                <X size={16}/>
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-800 rounded-lg transition-colors">
            <Plus size={16} /> Thêm thẻ
          </button>
        )}
      </div>
    </div>
  );
};

export default Column;