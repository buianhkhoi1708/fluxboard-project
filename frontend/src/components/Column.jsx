import React, { useState } from 'react';
import { MoreHorizontal, Plus, X, Trash2 } from 'lucide-react'; // Nhớ import Trash2
import CardItem from './CardItem';
import { useBoardStore } from '../store/useBoardStore';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const Column = ({ column }) => {
  // Lấy thêm hàm deleteColumn từ store
  const { addTask, deleteColumn } = useBoardStore();
  
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  
  // State quản lý việc mở/tắt menu 3 chấm
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { type: 'Column', columnId: column.id }
  });

  const handleAdd = () => {
    if (newTitle.trim()) {
      addTask(column.id, newTitle.trim(), newDesc.trim());
      setNewTitle('');
      setNewDesc('');
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="w-[300px] shrink-0 flex flex-col bg-[#f1f2f4] rounded-2xl max-h-full relative">
      {/* Màng chắn trong suốt để bắt sự kiện click ra ngoài menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
      )}

      {/* Header Cột */}
      <div className="flex justify-between items-center p-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{column.icon} {column.title}</span>
          <span className="px-2 py-0.5 text-xs font-medium text-slate-600 bg-slate-200/60 rounded-full">{column.tasks?.length || 0}</span>
        </div>
        
        {/* NÚT 3 CHẤM VÀ POP-UP MENU */}
        <div className="relative z-20">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-md transition-colors"
          >
            <MoreHorizontal size={16} />
          </button>
          
          {/* Menu thả xuống */}
          {isMenuOpen && (
            <div className="absolute right-0 top-8 w-44 bg-white rounded-lg shadow-xl border border-gray-100 py-1 overflow-hidden">
              <button 
                onClick={() => {
                  if(window.confirm(`Bạn có chắc muốn xóa danh sách "${column.title}"?`)) {
                    deleteColumn(column.id);
                  }
                  setIsMenuOpen(false);
                }} 
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <Trash2 size={14} /> Xóa danh sách
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Danh sách Thẻ */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto flex flex-col gap-2 px-2 pb-2 custom-scrollbar min-h-[50px]">
        <SortableContext items={column.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {column.tasks?.map((task) => (
            <CardItem key={task.id} card={task} columnId={column.id} />
          ))}
        </SortableContext>
      </div>

      {/* Vùng Thêm thẻ (Giữ nguyên như cũ) */}
      <div className="p-2 pt-0">
        {isAdding ? (
          <div className="bg-white p-2.5 rounded-xl shadow-sm border border-blue-400 flex flex-col gap-2">
            <input 
              autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Nhập tiêu đề thẻ..." className="text-sm font-medium border border-gray-200 rounded px-2 py-1.5 outline-none w-full focus:border-blue-500" 
            />
            <textarea 
              value={newDesc} onChange={e => setNewDesc(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Mô tả chi tiết (tùy chọn)..." rows={2}
              className="text-xs text-slate-600 border border-gray-200 rounded px-2 py-1.5 outline-none w-full focus:border-blue-500 resize-none custom-scrollbar"
            />
            <div className="flex items-center gap-2 mt-1">
              <button onClick={handleAdd} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">Thêm thẻ</button>
              <button onClick={() => {setIsAdding(false); setNewTitle(''); setNewDesc('');}} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg"><X size={16}/></button>
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