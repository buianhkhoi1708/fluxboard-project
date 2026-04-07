import { create } from 'zustand';
import { IBoard, IList, ICard, ISubtask } from '../types';

// Import các hàm API thực tế của bạn (Bỏ comment khi đã kết nối Backend)
// import { fetchBoardAPI, moveTaskAPI, createCardAPI, deleteCardAPI, updateCardAPI } from '../features/api/boardApi';

interface IBoardState {
  board: IBoard | null;
  isLoading: boolean;
  error: string | null;
  
  // API Actions
  fetchBoardData: (boardId: string) => Promise<void>;
  moveCardPosition: (taskId: string, sourceColId: string, destColId: string, newOrder: number) => Promise<void>;
  
  // Local Actions (Kết hợp gọi API ngầm)
  setBoard: (newBoard: IBoard) => void; 
  setBoardFromAI: (aiJsonString: string) => void; 

  addList: (listName: string) => void;
  deleteList: (listId: string) => void;

  addCard: (listId: string, cardData: Partial<ICard>) => Promise<void>;
  deleteCard: (listId: string, cardId: string) => Promise<void>;
  updateCard: (listId: string, cardId: string, updates: Partial<ICard>) => Promise<void>;
  toggleSubtask: (listId: string, cardId: string, subtaskId: string) => void;

  getColumnTotalPoints: (listId: string) => number;
  getBoardTotalPoints: () => number;
}

