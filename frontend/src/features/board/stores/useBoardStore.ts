import { create } from 'zustand';
import { IBoard, IList, ICard, ISubtask } from '../types';

interface IBoardState {
  board: IBoard | null;
  
  fetchBoardData: (boardId: string) => void;
  setBoard: (newBoard: IBoard) => void; 
  setBoardFromAI: (aiJsonString: string) => void; 

  addList: (listName: string) => void;
  deleteList: (listId: string) => void;

  addCard: (listId: string, cardData: Partial<ICard>) => void;
  deleteCard: (listId: string, cardId: string) => void;
  updateCard: (listId: string, cardId: string, updates: Partial<ICard>) => void;
  toggleSubtask: (listId: string, cardId: string, subtaskId: string) => void;

  getColumnTotalPoints: (listId: string) => number;
  getBoardTotalPoints: () => number;
}

// Giữ lại Mock Data tĩnh ở đây để UI có cái render tạm
const initialState: IBoard = {
  "id": "board_eng_flux_01",
  "board_name": "App Học Tiếng Anh Flux",
  "description": "Phát triển ứng dụng di động hỗ trợ người dùng học tiếng Anh...",
  "lists": [] // Khôi tự dán lại mock data list vào nhé
};

export const useBoardStore = create<IBoardState>((set, get) => ({
  board: initialState, 

  fetchBoardData: (boardId: string) => {
    console.log(`Tiến hành fetch data từ BE cho board: ${boardId}`);
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

  deleteList: (listId) => set((state) => {
    if (!state.board) return state;
    return { board: { ...state.board, lists: state.board.lists.filter(l => l.id !== listId) } };
  }),

  addCard: (listId, cardData) => set((state) => {
    if (!state.board) return state;
    const newCard: ICard = {
      id: `card-${Date.now()}`, 
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

    return {
      board: { ...state.board, lists: state.board.lists.map(l => l.id === listId ? { ...l, cards: [...(l.cards || []), newCard] } : l) }
    };
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