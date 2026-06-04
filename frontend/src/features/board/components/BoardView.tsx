import React, { useState, useEffect, useRef, useMemo } from 'react';
import Column from './Column';
import TaskItem from './TaskItem';
import { useUserStore } from '../../user/store/useUserStore';
import { useBoardStore } from '../stores/useBoardStore';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor, // 🚀 Dùng TouchSensor chuyên dụng cho thiết bị cảm ứng
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DragCancelEvent,
  Over
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Save, Sparkles, Filter, Users, Plus, X } from 'lucide-react';
import { useRealtimeEvent } from '../../../hooks/useRealtimeEvent';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useGetBoardDetail, useMoveTask, useCreateColumn, BOARD_QUERY_KEYS } from '../hooks/useBoardQueries';
import { Task, BoardColumn, Board } from '../types/index';
import TaskDetailModal from './TaskDetailModal';

const getTaskId = (task: Task) => String(task.id || task._id || '');
const getColumnId = (column: BoardColumn) => String(column.id || column._id || '');

const cloneColumns = (columns: BoardColumn[]) => {
  return columns.map((column) => ({ ...column, tasks: [...(column.tasks || [])] }));
};

const findTaskLocation = (columns: BoardColumn[], taskId: string) => {
  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const taskIndex = (columns[columnIndex].tasks || []).findIndex((task) => getTaskId(task) === taskId);
    if (taskIndex !== -1) return { columnIndex, taskIndex };
  }
  return null;
};

const findColumnIndexById = (columns: BoardColumn[], columnId: string) => {
  return columns.findIndex((column) => getColumnId(column) === columnId);
};

const resolveOverColumnId = (columns: BoardColumn[], over: Over | null) => {
  if (!over) return '';

  const overData = over.data.current || {};
  const directColumnId = overData.columnId || overData.listId;

  if (directColumnId) return String(directColumnId);

  const overId = String(over.id);
  if (findColumnIndexById(columns, overId) !== -1) return overId;

  const owner = findTaskLocation(columns, overId);
  return owner ? getColumnId(columns[owner.columnIndex]) : '';
};

const buildBoardMovePreview = (sourceBoard: Board | undefined, activeTaskId: string, over: Over | null) => {
  if (!sourceBoard?.columns || !over) return null;

  const columns = cloneColumns(sourceBoard.columns);
  const source = findTaskLocation(columns, activeTaskId);
  const destinationColumnId = resolveOverColumnId(columns, over);

  if (!source || !destinationColumnId) return null;

  const sourceColumnId = getColumnId(columns[source.columnIndex]);
  const destinationColumnIndex = findColumnIndexById(columns, destinationColumnId);

  if (destinationColumnIndex === -1) return null;

  const overData = over.data.current || {};
  const overTaskId = overData.type === 'Task' ? String(over.id) : '';
  const overLocationBeforeRemove = overTaskId ? findTaskLocation(columns, overTaskId) : null;

  const [movedTask] = columns[source.columnIndex].tasks.splice(source.taskIndex, 1);
  if (!movedTask) return null;

  let insertIndex = columns[destinationColumnIndex].tasks.length;

  if (overTaskId && overTaskId !== activeTaskId) {
    if (sourceColumnId === destinationColumnId && overLocationBeforeRemove) {
      insertIndex = overLocationBeforeRemove.taskIndex;
    } else {
      const overLocationAfterRemove = findTaskLocation(columns, overTaskId);
      if (overLocationAfterRemove && getColumnId(columns[overLocationAfterRemove.columnIndex]) === destinationColumnId) {
        insertIndex = overLocationAfterRemove.taskIndex;
      }
    }
  }

  insertIndex = Math.max(0, Math.min(insertIndex, columns[destinationColumnIndex].tasks.length));

  if (sourceColumnId === destinationColumnId && source.taskIndex === insertIndex) return null;

  const movedTaskWithColumn = {
    ...movedTask,
    column_id: destinationColumnId,
    columnId: destinationColumnId
  };

  columns[destinationColumnIndex].tasks.splice(insertIndex, 0, movedTaskWithColumn);

  return {
    board: { ...sourceBoard, columns },
    columnId: destinationColumnId,
    order: insertIndex + 1
  };
};