export const useBoardStore = create<IBoardState>((set, get) => ({
  board: null, 
  isLoading: false,
  error: null,

  // 1. Lấy dữ liệu bảng từ Backend
  fetchBoardData: async (boardId: string) => {
    // Bật loading
    set({ isLoading: true, error: null });
    
    try {
      console.log(`Đang gọi API GET tới /boards/${boardId}...`);
      
      // -- CHÚ Ý KHI CHƯA CÓ API THẬT --
      // Nếu Backend chưa có thật, bạn dùng setTimeout giả lập tải dữ liệu
      // Để giả lập thì bạn cần nhét 1 cục data giả vào (board) thay vì để nó null
      setTimeout(() => {
        set({ 
          board: { 
            id: boardId, 
            board_name: "Bảng từ API", 
            description: "Mô tả bảng", 
            lists: [] 
          }, 
          isLoading: false // BẮT BUỘC PHẢI TẮT LOADING Ở ĐÂY
        }); 
      }, 1000); // Đợi 1 giây rồi hiện bảng

      // -- KHI NỐI API THẬT, BẠN DÙNG ĐOẠN NÀY (Bỏ comment ra, xóa setTimeout) --
      // const realData = await fetchBoardAPI(boardId);
      // set({ board: realData, isLoading: false });

    } catch (err: any) {
      // Nếu có lỗi, cũng BẮT BUỘC phải tắt loading đi để không bị xoay mãi
      console.error("Lỗi fetch board:", err);
      set({ 
        error: err.message || "Lỗi khi tải dữ liệu", 
        isLoading: false // TẮT LOADING KHI CÓ LỖI
      });
    }
  },

  // 2. Kéo thả Card (Tối ưu UI lập tức + Gọi API ngầm)
  moveCardPosition: async (taskId, sourceColId, destColId, newOrder) => {
    const currentBoard = get().board;
    if (!currentBoard) return;

    // --- OPTIMISTIC UPDATE: Cập nhật UI ngay lập tức ---
    let movedCard: ICard | undefined;
    
    // Tìm và xóa thẻ ở cột cũ
    const updatedLists = currentBoard.lists.map(list => {
      if (list.id === sourceColId) {
        movedCard = list.cards?.find(c => c.id === taskId);
        return { ...list, cards: list.cards?.filter(c => c.id !== taskId) || [] };
      }
      return list;
    });

    // Thêm thẻ vào cột mới
    if (movedCard) {
      const finalLists = updatedLists.map(list => {
        if (list.id === destColId) {
          const newCards = [...(list.cards || [])];
          // Chèn vào vị trí mới (index = newOrder - 1, giả sử order đếm từ 1)
          newCards.splice(newOrder - 1, 0, movedCard!); 
          return { ...list, cards: newCards };
        }
        return list;
      });
      set({ board: { ...currentBoard, lists: finalLists } });
    }

    // --- GỌI API NGẦM LÊN BE ---
    try {
      console.log(`Gọi PATCH /tasks/${taskId}/move - Dest: ${destColId}, Order: ${newOrder}`);
      // await moveTaskAPI(taskId, destColId, newOrder);
    } catch (error) {
      console.error("Lỗi kéo thả, khôi phục lại data...", error);
      // Rollback: Nếu gọi API thất bại, load lại dữ liệu chuẩn từ DB
      // get().fetchBoardData(currentBoard.id);
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
    // TODO: Cần gọi API POST tạo Cột ngầm ở đây
    return { board: { ...state.board, lists: [...state.board.lists, newList] } };
  }),

  deleteList: (listId) => set((state) => {
    if (!state.board) return state;
    // TODO: Cần gọi API DELETE xóa Cột ngầm ở đây
    return { board: { ...state.board, lists: state.board.lists.filter(l => l.id !== listId) } };
  }),

  // 3. Thêm Card mới
  addCard: async (listId, cardData) => {
    const state = get();
    if (!state.board) return;

    // Fix lỗi TypeScript TS2352: Khai báo đủ các trường của ICard
    const newCard: ICard = {
      id: `temp-${Date.now()}`, // ID tạm thời để UI cập nhật tức thì
      title: cardData.title || 'Thẻ mới', 
      description: cardData.description || '', 
      assignee: cardData.assignee || 'Unassigned', 
      priority: cardData.priority || 'Medium', 
      start_date: new Date().toISOString().split('T')[0], 
      due_date: null, 
      estimated_days: 0, 
      story_points: Number(cardData.story_points) || 0, 
      ai_suggested_points: 0, 
      ai_estimation_reason: '', 
      tags: cardData.tags || [], 
      subtasks: []
    };

    // Optimistic Update: Vẽ ra màn hình trước
    set({
      board: { 
        ...state.board, 
        lists: state.board.lists.map(l => 
          l.id === listId ? { ...l, cards: [...(l.cards || []), newCard] } : l
        ) 
      }
    });

    try {
      // Gọi API thực tế
      console.log("Gọi API tạo thẻ mới...");
      // const savedCard = await createCardAPI(listId, cardData);
      
      // Update lại thẻ tạm bằng data thật (để lấy ID chuẩn do MongoDB sinh ra)
      // get().updateCard(listId, newCard.id, savedCard);
    } catch (error) {
      console.error(error);
      // Logic rollback nếu lỗi (xóa thẻ tạm khỏi UI)
    }
  },

  // 4. Xóa Card
  deleteCard: async (listId, cardId) => {
    const state = get();
    if (!state.board) return;

    // Optimistic Update
    set({
      board: { ...state.board, lists: state.board.lists.map(l => l.id === listId ? { ...l, cards: l.cards.filter(c => c.id !== cardId) } : l) }
    });

    try {
      console.log(`Gọi API xóa thẻ ${cardId}...`);
      // await deleteCardAPI(cardId);
    } catch (error) {
      console.error(error);
    }
  },

  // 5. Cập nhật Card (Edit title, description,...)
  updateCard: async (listId, cardId, updates) => {
    const state = get();
    if (!state.board) return;

    // Optimistic Update
    set({
      board: { ...state.board, lists: state.board.lists.map(l => l.id === listId ? { ...l, cards: l.cards.map(c => c.id === cardId ? { ...c, ...updates } : c) } : l) }
    });

    try {
      console.log(`Gọi API cập nhật thẻ ${cardId}...`);
      // await updateCardAPI(cardId, updates);
    } catch (error) {
      console.error(error);
    }
  },

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