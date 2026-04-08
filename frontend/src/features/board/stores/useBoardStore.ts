import { create } from 'zustand';
import { boardApi } from '../api/boardApi'; // 👉 Nhập đúng từ file api

interface IBoardState {
  board: any | null; 
  isLoading: boolean; 
  fetchBoardData: (boardId: string) => Promise<void>;
  setBoard: (newBoard: any) => void; 
  addList: (listName: string) => void;
  deleteList: (columnId: string) => void;
  addCard: (columnId: string, taskData: any) => Promise<void>;
  deleteCard: (columnId: string, taskId: string) => void;
  updateCard: (columnId: string, taskId: string, updates: any) => void;
  toggleSubtask: (columnId: string, taskId: string, subtaskId: string) => void;
  updateCardPositionApi: (taskId: string, newColumnId: string, newOrder: number) => Promise<void>;
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

  updateCardPositionApi: async (taskId: string, newColumnId: string, newOrder: number) => {
    try {
      const board = get().board;
      const boardId = board?.id || board?._id; // Lấy ID của Board hiện tại

      if (!boardId) {
        console.error("Không tìm thấy Board ID để thực hiện move!");
        return;
      }

      // Gọi API với ĐỦ 4 tham số như anh em mình đã thống nhất ở boardApi.ts
      await boardApi.moveTask(taskId, newColumnId, newOrder, boardId);
      
    } catch (error) {
      console.error("Lỗi khi kéo thả:", error);
      // Nếu lỗi thì load lại dữ liệu để đảm bảo giao diện khớp với DB
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

  addCard: async (columnId: string, taskData: any) => {
    const { board, fetchBoardData } = get();
    if (!board) return;
    
    try {
      const boardId = board.id || board._id;
      
      const taskRequest = {
        title: taskData.title.trim(),
        description: taskData.description || "",
        column_id: columnId,         // snake_case
        board_id: boardId,           // 👉 THÊM DÒNG NÀY ĐỂ MẠNH NHẬN ĐƯỢC
        priority: taskData.priority?.toUpperCase() || "MEDIUM", 
        status: "TODO",
        assignees_user_id: taskData.assignee ? [taskData.assignee] : [],
        story_point: Number(taskData.story_points) || 0,
        parent_task_id: null,
      };

      await boardApi.createTask(taskRequest);
      // Không cần fetch lại ở đây vì useRealtime sẽ tự động fetch khi nhận tín hiệu "CHANGED"
    } catch (error) {
      console.error("Lỗi khi tạo task:", error);
    }
  },
  deleteList: (columnId) => set((state) => {
    if (!state.board) return state;
    return { board: { ...state.board, columns: state.board.columns.filter((c: any) => c.id !== columnId && c._id !== columnId) } };
  }),

  deleteCard: async (columnId, taskId) => {
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

  updateCard: async (columnId, taskId, updates) => {
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
      priority: (updates.priority !== undefined ? updates.priority : task.priority)?.toUpperCase(),
      story_point: Number(updates.story_points !== undefined ? updates.story_points : task.story_points) || 0,
      assignees_user_id: (() => {
        const currentAssignee = updates.assignee !== undefined ? updates.assignee : (task.assignees?.[0] || task.assignee);
        if (!currentAssignee || currentAssignee === "Unassigned" || currentAssignee === "Chưa phân công") return [];
        return [currentAssignee];
      })(),
      column_id: columnId
    };

    try {
      await boardApi.updateTask(taskId, backendUpdates);
    } catch (error) {
      fetchBoardData(board.id || board._id); 
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