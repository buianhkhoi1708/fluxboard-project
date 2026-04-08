import { create } from 'zustand';
import { boardApi } from '../api/boardApi';

interface IBoardState {
  board: any | null; 
  isLoading: boolean; 
  fetchBoardData: (boardId: string) => Promise<void>;
  setBoard: (newBoard: any) => void; 
  addList: (listName: string) => void;
  deleteList: (columnId: string) => void;
  
  // 👉 ĐÃ CHUẨN HÓA SANG TASK
  addTask: (columnId: string, taskData: any) => Promise<void>;
  deleteTask: (columnId: string, taskId: string) => void;
  updateTask: (columnId: string, taskId: string, updates: any) => void;
  toggleSubtask: (columnId: string, taskId: string, subtaskId: string) => void;
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

  // 👉 HÀM ADD TASK CHUẨN
  addTask: async (columnId: string, taskData: any) => {
    const { board } = get();
    if (!board) return;
    
    try {
      const boardId = board.id || board._id;
      
      const taskRequest = {
  title: taskData.title.trim(),
  description: taskData.description || "",
  column_id: columnId,         
  priority: taskData.priority?.toUpperCase() || "MEDIUM", 
  status: "TODO",
  assignees_user_id: [], // 👉 Bỏ trống để không dính lỗi ép kiểu ID (400)
  story_point: Number(taskData.story_points) || 0, 
  parent_task_id: null,
};

      await boardApi.createTask(taskRequest);
    } catch (error) {
      console.error("Lỗi khi tạo task:", error);
    }
  },

  deleteList: (columnId) => set((state) => {
    if (!state.board) return state;
    return { board: { ...state.board, columns: state.board.columns.filter((c: any) => c.id !== columnId && c._id !== columnId) } };
  }),

  // 👉 HÀM DELETE TASK CHUẨN
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

  addSubtask: async (columnId: string, parentTaskId: string, title: string) => {
    const { board } = get();
    if (!board) return;
    
    try {
      const taskRequest = {
        title: title.trim(),
        description: "",
        column_id: columnId,         
        priority: "MEDIUM", // Subtask mặc định
        status: "TODO",
        assignees_user_id: [], 
        story_point: 0, 
        parent_task_id: parentTaskId, // 👉 ĐIỂM ĂN TIỀN LÀ ĐÂY: Gắn ID của cha vào!
      };
      // Gọi chung API createTask là xong
      await boardApi.createTask(taskRequest);
    } catch (error) {
      console.error("❌ Lỗi khi tạo subtask:", error);
    }
  },

  // 🚀 2. HÀM CHECK/UNCHECK SUBTASK GỌI THẲNG API
  toggleSubtask: async (columnId: string, parentTaskId: string, subtaskId: string) => {
    const { board, fetchBoardData } = get();
    if (!board) return;

    // Tìm subtask hiện tại để lấy dữ liệu cũ
    const col = board.columns?.find((c: any) => c.id === columnId || c._id === columnId);
    const parent = col?.tasks?.find((t: any) => t.id === parentTaskId || t._id === parentTaskId);
    const subtask = parent?.subtasks?.find((st: any) => st.id === subtaskId || st._id === subtaskId);
    if (!subtask) return;

    const newStatus = (subtask.status === 'DONE' || subtask.is_done) ? 'TODO' : 'DONE';

    // Cập nhật UI tạm thời cho mượt
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

    // Gọi API để lưu trạng thái
    const subtaskUpdates = {
      title: subtask.title,
      description: subtask.description || "",
      priority: subtask.priority || "MEDIUM",
      story_point: subtask.story_point || 0,
      assignees_user_id: [],
      column_id: columnId,
      parent_task_id: parentTaskId, // Báo cho DB biết tui vẫn là con của ông này
      status: newStatus
    };

    try {
      await boardApi.updateTask(subtaskId, subtaskUpdates);
    } catch (error) {
      console.error("❌ Lỗi update subtask:", error);
      fetchBoardData(board.id || board._id); // Lỗi thì rollback UI
    }
  },

  // 👉 HÀM UPDATE TASK CHUẨN (ĐÃ FIX LỖI THIẾU BOARD_ID)
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

    const boardId = board.id || board._id;

    const backendUpdates = {
      title: (updates.title !== undefined ? updates.title : task.title).trim(),
      description: updates.description !== undefined ? updates.description : task.description,
      priority: (updates.priority !== undefined ? updates.priority : task.priority)?.toUpperCase(),
      story_point: Number(updates.story_points !== undefined ? updates.story_points : task.story_points) || 0,
      assignees_user_id: (() => {
        const currentAssignee = updates.assignee !== undefined ? updates.assignee : (task.assignees?.[0] || task.assignee);
        if (!currentAssignee || currentAssignee === "Unassigned" || currentAssignee === "Chưa phân công") return [];
        return [currentAssignee];
      })(),
      column_id: columnId,
      status: task.status || "TODO"
    };

    try {
      await boardApi.updateTask(taskId, backendUpdates);
    } catch (error) {
      fetchBoardData(boardId); 
    }
  },

  toggleSubtask: (columnId, taskId, subtaskId) => set((state) => {
    if (!state.board) return state;
    return { board: { ...state.board, columns: state.board.columns.map((col: any) => (col.id === columnId || col._id === columnId) ? { ...col, tasks: col.tasks.map((t: any) => { if (t.id !== taskId && t._id !== taskId) return t; const subtasks = t.subtasks || []; return { ...t, subtasks: subtasks.map((st: any) => (st.id === subtaskId || st._id === subtaskId) ? { ...st, status: st.status === 'DONE' ? 'TODO' : 'DONE' } : st) }; })} : col) } };
  }),

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