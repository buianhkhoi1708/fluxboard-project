import React, { useState, useEffect } from 'react'; 
import Column from './Column';
import TaskItem from './TaskItem'; 
import { useBoardStore } from '../stores/useBoardStore'; 
import { useUserStore } from '../../user/store/useUserStore'; 
import { DndContext, closestCenter, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Save, Sparkles, Filter, Users } from 'lucide-react'; 
import { useRealtimeEvent } from '../../../hooks/useRealtimeEvent'
import { useParams } from 'react-router-dom';

const BoardView = () => {
  const { board, setBoard, fetchBoardData, updateTaskPositionApi } = useBoardStore();
  const { userDictionary } = useUserStore();
  const [activeTask, setActiveTask] = useState(null);

  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } });
  const sensors = useSensors(mouseSensor, touchSensor);
  const { id } = useParams();

  const currentBoardId = id || '69d22692ef24ae604f65ae89'; 

  useRealtimeEvent(`/topic/board/${currentBoardId}`, () => {
    fetchBoardData(currentBoardId);
  });

  useEffect(() => {
    if (currentBoardId) fetchBoardData(currentBoardId); 
  }, [currentBoardId, fetchBoardData]); 

  const projectId = board?.projectId || board?.project_id;
  const projectMembers = Object.values(userDictionary).filter(
    (user) => projectId && user.project_roles && user.project_roles[projectId]
  );

  // 🚀 LOADING SCREEN LOCK: Khóa cứng luôn cả màn hình loading
  if (!board) return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 gap-4 text-center z-50">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-16 h-16 bg-indigo-400/20 rounded-full animate-ping"></div>
        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-xl shadow-lg flex items-center justify-center animate-bounce z-10">
          <Sparkles className="text-white" size={20} />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-base font-bold text-slate-700 tracking-tight">Đang đồng bộ không gian làm việc...</span>
        <span className="text-xs font-medium text-slate-400">Vui lòng chờ trong giây lát</span>
      </div>
    </div>
  );

  const handleDragStart = (e) => {
    if (e.active.data.current?.type === 'Task') setActiveTask(e.active.data.current.task);
  };

  const handleDragEnd = (e) => {
    setActiveTask(null); 
    const { active, over } = e;
    if (!over) return;

    const activeColId = active.data.current?.columnId || active.data.current?.listId;
    const overColId = over.data.current?.columnId || over.data.current?.listId || over.id;
    if (!activeColId || !overColId) return;

    const sourceColIndex = board.columns.findIndex(c => c.id === activeColId || c._id === activeColId);
    const destColIndex = board.columns.findIndex(c => c.id === overColId || c._id === overColId);
    if (sourceColIndex === -1 || destColIndex === -1) return;

    const newColumns = [...board.columns];
    let newOrder = 1; 

    if (activeColId === overColId) {
      const col = newColumns[sourceColIndex];
      const oldIndex = col.tasks.findIndex(t => t.id === active.id || t._id === active.id);
      const newIndex = col.tasks.findIndex(t => t.id === over.id || t._id === over.id);
      
      newColumns[sourceColIndex] = { ...col, tasks: arrayMove(col.tasks, oldIndex, newIndex) };
      newOrder = newIndex + 1; 
    } else {
      const sourceCol = newColumns[sourceColIndex];
      const destCol = newColumns[destColIndex];
      const movedTask = sourceCol.tasks.find(t => t.id === active.id || t._id === active.id);
      const newSourceTasks = sourceCol.tasks.filter(t => t.id !== active.id && t._id !== active.id);
      const newDestTasks = [...(destCol.tasks || [])];
      
      if (over.data.current?.type === 'Task') {
        const newIndex = destCol.tasks.findIndex(t => t.id === over.id || t._id === over.id);
        newDestTasks.splice(newIndex, 0, movedTask);
        newOrder = newIndex + 1;
      } else {
        newDestTasks.push(movedTask);
        newOrder = newDestTasks.length;
      }
      newColumns[sourceColIndex] = { ...sourceCol, tasks: newSourceTasks };
      newColumns[destColIndex] = { ...destCol, tasks: newDestTasks };
    }

    setBoard({ ...board, columns: newColumns });
    updateTaskPositionApi(active.id, overColId, newOrder);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* 🚀 LÕI FIX SCROLL TOÀN TRANG: absolute inset-0 ép khít viền, overflow-hidden cấm cuộn dọc tổng */}
      <div className="absolute inset-0 flex flex-col bg-slate-50/50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/40 via-slate-50 to-white overflow-hidden">

        {/* 🚀 HEADER: shrink-0 giữ nguyên chiều cao, cấu trúc lại để responsive tốt hơn */}
        <div className="shrink-0 px-4 py-3 md:px-6 bg-white/70 backdrop-blur-xl border-b border-white shadow-sm flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 z-10">
          
          <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg md:text-xl shadow-md shrink-0">
              {board.board_name?.charAt(0) || 'F'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <h2 className="text-base md:text-xl font-black text-slate-800 tracking-tight truncate">
                {board.board_name}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-auto w-full sm:w-auto justify-end">
            <div className="flex items-center -space-x-2 mr-1 md:mr-2 shrink-0">
              {projectMembers.length > 0 ? (
                <>
                  {projectMembers.slice(0, 4).map((member, idx) => {
                    const displayName = member.full_name || 'Member';
                    const avatarUrl = member.avatar_url;
                    return (
                      <div key={member.id} title={displayName} className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white flex items-center justify-center overflow-hidden z-[10] shadow-sm transition-transform hover:scale-110 hover:z-50 cursor-pointer" style={{ zIndex: 10 - idx }}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover bg-white" />
                        ) : (
                          <div className="w-full h-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] md:text-xs font-bold">{displayName.charAt(0).toUpperCase()}</div>
                        )}
                      </div>
                    );
                  })}
                  {projectMembers.length > 4 && (
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white bg-slate-100 text-slate-600 flex items-center justify-center text-[9px] md:text-[10px] font-bold z-0 shadow-sm cursor-pointer hover:bg-slate-200" title={`Và ${projectMembers.length - 4} người khác`}>
                      +{projectMembers.length - 4}
                    </div>
                  )}
                </>
              ) : (
                 <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white bg-slate-50 text-slate-400 flex items-center justify-center shadow-sm cursor-default">
                   <Users size={14} />
                 </div>
              )}
            </div>

            <div className="h-5 md:h-6 w-px bg-slate-200 hidden sm:block shrink-0"></div>

            <button className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 md:px-3 rounded-lg text-xs md:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors shrink-0">
              <Filter size={16} className="w-4 h-4" />
              <span className="hidden sm:inline">Lọc</span>
            </button>
            <button className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-black text-white px-3 py-1.5 md:px-4 rounded-lg text-xs md:text-sm font-bold transition-all active:scale-95 shadow-md shrink-0">
              <Save size={16} className="text-indigo-200 w-4 h-4" />
              <span className="hidden sm:inline">Lưu dự án</span>
            </button>
          </div>
        </div>

        {/* 🚀 VÙNG CỘT KÉO THẢ: Chỉ cho phép cuộn ngang (overflow-x-auto), cấm cuộn dọc */}
        <div className="flex-1 w-full p-4 md:p-6 overflow-x-auto overflow-y-hidden flex flex-nowrap gap-4 md:gap-6 items-start custom-scrollbar">
          {board.columns?.map((col) => <Column key={col.id || col._id} list={col} />)}
          <div className="w-4 md:w-8 shrink-0"></div>
        </div>

      </div>

      <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeTask ? <TaskItem task={activeTask} isOverlay listId="overlay" /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default BoardView;