import React, { useState } from 'react';
import Column from './Column';
import CardItem from './CardItem';
import { useBoardStore } from '../stores/useBoardStore'; 
import { DndContext, closestCenter, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { X } from 'lucide-react'; 
import AiGeneratorPanel from './AiGeneratorPanel';

const BoardView = () => {
  const { board, setBoard, getBoardTotalPoints, addList } = useBoardStore();
  const [activeCard, setActiveCard] = useState(null);
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

  // config distance: 5 để không bị đụng chạm với sự kiện onClick
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  if (!board) return <div className="flex-1 flex items-center justify-center italic text-gray-400">Đang tải dữ liệu...</div>;

  const handleDragStart = (e) => {
    if (e.active.data.current?.type === 'Card') setActiveCard(e.active.data.current.card);
  };

  const handleDragEnd = (e) => {
    setActiveCard(null);
    const { active, over } = e;
    if (!over) return;

    const activeListId = active.data.current?.listId;
    const overListId = over.data.current?.listId || over.id;
    if (!activeListId || !overListId) return;

    const sourceListIndex = board.lists.findIndex(l => l.id === activeListId);
    const destListIndex = board.lists.findIndex(l => l.id === overListId);
    const newLists = [...board.lists];

    if (activeListId === overListId) {
      const list = newLists[sourceListIndex];
      const oldIndex = list.cards.findIndex(c => c.id === active.id);
      const newIndex = list.cards.findIndex(c => c.id === over.id);
      newLists[sourceListIndex] = { ...list, cards: arrayMove(list.cards, oldIndex, newIndex) };
    } else {
      const sourceList = newLists[sourceListIndex];
      const destList = newLists[destListIndex];
      const movedCard = sourceList.cards.find(c => c.id === active.id);
      const newSourceCards = sourceList.cards.filter(c => c.id !== active.id);
      const newDestCards = [...(destList.cards || [])];
      
      if (over.data.current?.type === 'Card') {
        const newIndex = destList.cards.findIndex(c => c.id === over.id);
        newDestCards.splice(newIndex, 0, movedCard);
      } else {
        newDestCards.push(movedCard);
      }
      newLists[sourceListIndex] = { ...sourceList, cards: newSourceCards };
      newLists[destListIndex] = { ...destList, cards: newDestCards };
    }
    setBoard({ ...board, lists: newLists });
  };

  const handleAddListClick = () => {
    if (newColTitle.trim()) {
      addList(newColTitle.trim());
      setNewColTitle(''); 
      setIsAddingCol(false);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full bg-blue-600">

        <AiGeneratorPanel/>

        <div className="px-6 py-4 bg-blue-700/50 text-white flex justify-between items-center shrink-0 border-b border-white/10">
          <div><h2 className="text-lg font-bold">{board.board_name}</h2></div>
          {getBoardTotalPoints && <div className="bg-blue-800/50 px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm">Tổng: {getBoardTotalPoints()} Story Points</div>}
        </div>

        <div className="flex-1 w-full p-4 overflow-x-auto flex flex-nowrap gap-4 items-start custom-scrollbar">
          {board.lists?.map((list) => <Column key={list.id} list={list} />)}
          
          {isAddingCol ? (
            <div className="w-[300px] shrink-0 bg-white p-3 rounded-2xl shadow-sm flex flex-col gap-2">
              <input autoFocus value={newColTitle} onChange={e => setNewColTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddListClick()} placeholder="Tên danh sách..." className="text-sm font-medium border border-gray-200 rounded px-2 py-2 outline-none w-full focus:border-blue-500" />
              <div className="flex gap-2 items-center mt-1">
                <button onClick={handleAddListClick} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 shadow-sm">Thêm danh sách</button>
                <button onClick={() => { setIsAddingCol(false); setNewColTitle(''); }} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg"><X size={16}/></button>
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