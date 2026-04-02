import React, { useState } from 'react';
import Column from './Column';
import CardItem from './CardItem';
import { useBoardStore } from '../store/useBoardStore'; 
import { DndContext, closestCenter, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { X } from 'lucide-react'; 

const BoardView = () => {
  const { board, setBoard, getBoardTotalPoints } = useBoardStore();
  const [activeCard, setActiveCard] = useState(null);
  
  // Trạng thái bật/tắt form thêm danh sách
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  if (!board) return <div className="flex-1 flex items-center justify-center italic text-gray-400">Đang tải dữ liệu...</div>;

  // --- KÉO THẢ ---
  const handleDragStart = (e) => {
    if (e.active.data.current?.type === 'Card') setActiveCard(e.active.data.current.card);
  };

  const handleDragEnd = (e) => {
    setActiveCard(null);
    const { active, over } = e;
    if (!over) return;

    const activeListId = active.data.current?.listId;
    const overListId = over.data.current?.listId || over.id;

    let newLists = JSON.parse(JSON.stringify(board.lists || []));

    if (activeListId === overListId) {
      const listIndex = newLists.findIndex(l => l.id === activeListId);
      const oldIndex = newLists[listIndex].cards.findIndex(c => c.id === active.id);
      const newIndex = newLists[listIndex].cards.findIndex(c => c.id === over.id);
      newLists[listIndex].cards = arrayMove(newLists[listIndex].cards, oldIndex, newIndex);
    } else {
      const sourceList = newLists.find(l => l.id === activeListId);
      const destList = newLists.find(l => l.id === overListId);

      const movedCard = sourceList.cards.find(c => c.id === active.id);
      sourceList.cards = sourceList.cards.filter(c => c.id !== active.id);

      if (over.data.current?.type === 'Card') {
        const newIndex = destList.cards.findIndex(c => c.id === over.id);
        destList.cards.splice(newIndex, 0, movedCard);
      } else {
        destList.cards.push(movedCard);
      }
    }
    setBoard({ ...board, lists: newLists });
  };

  // --- LOGIC THÊM DANH SÁCH MỚI ---
  const handleAddList = () => {
    if (newColTitle.trim()) {
      // Tạo object danh sách mới chuẩn Interface IList
      const newList = {
        id: `list-${Date.now()}`,
        list_name: newColTitle.trim(),
        order: (board.lists?.length || 0) + 1,
        cards: []
      };
      
      // Nạp vào Bảng
      setBoard({ ...board, lists: [...(board.lists || []), newList] });
      
      // Reset form
      setNewColTitle(''); 
      setIsAddingCol(false);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full bg-blue-600">
        
        {/* Header Board */}
        <div className="px-6 py-4 bg-blue-700/50 text-white flex justify-between items-center shrink-0 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold">{board.board_name}</h2>
            <p className="text-xs text-blue-200">{board.description}</p>
          </div>
          {getBoardTotalPoints && (
            <div className="bg-blue-800/50 px-3 py-1.5 rounded-lg text-sm font-semibold">
              Tổng: {getBoardTotalPoints()} Story Points
            </div>
          )}
        </div>

        {/* Nội dung Kanban */}
        <div className="flex-1 w-full p-4 overflow-x-auto flex flex-nowrap gap-4 items-start custom-scrollbar">
          {board.lists?.map((list) => (
            <Column key={list.id} list={list} />
          ))}
          
          {/* KHUNG THÊM DANH SÁCH MỚI */}
          {isAddingCol ? (
            <div className="w-[300px] shrink-0 bg-white p-3 rounded-2xl shadow-sm flex flex-col gap-2">
              <input 
                autoFocus 
                value={newColTitle} 
                onChange={e => setNewColTitle(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleAddList()} 
                placeholder="Tên danh sách..." 
                className="text-sm font-medium border border-gray-200 rounded px-2 py-2 outline-none w-full focus:border-blue-500" 
              />
              <div className="flex gap-2 items-center mt-1">
                <button onClick={handleAddList} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 shadow-sm">
                  Thêm danh sách
                </button>
                <button onClick={() => { setIsAddingCol(false); setNewColTitle(''); }} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">
                  <X size={16}/>
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setIsAddingCol(true)} className="w-[300px] shrink-0 flex items-center gap-2 px-4 py-3 bg-white/20 hover:bg-white/30 rounded-2xl text-white font-medium transition-colors">
              <span className="text-xl">+</span> Thêm danh sách khác
            </button>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeCard ? <CardItem card={activeCard} isOverlay listId="overlay" /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default BoardView;