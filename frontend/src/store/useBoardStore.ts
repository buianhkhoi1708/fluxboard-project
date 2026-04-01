import { create } from 'zustand';

// Định nghĩa Type/Interface
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
  wip_limit: number;
  cards: ICard[];
}

export interface IBoard {
  id: string;
  board_name: string;
  description: string;
  lists: IList[];
}

// Định nghĩa Interface state
interface IBoardState {
  board: IBoard | null;
  fetchBoardData: (boardId: string) => void;
}

// Mock data
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
          "tags": [
            "Research",
            "Market Analysis"
          ],
          "subtasks": [
            {
              "id": "sub_res_1",
              "title": "Phân tích 5 đối thủ cạnh tranh chính",
              "is_done": false
            },
            {
              "id": "sub_res_2",
              "title": "Xác định User Personas (Chân dung khách hàng)",
              "is_done": false
            },
            {
              "id": "sub_res_3",
              "title": "Lên danh sách tính năng cốt lõi (MVP)",
              "is_done": false
            }
          ]
        },
        {
          "id": "card_ui_100",
          "title": "Thiết kế Wireframe màn hình Đăng nhập và Trang chủ",
          "description": "Phác thảo cấu trúc và luồng tương tác cơ bản cho hai màn hình quan trọng nhất trên Figma.",
          "assignee": "Quang",
          "priority": "Medium",
          "start_date": "2024-05-12",
          "due_date": "2024-05-14",
          "estimated_days": 2,
          "story_points": 3,
          "ai_suggested_points": 2, 
          "ai_estimation_reason": "Task thiết kế cơ bản, không quá phức tạp nhưng cần thời gian để căn chỉnh UI/UX.",
          "tags": [
            "Design",
            "UI/UX"
          ],
          "subtasks": [
            {
              "id": "sub_ui_1",
              "title": "Vẽ luồng Đăng nhập/Đăng ký",
              "is_done": false
            },
            {
              "id": "sub_ui_2",
              "title": "Phác thảo Layout Trang chủ (Dashboard)",
              "is_done": false
            }
          ]
        }
      ]
    }
  ]
};

// Khởi tạo
export const useBoardStore = create<IBoardState>((set) => ({
  board: initialState, 

  fetchBoardData: (boardId: string) => {
    console.log(`Tiến hành fetch data từ BE cho board: ${boardId}`); // Để gọi API sau này
  },
}));