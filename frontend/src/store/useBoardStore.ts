import { create } from 'zustand';

// ==========================================
// 1. ĐỊNH NGHĨA TYPE/INTERFACE (CHUẨN CỦA CHẤN)
// ==========================================
export interface ISubtask {
  id: string;
  title: string;
  is_done: boolean;
}

export interface ICard {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical'; 
  start_date: string; 
  due_date: string | null; 
  estimated_days: number;
  story_points: number;
  ai_suggested_points: number;
  ai_estimation_reason: string;
  tags: string[];
  subtasks: ISubtask[];
}

export interface IList {
  id: string;
  list_name: string;
  order: number;
  wip_limit?: number; // AI có thể không trả về wip_limit nên để tuỳ chọn (?)
  cards: ICard[];
}

export interface IBoard {
  id: string;
  board_name: string;
  description: string;
  lists: IList[];
}

// ==========================================
// 2. INTERFACE STATE (ĐÃ BỔ SUNG FULL CRUD + AI)
// ==========================================
interface IBoardState {
  board: IBoard | null;
  
  // API Call
  fetchBoardData: (boardId: string) => void;
  setBoard: (newBoard: IBoard) => void; // Nạp lại toàn bộ bảng (Kéo thả)
  setBoardFromAI: (aiJsonString: string) => void; // Nạp data từ AI

  // Thao tác Danh sách (Lists)
  addList: (listName: string) => void;
  deleteList: (listId: string) => void;

  // Thao tác Thẻ (Cards)
  addCard: (listId: string, title: string, description?: string) => void;
  deleteCard: (listId: string, cardId: string) => void;
  updateCard: (listId: string, cardId: string, updates: Partial<ICard>) => void;
  toggleSubtask: (listId: string, cardId: string, subtaskId: string) => void;

  // Tính toán
  getColumnTotalPoints: (listId: string) => number;
  getBoardTotalPoints: () => number;
}

// ==========================================
// 3. MOCK DATA (CỦA CHẤN)
// ==========================================
const initialState: IBoard = {
  "id": "board_eng_flux_01",
  "board_name": "App Học Tiếng Anh Flux",
  "description": "Phát triển ứng dụng di động hỗ trợ người dùng học tiếng Anh, tập trung vào giao tiếp và từ vựng thông minh.",
  "lists": [
    {
      "id": "list_todo_111",
      "list_name": "To Do",
      "order": 1,
      "wip_limit": 5, 
      "cards": [
        {
          "id": "card_res_999",
          "title": "Nghiên cứu thị trường và đối tượng người dùng",
          "description": "Xác định nhu cầu và phân tích đối tượng mục tiêu. Phân tích điểm mạnh/yếu của Duolingo và Elsa Speak để tìm ngách thị trường.",
          "assignee": "Khôi",
          "priority": "High",
          "start_date": "2024-05-10",
          "due_date": "2024-05-15",
          "estimated_days": 3,
          "story_points": 5, 
          "ai_suggested_points": 5, 
          "ai_estimation_reason": "Task bao gồm phân tích đối thủ lớn và yêu cầu tổng hợp báo cáo chi tiết, mức độ phức tạp trung bình (Medium).",
          "tags": ["Research", "Market Analysis"],
          "subtasks": [
            { "id": "sub_res_1", "title": "Phân tích 5 đối thủ cạnh tranh chính", "is_done": false }
          ]
        }
      ]
    }
  ]
};

// ==========================================
// 4. KHỞI TẠO STORE
// ==========================================
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
        lists: parsedData.lists?.map((list: any, lIndex: number) => ({
          ...list,
          id: list.id || `list-ai-${Date.now()}-${lIndex}`,
          cards: list.cards?.map((card: any, cIndex: number) => ({
            ...card,
            id: card.id || `card-ai-${Date.now()}-${lIndex}-${cIndex}`,
            subtasks: card.subtasks?.map((st: any, stIndex: number) => ({
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

  // --- CRUD DANH SÁCH ---
  addList: (listName) => set((state) => {
    if (!state.board) return state;
    const newList: IList = { id: `list-${Date.now()}`, list_name: listName, order: state.board.lists.length + 1, cards: [] };
    return { board: { ...state.board, lists: [...state.board.lists, newList] } };
  }),

  deleteList: (listId) => set((state) => {
    if (!state.board) return state;
    return { board: { ...state.board, lists: state.board.lists.filter(l => l.id !== listId) } };
  }),

  // --- CRUD THẺ ---
addCard: (listId, cardData) => set((state) => {
    if (!state.board) return state;
    
    // Nạp toàn bộ dữ liệu từ UI gửi lên, cái nào không có thì lấy mặc định
    const newCard: ICard = {
      id: `card-${Date.now()}`, 
      title: cardData.title, 
      description: cardData.description || '', 
      assignee: cardData.assignee || 'Unassigned', 
      priority: cardData.priority || 'Medium', 
      start_date: new Date().toISOString().split('T')[0], 
      due_date: null, 
      estimated_days: 0, 
      story_points: Number(cardData.story_points) || 0, 
      ai_suggested_points: 0, 
      ai_estimation_reason: '', 
      tags: cardData.tags ? cardData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [], 
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

  // --- TÍNH TOÁN ---
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