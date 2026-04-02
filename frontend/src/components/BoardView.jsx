import React, { useState } from 'react';
import Column from './Column';
import CardItem from './CardItem';
import { useBoardStore } from '../store/useBoardStore'; 
import { DndContext, closestCenter, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { X } from 'lucide-react'; 

const BoardView = () => {
  // GỌI HÀM addColumn TỪ STORE
  const { columns, setColumns, addColumn } = useBoardStore();
  const [activeCard, setActiveCard] = useState(null);
  
  // Trạng thái bật/tắt form thêm danh sách mới
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (e) => {
    if (e.active.data.current?.type === 'Task') {
      setActiveCard(e.active.data.current.card);
    }
  };

  const handleDragEnd = (e) => {
    setActiveCard(null);
    const { active, over } = e;
    if (!over) return;

    const activeColumnId = active.data.current?.columnId;
    const overColumnId = over.data.current?.columnId || over.id;

    if (activeColumnId === overColumnId) {
      const colIndex = columns.findIndex(col => col.id === activeColumnId);
      const oldIndex = columns[colIndex].tasks.findIndex(t => t.id === active.id);
      const newIndex = columns[colIndex].tasks.findIndex(t => t.id === over.id);
      const newTasks = arrayMove(columns[colIndex].tasks, oldIndex, newIndex);
      setColumns(columns.map(col => col.id === activeColumnId ? { ...col, tasks: newTasks } : col));
    } else {
      const sourceCol = columns.find(col => col.id === activeColumnId);
      const destCol = columns.find(col => col.id === overColumnId);
      const activeTask = sourceCol.tasks.find(t => t.id === active.id);
      const newSourceTasks = sourceCol.tasks.filter(t => t.id !== active.id);
      let newDestTasks = [...destCol.tasks];

      if (over.data.current?.type === 'Task') {
        const newIndex = destCol.tasks.findIndex(t => t.id === over.id);
        newDestTasks.splice(newIndex, 0, activeTask);
      } else {
        newDestTasks.push(activeTask);
      }
      setColumns(columns.map(col => {
        if (col.id === activeColumnId) return { ...col, tasks: newSourceTasks };
        if (col.id === overColumnId) return { ...col, tasks: newDestTasks };
        return col;
      }));
    }
  };

  // HÀM XỬ LÝ THÊM DANH SÁCH MỚI
  const handleAddColumn = () => {
    if (newColTitle.trim()) {
      addColumn(newColTitle); // Đẩy dữ liệu vào Store
      setNewColTitle('');     // Xóa trắng ô input
      setIsAddingCol(false);  // Đóng form
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 w-full h-full p-4 overflow-x-auto flex flex-nowrap gap-4 items-start bg-blue-600 custom-scrollbar">
        
        {/* Lặp qua để render các Cột hiện tại */}
        {columns?.map((column) => (
          <Column key={column.id} column={column} />
        ))}
        
        {/* NÚT / FORM THÊM DANH SÁCH KHÁC (CỘT MỚI) */}
        {isAddingCol ? (
          <div className="w-[300px] shrink-0 bg-white p-3 rounded-2xl shadow-sm flex flex-col gap-2">
            <input 
              autoFocus 
              value={newColTitle} 
              onChange={e => setNewColTitle(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleAddColumn()}
              placeholder="Nhập tiêu đề danh sách..." 
              className="text-sm font-medium border border-gray-200 rounded px-2 py-2 outline-none w-full focus:border-blue-500" 
            />
            <div className="flex items-center gap-2 mt-1">
              <button 
                onClick={handleAddColumn} 
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
              >
                Thêm danh sách
              </button>
              <button 
                onClick={() => {setIsAddingCol(false); setNewColTitle('');}} 
                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg"
              >
                <X size={16}/>
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsAddingCol(true)} 
            className="w-[300px] shrink-0 flex items-center gap-2 px-4 py-3 bg-white/20 hover:bg-white/30 border border-transparent rounded-2xl text-white font-medium transition-all"
          >
            <span className="text-xl">+</span> Thêm danh sách khác
          </button>
        )}
      </div>

      <DragOverlay>
        {activeCard ? <CardItem card={activeCard} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default BoardView;