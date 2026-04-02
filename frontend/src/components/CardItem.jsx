import React, { useState } from 'react';
import { Trash2, FileText, Edit2, Check, X, AlignLeft } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBoardStore } from '../store/useBoardStore';

const CardItem = ({ card, columnId, isOverlay }) => {
  const { deleteTask, updateTask } = useBoardStore();
  
  // Quản lý trạng thái Edit cho cả Tiêu đề lẫn Mô tả
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDesc, setEditDesc] = useState(card.description || '');

  // Hook hỗ trợ kéo thả dnd-kit
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'Task', card, columnId }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  // Hàm Lưu khi sửa xong
  const handleSave = () => {
    if (editTitle.trim()) {
      updateTask(columnId, card.id, { 
        title: editTitle.trim(),
        description: editDesc.trim() 
      });
    }
    setIsEditing(false);
  };

  // -----------------------------------------------------
  // 1. GIAO DIỆN KHI ĐANG CHỈNH SỬA (EDIT MODE)
  // -----------------------------------------------------
  if (isEditing) {
    return (
      <div className="bg-white p-3 rounded-xl shadow-md border border-blue-400 flex flex-col gap-2">
        {/* Ô nhập Tiêu đề */}
        <input 
          autoFocus 
          value={editTitle} 
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Tiêu đề công việc..."
          className="text-sm font-medium border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-500" 
        />
        
        {/* Ô nhập Mô tả công việc */}
        <textarea 
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          placeholder="Thêm mô tả chi tiết..."
          rows={2}
          className="text-xs text-slate-600 border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-500 resize-none custom-scrollbar"
        />

        {/* Nút Hủy / Lưu */}
        <div className="flex justify-end gap-2 mt-1">
          <button 
            onPointerDown={() => {
              setIsEditing(false);
              setEditTitle(card.title); // Trả lại tên cũ nếu hủy
              setEditDesc(card.description || ''); 
            }} 
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded flex items-center gap-1 text-xs font-medium"
          >
            <X size={14}/> Hủy
          </button>
          <button 
            onPointerDown={handleSave} 
            className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center gap-1 text-xs font-medium"
          >
            <Check size={14}/> Lưu
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------
  // 2. GIAO DIỆN HIỂN THỊ BÌNH THƯỜNG (DISPLAY MODE)
  // -----------------------------------------------------
  return (
    <div 
      ref={isOverlay ? null : setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={`group relative flex flex-col bg-white p-3.5 rounded-xl shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md transition-all ${isOverlay ? 'rotate-2 scale-105 shadow-xl border-blue-400' : ''}`}
    >
      {/* Tiêu đề thẻ */}
      <h4 className="text-sm font-semibold text-slate-800 break-words pr-8 leading-snug">
        {card.title}
      </h4>
      
      {/* Mô tả thẻ (Hiện ở dưới tiêu đề) */}
      {card.description && (
        <div className="mt-2 flex items-start gap-1.5 text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
          <AlignLeft size={14} className="shrink-0 mt-0.5 text-slate-400" />
          {/* line-clamp-3: Nếu mô tả quá dài sẽ tự động cắt ngắn bằng dấu ... ở dòng thứ 3 */}
          <p className="text-xs leading-relaxed line-clamp-3 break-words">
            {card.description}
          </p>
        </div>
      )}

      {/* Nút thao tác ẩn (Góc phải trên cùng) */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-md p-0.5 shadow-sm border border-gray-100">
        <button 
          onPointerDown={(e) => { e.stopPropagation(); setIsEditing(true); }} 
          className="p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded"
          title="Sửa công việc"
        >
          <Edit2 size={14} />
        </button>
        <button 
          onPointerDown={(e) => { e.stopPropagation(); deleteTask(columnId, card.id); }} 
          className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded"
          title="Xóa công việc"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default CardItem;