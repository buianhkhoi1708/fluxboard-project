import { create } from 'zustand';
import { boardApi } from '../api/boardApi';

interface IBoardState {
  board: any | null; 
  isLoading: boolean; 
  fetchBoardData: (boardId: string) => Promise<void>;
  setBoard: (newBoard: any) => void; 
  addList: (listName: string) => void;
  deleteList: (columnId: string) => void;
  
  addTask: (columnId: string, taskData: any) => Promise<void>;
  deleteTask: (columnId: string, taskId: string) => void;
  updateTask: (columnId: string, taskId: string, updates: any) => void;
  
  // 👉 ĐÃ BỔ SUNG KHAI BÁO HÀM NÀY CHO TYPESCRIPT HẾT KÊU
  addSubtask: (columnId: string, parentTaskId: string, title: string) => Promise<void>; 
  toggleSubtask: (columnId: string, parentTaskId: string, subtaskId: string) => void;
  
  updateTaskPositionApi: (taskId: string, newColumnId: string, newOrder: number) => Promise<void>;
  
  getColumnTotalPoints: (columnId: string) => number;
  getBoardTotalPoints: () => number;
}

export const useBoardStore = create<IBoardState>((set, get) => ({
  board: null, 
  isLoading: false,

  fetchBoardData: async (boardId: string) => {
    set({ isLoading: true });
    try {
      const rawResponse = await boardApi.getBoard(boardId);
      let coreData = rawResponse;
      while (coreData && coreData.data && coreData.board_name === undefined && coreData.columns === undefined) {
        coreData = coreData.data;
      }
      set({ board: coreData, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  updateTaskPositionApi: async (taskId: string, newColumnId: string, newOrder: number) => {
    try {
      const board = get().board;
      const boardId = board?.id || board?._id;
      if (!boardId) {
        console.error("Không tìm thấy Board ID để thực hiện move!");
        return;
      }
      await boardApi.moveTask(taskId, newColumnId, newOrder, boardId);
    } catch (error) {
      console.error("Lỗi khi kéo thả:", error);
      const currentBoardId = get().board?.id || get().board?._id;
      if (currentBoardId) get().fetchBoardData(currentBoardId); 
    }
  },

  setBoard: (newBoard) => set({ board: newBoard }),

  addList: (listName) => set((state) => {
    if (!state.board) return state;
    const newColumn = { id: `col-${Date.now()}`, list_name: listName, order: state.board.columns?.length || 0 + 1, tasks: [] };
    return { board: { ...state.board, columns: [...(state.board.columns || []), newColumn] } };
  }),

  deleteList: (columnId) => set((state) => {
    if (!state.board) return state;
    return { board: { ...state.board, columns: state.board.columns.filter((c: any) => c.id !== columnId && c._id !== columnId) } };
  }),

  // ==============================================================
  // 1. TẠO TASK CHÍNH
  // ==============================================================
  addTask: async (columnId: string, taskData: any) => {
    const { board } = get();
    if (!board) return;
    
    try {
      const taskRequest = {
        title: taskData.title.trim(),
        description: taskData.description || "",
        column_id: columnId,         
        priority: taskData.priority?.toUpperCase() || "MEDIUM", 
        status: "TODO",
        assignees_user_id: [], 
        story_point: Number(taskData.story_points) || 0,
        // ❌ KHÔNG GỬI estimated_days LÊN SERVER NỮA
        start_date: taskData.start_date ? new Date(taskData.start_date).toISOString() : null,
        due_date: taskData.due_date ? new Date(taskData.due_date).toISOString() : null,
        parent_task_id: null,
      };

      await boardApi.createTask(taskRequest);
    } catch (error) {
      console.error("❌ Lỗi khi tạo task:", error);
    }
  },

  // ==============================================================
  // 2. XÓA TASK
  // ==============================================================
  deleteTask: async (columnId, taskId) => {
    const { board, fetchBoardData } = get();
    if (!board) return;
    
    set((state) => {
      if (!state.board) return state;
      return { board: { ...state.board, columns: state.board.columns.map((col: any) => (col.id === columnId || col._id === columnId) ? { ...col, tasks: col.tasks.filter((t: any) => t.id !== taskId && t._id !== taskId) } : col) } };
    });
    
    try {
      await boardApi.deleteTask(taskId);
    } catch (error) {
      fetchBoardData(board.id || board._id); 
    }
  },

  // ==============================================================
  // 3. CẬP NHẬT TASK CHÍNH
  // ==============================================================
  updateTask: async (columnId, taskId, updates) => {
    const { board, fetchBoardData } = get();
    if (!board) return;
    const col = board.columns?.find((c: any) => c.id === columnId || c._id === columnId);
    const task = col?.tasks?.find((t: any) => t.id === taskId || t._id === taskId);
    if (!task) return;

    set((state) => {
      if (!state.board) return state;
      return { board: { ...state.board, columns: state.board.columns.map((c: any) => (c.id === columnId || c._id === columnId) ? { ...c, tasks: c.tasks.map((t: any) => (t.id === taskId || t._id === taskId) ? { ...t, ...updates } : t) } : c) } };
    });

    const backendUpdates = {
      title: (updates.title !== undefined ? updates.title : task.title).trim(),
      description: updates.description !== undefined ? updates.description : task.description,
      priority: (updates.priority !== undefined ? updates.priority : task.priority)?.toUpperCase() || "MEDIUM",
      story_point: Number(updates.story_points !== undefined ? updates.story_points : task.story_points) || 0,
      // ❌ ĐÃ XÓA DÒNG `estimated_days:` Ở ĐÂY ĐỂ TRÁNH LỖI 400
      start_date: updates.start_date !== undefined ? (updates.start_date ? new Date(updates.start_date).toISOString() : null) : task.start_date,
      due_date: updates.due_date !== undefined ? (updates.due_date ? new Date(updates.due_date).toISOString() : null) : task.due_date,
      assignees_user_id: [],
      column_id: columnId,
      status: task.status || "TODO",
      parent_task_id: task.parent_task_id || null
    };

    try {
      await boardApi.updateTask(taskId, backendUpdates);
    } catch (error) {
      console.error("❌ Lỗi update task:", error);
      fetchBoardData(board.id || board._id); 
    }
  },

  // ==============================================================
  // 4. TẠO SUBTASK 
  // ==============================================================
  addSubtask: async (columnId: string, parentTaskId: string, title: string) => {
    const { board } = get();
    if (!board) return;
    
    try {
      const taskRequest = {
        title: title.trim(),
        description: "",
        column_id: columnId,         
        priority: "MEDIUM", 
        status: "TODO",
        assignees_user_id: [], 
        story_point: 0, 
        parent_task_id: parentTaskId, 
      };
      await boardApi.createTask(taskRequest);
    } catch (error) {
      console.error("❌ Lỗi khi tạo subtask:", error);
    }
  },

  // ==============================================================
  // 5. CHECK/UNCHECK SUBTASK
  // ==============================================================
  toggleSubtask: async (columnId: string, parentTaskId: string, subtaskId: string) => {
    const { board, fetchBoardData } = get();
    if (!board) return;

    const col = board.columns?.find((c: any) => c.id === columnId || c._id === columnId);
    const parent = col?.tasks?.find((t: any) => t.id === parentTaskId || t._id === parentTaskId);
    const subtask = parent?.subtasks?.find((st: any) => st.id === subtaskId || st._id === subtaskId);
    if (!subtask) return;

    const newStatus = (subtask.status === 'DONE' || subtask.is_done) ? 'TODO' : 'DONE';

    set((state) => {
      if (!state.board) return state;
      return { 
        board: { 
          ...state.board, 
          columns: state.board.columns.map((c: any) => 
            (c.id === columnId || c._id === columnId) ? { ...c, tasks: c.tasks.map((t: any) => 
              (t.id === parentTaskId || t._id === parentTaskId) ? { ...t, subtasks: (t.subtasks || []).map((st: any) => 
                (st.id === subtaskId || st._id === subtaskId) ? { ...st, status: newStatus } : st
              )} : t
            )} : c
          ) 
        } 
      };
    });

    const subtaskUpdates = {
      title: subtask.title || "Subtask",
      description: subtask.description || "",
      // 👉 FIX CHÍ MẠNG: ĐÃ THÊM toUpperCase() ĐỂ TRÁNH LỖI MALFORMED JSON
      priority: subtask.priority?.toUpperCase() || "MEDIUM", 
      story_point: subtask.story_point || subtask.story_points || 0,
      assignees_user_id: [],
      column_id: columnId,
      parent_task_id: parentTaskId, 
      status: newStatus
    };

    try {
      await boardApi.updateTask(subtaskId, subtaskUpdates);
    } catch (error) {
      console.error("❌ Lỗi update subtask:", error);
      fetchBoardData(board.id || board._id); 
    }
  },

  // ==============================================================
  // TIỆN ÍCH TÍNH ĐIỂM
  // ==============================================================
  getColumnTotalPoints: (columnId) => {
    const board = get().board;
    if (!board) return 0;
    const col = board.columns?.find((c: any) => c.id === columnId || c._id === columnId);
    return col ? (col.tasks || []).reduce((sum: number, task: any) => sum + (task.story_points || task.story_point || 0), 0) : 0;
  },

  getBoardTotalPoints: () => {
    const board = get().board;
    return board ? (board.columns || []).reduce((sum: number, col: any) => sum + (col.tasks || []).reduce((s: number, t: any) => s + (t.story_points || t.story_point || 0), 0), 0) : 0;
  }
}));