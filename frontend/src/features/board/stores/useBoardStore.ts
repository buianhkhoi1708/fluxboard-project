import { create } from 'zustand';
import { IBoard, IList, ICard, ISubtask } from '../types';
import { boardApi } from '../api/boardApi'; 

interface IBoardState {
  board: IBoard | null;
  isLoading: boolean; 
  
  fetchBoardData: (boardId: string) => Promise<void>;
  setBoard: (newBoard: IBoard) => void; 
  setBoardFromAI: (aiJsonString: string) => void; 

  addList: (listName: string) => void;
  deleteList: (listId: string) => void;

  addCard: (listId: string, title: string) => Promise<void>;
  deleteCard: (listId: string, cardId: string) => void;
  updateCard: (listId: string, cardId: string, updates: Partial<ICard>) => void;
  toggleSubtask: (listId: string, cardId: string, subtaskId: string) => void;
  
  updateCardPositionApi: (cardId: string, newColumnId: string, newOrder: number) => Promise<void>;

  getColumnTotalPoints: (listId: string) => number;
  getBoardTotalPoints: () => number;
}

export const useBoardStore = create<IBoardState>((set, get) => ({
  board: null, 
  isLoading: false,

  fetchBoardData: async (boardId: string) => {
    set({ isLoading: true });
    try {
      console.log(`Đang tải dữ liệu từ DB cho Board: ${boardId}...`);
      
      const rawResponse = await boardApi.getBoard(boardId);
      
      // 1. Lột vỏ tìm lõi
      let coreData = rawResponse;
      while (coreData && coreData.data && coreData.board_name === undefined && coreData.columns === undefined) {
        coreData = coreData.data;
      }

      console.log("🎯 Đã chạm đáy dữ liệu:", coreData);

      // 2. Mapping chuẩn xác từ Schema của Mạnh sang Schema của Frontend
      const mappedBoard: IBoard = {
        id: coreData.id || coreData._id,
        board_name: coreData.board_name || "Bảng không tên",
        description: coreData.description || "",
        
        // 👉 Map 'columns' từ DB sang 'lists' của FE
        lists: (coreData.columns || []).map((col: any) => ({
          id: col.id || col._id,
          list_name: col.list_name || "Cột không tên",
          order: col.order || 0,
          
          // 👉 Map 'tasks' từ DB sang 'cards' của FE
          cards: (col.tasks || []).map((task: any) => ({
            id: task.id || task._id,
            title: task.title || "Chưa có tiêu đề",
            description: task.description || "",
            assignee: (task.assignees && task.assignees.length > 0) ? task.assignees[0] : "Chưa phân công",
            priority: task.priority || "Medium",
            start_date: task.start_date || "",
            due_date: task.due_date || "",
            story_points: task.story_points || 0,
            ai_suggested_points: task.ai_suggested_points || 0,
            ai_estimation_reason: task.ai_estimation_reason || "",
            status: task.status || "TODO",
            subtasks: (task.subtasks || []).map((st: any) => ({
              id: st.id || st._id,
              title: st.title,
              is_done: st.status === 'DONE'
            }))
          }))
        }))
      };

      set({ board: mappedBoard, isLoading: false });
      console.log("✅ Mapping thành công! Board đã sẵn sàng render.");

    } catch (error) {
      console.error(`❌ Lỗi mapping dữ liệu:`, error);
      set({ isLoading: false });
    }
  },

  // 👉 ĐÃ FIX: Nối vào api moveTask (dùng camelCase của Mạnh)
  updateCardPositionApi: async (cardId: string, newColumnId: string, newOrder: number) => {
    try {
      // Gọi api boardApi.moveTask (cái hàm có body: { newColumnId, newOrder })
      await boardApi.moveTask(cardId, newColumnId, newOrder);
      console.log(`🚀 Đã lưu vị trí kéo thả cho task ${cardId} lên Database!`);
    } catch (error) {
      console.error("❌ Lỗi khi lưu vị trí kéo thả:", error);
      // Rollback: Gọi lại fetch để reset UI về đúng trạng thái trên DB nếu bị lỗi
      const currentBoardId = get().board?.id;
      if (currentBoardId) get().fetchBoardData(currentBoardId); 
    }
  },

  setBoard: (newBoard) => set({ board: newBoard }),

  setBoardFromAI: (aiJsonString: string) => {
    try {
      const parsedData = JSON.parse(aiJsonString);
      const boardWithIds: IBoard = {
        ...parsedData,
        id: parsedData.id || `board-ai-${Date.now()}`,
        lists: parsedData.lists?.map((list: Partial<IList>, lIndex: number) => ({
          ...list,
          id: list.id || `list-ai-${Date.now()}-${lIndex}`,
          cards: list.cards?.map((card: Partial<ICard>, cIndex: number) => ({
            ...card,
            id: card.id || `card-ai-${Date.now()}-${lIndex}-${cIndex}`,
            subtasks: card.subtasks?.map((st: Partial<ISubtask>, stIndex: number) => ({
              ...st,
              id: st.id || `subtask-ai-${Date.now()}-${stIndex}`
            })) || []
          })) || []
        })) || []
      };
      set({ board: boardWithIds });
    } catch (error) {
      console.error("Lỗi khi parse dữ liệu AI:", error);
    }
  },

  addList: (listName) => set((state) => {
    if (!state.board) return state;
    const newList: IList = { id: `list-${Date.now()}`, list_name: listName, order: state.board.lists.length + 1, cards: [] };
    return { board: { ...state.board, lists: [...state.board.lists, newList] } };
  }),

addCard: async (listId: string, cardData: any) => {
  const { board, fetchBoardData } = get();
  if (!board) return;

  try {
    // Mapping từ Form của Khôi sang DTO của Mạnh
    const taskRequest = {
      title: cardData.title.trim(),
      description: cardData.description || "",
      columnId: listId,
      // Backend của Mạnh cần String VIẾT HOA cho Enum Priority
      priority: cardData.priority.toUpperCase() || "MEDIUM", 
      status: "TODO",
      assigneesUserId: cardData.assignee ? [cardData.assignee] : [],
      storyPoint: Number(cardData.story_points) || 0,
      parentTaskId: null,
      // Nếu Khôi có thêm field Tags, hãy xử lý chuỗi thành mảng ở đây
    };

    console.log("📤 Gửi Payload đầy đủ lên Mạnh:", taskRequest);
    await boardApi.createTask(taskRequest);
    
    // Refresh để lấy ID thật từ MongoDB và các field khác
    await fetchBoardData(board.id);
  } catch (error) {
    console.error("❌ Lỗi khi tạo task đầy đủ:", error);
  }
},
  deleteList: (listId) => set((state) => {
    if (!state.board) return state;
    return { board: { ...state.board, lists: state.board.lists.filter(l => l.id !== listId) } };
  }),

  deleteCard: (listId, cardId) => set((state) => {
    if (!state.board) return state;
    return {
      board: { ...state.board, lists: state.board.lists.map(l => l.id === listId ? { ...l, cards: l.cards.filter(c => c.id !== cardId) } : l) }
    };
  }),

  updateCard: (listId, cardId, updates) => set((state) => {
    if (!state.board) return state;
    return {
      board: { ...state.board, lists: state.board.lists.map(l => l.id === listId ? { ...l, cards: l.cards.map(c => c.id === cardId ? { ...c, ...updates } : c) } : l) }
    };
  }),

  toggleSubtask: (listId, cardId, subtaskId) => set((state) => {
    if (!state.board) return state;
    return {
      board: { ...state.board, lists: state.board.lists.map(l => l.id === listId ? { ...l, cards: l.cards.map(c => {
        if (c.id !== cardId) return c;
        const subtasks = c.subtasks || [];
        return { ...c, subtasks: subtasks.map(st => st.id === subtaskId ? { ...st, is_done: !st.is_done } : st) };
      })} : l)}
    };
  }),

  getColumnTotalPoints: (listId) => {
    const board = get().board;
    if (!board) return 0;
    const list = board.lists.find(l => l.id === listId);
    return list ? (list.cards || []).reduce((sum, card) => sum + (card.story_points || 0), 0) : 0;
  },

  getBoardTotalPoints: () => {
    const board = get().board;
    return board ? board.lists.reduce((sum, list) => sum + (list.cards || []).reduce((s, c) => s + (c.story_points || 0), 0), 0) : 0;
  }
}));