const BoardView = () => {
  const { id } = useParams();
  const currentBoardId = id || '69d22692ef24ae604f65ae89';

  const [searchParams, setSearchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get('taskId');
  const openCommentsFromUrl = searchParams.get('comments') === '1' || searchParams.get('comment') === '1';

  const queryClient = useQueryClient();
  const { data: board, isLoading } = useGetBoardDetail(currentBoardId);
  const { mutateAsync: moveTaskApi } = useMoveTask();
  const { mutateAsync: createColumnApi } = useCreateColumn();

  const { userDictionary } = useUserStore();
  const { setActiveBoardId, activeBoardId } = useBoardStore();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const newColInputRef = useRef<HTMLInputElement>(null);
  const dragSnapshotBoardRef = useRef<Board | null>(null);
  const lastPreviewMoveRef = useRef<{ taskId: string; columnId: string; order: number } | null>(null);

  const [selectedTaskDetailId, setSelectedTaskDetailId] = useState<string | null>(null);
  const [openCommentPanel, setOpenCommentPanel] = useState(false);

  const getBoardFromCache = () => {
    return (queryClient.getQueryData(BOARD_QUERY_KEYS.boardDetail(currentBoardId)) as Board | undefined) || board;
  };

  const rollbackDrag = (fallbackBoard?: Board | null) => {
    const rb = fallbackBoard || dragSnapshotBoardRef.current;
    if (rb) queryClient.setQueryData(BOARD_QUERY_KEYS.boardDetail(currentBoardId), rb);
  };

  const clearDragState = () => {
    setActiveTask(null);
    dragSnapshotBoardRef.current = null;
    lastPreviewMoveRef.current = null;
  };

  useEffect(() => {
    if (taskIdFromUrl && board) {
      setSelectedTaskDetailId(taskIdFromUrl);
      setOpenCommentPanel(openCommentsFromUrl);

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('taskId');
      nextParams.delete('comments');
      nextParams.delete('comment');
      setSearchParams(nextParams, { replace: true });
    }
  }, [taskIdFromUrl, openCommentsFromUrl, board, searchParams, setSearchParams]);

  const selectedTaskData = useMemo(() => {
    if (!selectedTaskDetailId || !board?.columns) return { task: null, listId: '' };

    for (const col of board.columns) {
      const foundTask = col.tasks?.find((task: Task) => getTaskId(task) === String(selectedTaskDetailId));
      if (foundTask) return { task: foundTask, listId: getColumnId(col) };
    }

    return { task: null, listId: '' };
  }, [selectedTaskDetailId, board]);

  useEffect(() => {
    if (currentBoardId) setActiveBoardId(currentBoardId);
  }, [currentBoardId, setActiveBoardId]);

  useEffect(() => {
    if (isAddingCol && newColInputRef.current) newColInputRef.current.focus();
  }, [isAddingCol]);

  // 🚀 BỘ SENSOR TỐI ƯU CỰC ĐỘ CHO MOBILE VÀ PC:
  // MouseSensor: dành cho PC/Mac kéo thả chuột bình thường (chuột rê 5px là bắt đầu)
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  });

  // TouchSensor: dành cho điện thoại, iPad, iPhone
  // BẮT BUỘC: Phải giữ ngón tay (delay) 200ms để nhấc thẻ lên, tránh trình duyệt nhầm thành "Vuốt màn hình"
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,      // Nhấn giữ 0.2s để thẻ được nhấc lên
      tolerance: 8,    // Trong lúc giữ, tay có thể rung nhẹ 8px
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  useRealtimeEvent(`/topic/board/${currentBoardId}`, (message) => {
    const action = String(message?.action || message?.type || '').toUpperCase();

    if (dragSnapshotBoardRef.current) return;

    queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(currentBoardId) });
    queryClient.invalidateQueries({ queryKey: ['my-tasks'] });

    if (action.includes('DEADLINE') || action.includes('EXTENSION')) {
      const taskId = message?.task_id || message?.taskId;
      if (taskId) queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.taskDeadline(String(taskId)) });
    }
  }, 0);

  const projectId = board?.projectId || board?.project_id;

  const activeMembersInBoard = useMemo(() => {
    if (!board?.columns) return [];

    const assignedUserIds = new Set<string>();
    board.columns.forEach((col: BoardColumn) => {
      col.tasks?.forEach((task: Task) => {
        const assignees = task.assignees_user_id || task.assigneesUserId || task.assignees || [];
        assignees.forEach((item: any) => {
          const userId = typeof item === 'object' ? (item.user_id || item.id || item._id) : item;
          if (userId) assignedUserIds.add(String(userId));
        });
      });
    });

    return Array.from(assignedUserIds).map((userId) => userDictionary[userId] || { id: userId, full_name: 'Thành viên', avatar_url: null });
  }, [board, userDictionary]);

  const handleAddColumn = async () => {
    if (!newColName.trim() || !activeBoardId || !board) {
      setIsAddingCol(false);
      return;
    }

    try {
      await createColumnApi({
        list_name: newColName.trim(),
        project_id: String(board.projectId || board.project_id || projectId),
        order: board.columns ? board.columns.length + 1 : 1,
        boardId: activeBoardId
      });

      await queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(activeBoardId) });
      setNewColName('');
      setIsAddingCol(false);
    } catch (error) {
      console.error('Lỗi tạo cột mới:', error);
    }
  };

  const openTaskDetail = (taskId: string, openComments = false) => {
    setSelectedTaskDetailId(taskId);
    setOpenCommentPanel(openComments);
  };

  const closeTaskDetail = () => {
    setSelectedTaskDetailId(null);
    setOpenCommentPanel(false);
  };

  const handleDragStart = (e: DragStartEvent) => {
    if (e.active.data.current?.type !== 'Task') return;

    const currentBoard = getBoardFromCache();
    dragSnapshotBoardRef.current = currentBoard ? { ...currentBoard, columns: cloneColumns(currentBoard.columns || []) } : null;
    lastPreviewMoveRef.current = null;
    setActiveTask(e.active.data.current.task as Task);
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;

    if (!over || active.data.current?.type !== 'Task' || String(active.id) === String(over.id)) return;

    const currentBoard = getBoardFromCache();
    const preview = buildBoardMovePreview(currentBoard, String(active.id), over);

    if (!preview) return;

    queryClient.setQueryData(BOARD_QUERY_KEYS.boardDetail(currentBoardId), preview.board);
    lastPreviewMoveRef.current = {
      taskId: String(active.id),
      columnId: preview.columnId,
      order: preview.order
    };
  };

  const findColumnIndex = (columns: BoardColumn[], columnId: string) => {
    return columns.findIndex((col: BoardColumn) => getColumnId(col) === String(columnId));
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    const rollbackBoard = dragSnapshotBoardRef.current;

    if (!over || active.data.current?.type !== 'Task') {
      rollbackDrag(rollbackBoard);
      clearDragState();
      return;
    }

    const activeTaskId = String(active.id);
    const previewMove = lastPreviewMoveRef.current;

    if (previewMove) {
      moveTaskApi({
        taskId: activeTaskId,
        columnId: previewMove.columnId,
        order: previewMove.order,
        boardId: currentBoardId
      }).catch((error) => {
        console.error('Lỗi khi di chuyển công việc:', error);
        rollbackDrag(rollbackBoard);
      });

      clearDragState();
      return;
    }

    const currentBoard = getBoardFromCache();

    if (!currentBoard?.columns) {
      rollbackDrag(rollbackBoard);
      clearDragState();
      return;
    }

    const activeColId = active.data.current?.columnId || active.data.current?.listId;
    const overColId = resolveOverColumnId(currentBoard.columns, over);

    if (!activeColId || !overColId) {
      rollbackDrag(rollbackBoard);
      clearDragState();
      return;
    }

    const sourceColIndex = findColumnIndex(currentBoard.columns, String(activeColId));
    const destColIndex = findColumnIndex(currentBoard.columns, String(overColId));

    if (sourceColIndex === -1 || destColIndex === -1) {
      rollbackDrag(rollbackBoard);
      clearDragState();
      return;
    }

    let newOrder = 1;
    let nextColumns = cloneColumns(currentBoard.columns);

    if (String(activeColId) === String(overColId)) {
      const col = nextColumns[sourceColIndex];
      const oldIndex = col.tasks.findIndex((task: Task) => getTaskId(task) === activeTaskId);
      const newIndex = col.tasks.findIndex((task: Task) => getTaskId(task) === String(over.id));

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        clearDragState();
        return;
      }

      nextColumns[sourceColIndex] = { ...col, tasks: arrayMove(col.tasks, oldIndex, newIndex) };
      newOrder = newIndex + 1;
    } else {
      const preview = buildBoardMovePreview(currentBoard, activeTaskId, over);

      if (!preview) {
        rollbackDrag(rollbackBoard);
        clearDragState();
        return;
      }

      nextColumns = preview.board.columns;
      newOrder = preview.order;
    }

    queryClient.setQueryData(BOARD_QUERY_KEYS.boardDetail(currentBoardId), { ...currentBoard, columns: nextColumns });

    moveTaskApi({
      taskId: activeTaskId,
      columnId: String(overColId),
      order: newOrder,
      boardId: currentBoardId
    }).catch((error) => {
      console.error('Lỗi khi di chuyển công việc:', error);
      rollbackDrag(rollbackBoard);
    });

    clearDragState();
  };

  const handleDragCancel = (_e: DragCancelEvent) => {
    rollbackDrag();
    clearDragState();
  };

  if (isLoading || !board) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 gap-4 text-center z-50">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-16 h-16 bg-indigo-400/20 rounded-full animate-ping" />
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-xl shadow-lg flex items-center justify-center animate-bounce z-10">
            <Sparkles className="text-white" size={20} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-base font-bold text-slate-700 tracking-tight">Đang đồng bộ bảng...</span>
          <span className="text-xs font-medium text-slate-400">Vui lòng chờ trong giây lát</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart} 
        onDragOver={handleDragOver} 
        onDragEnd={handleDragEnd} 
        onDragCancel={handleDragCancel}
      >
        <div className="absolute inset-0 flex flex-col bg-slate-50/50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/40 via-slate-50 to-white overflow-hidden">
          
          <div className="shrink-0 px-3 py-2.5 md:px-6 md:py-3 bg-white/70 backdrop-blur-xl border-b border-white shadow-sm flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 md:gap-3 z-10">
            <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
              <div className="w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-base md:text-xl shadow-sm shrink-0">
                {board.board_name?.charAt(0) || 'F'}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <h2 className="text-sm md:text-xl font-black text-slate-800 tracking-tight truncate max-w-[150px] sm:max-w-[250px] md:max-w-md">{board.board_name}</h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5 md:gap-3 shrink-0 ml-auto w-auto justify-end">
              <div className="hidden sm:flex items-center -space-x-2 mr-1 md:mr-2 shrink-0">
                {activeMembersInBoard.slice(0, 3).map((member: any, idx: number) => {
                  const displayName = member.full_name || member.fullName || 'Thành viên';
                  const avatarUrl = member.avatar_url || member.avatarUrl;
                  return (
                    <div key={idx} className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white flex items-center justify-center overflow-hidden z-[10] shadow-sm">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover bg-white" />
                      ) : (
                        <div className="w-full h-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] md:text-xs font-bold">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden sm:block h-5 md:h-6 w-px bg-slate-200 shrink-0" />

              <button type="button" className="flex items-center justify-center gap-1.5 p-2 md:px-3 md:py-1.5 rounded-lg text-xs md:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors shrink-0">
                <Filter size={16} className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                <span className="hidden sm:inline">Lọc</span>
              </button>

              <button type="button" className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-black text-white p-2 md:px-4 md:py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all active:scale-95 shadow-md shrink-0">
                <Save size={16} className="text-indigo-200 w-4 h-4 md:w-[18px] md:h-[18px]" />
                <span className="hidden sm:inline">Lưu</span>
              </button>
            </div>
          </div>

          <div className="flex-1 w-full px-3 py-4 md:p-6 overflow-x-auto overflow-y-hidden flex flex-nowrap gap-3 md:gap-6 items-start custom-scrollbar">
            {board.columns?.map((col: BoardColumn) => (
              <div key={col.id || col._id} className="shrink-0 w-[85vw] max-w-[280px] sm:w-[280px] h-full flex flex-col justify-start">
                 <Column list={col} onOpenTaskDetail={openTaskDetail} />
              </div>
            ))}

            <div className="shrink-0 w-[85vw] max-w-[280px] sm:w-[280px]">
              {isAddingCol ? (
                <div className="bg-slate-100/90 backdrop-blur-md rounded-xl p-2.5 shadow-sm border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                  <input
                    ref={newColInputRef}
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    onBlur={handleAddColumn}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddColumn();
                      if (e.key === 'Escape') {
                        setIsAddingCol(false);
                        setNewColName('');
                      }
                    }}
                    placeholder="Nhập tên danh sách."
                    className="w-full text-sm font-bold text-slate-800 bg-white border-2 border-indigo-200 focus:border-indigo-400 rounded-lg px-3 py-2 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                  />
                  <div className="flex gap-2 mt-2">
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleAddColumn(); }} className="flex-1 bg-indigo-600 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-indigo-700 shadow-sm active:scale-95">
                      Lưu
                    </button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); setIsAddingCol(false); setNewColName(''); }} className="px-3 text-slate-500 hover:bg-slate-200 rounded-lg text-xs font-bold">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingCol(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-white/40 hover:bg-white/60 text-slate-600 hover:text-slate-800 font-bold text-sm rounded-xl border border-white/50 shadow-sm transition-all"
                >
                  <Plus size={18} />
                  Thêm danh sách khác
                </button>
              )}
            </div>
            <div className="w-2 md:w-8 shrink-0" />
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeTask ? <TaskItem task={activeTask} isOverlay listId="overlay" /> : null}
        </DragOverlay>
      </DndContext>

      {selectedTaskData.task && (
        <TaskDetailModal
          isOpen={!!selectedTaskDetailId}
          onClose={closeTaskDetail}
          task={selectedTaskData.task}
          listId={selectedTaskData.listId}
          initialOpenComments={openCommentPanel}
        />
      )}
    </>
  );
};

export default BoardView;