import React from 'react';
import BoardView from '../features/board/components/BoardView';

const BoardPage = () => {
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <BoardView />
    </div>
  );
};

export default BoardPage;