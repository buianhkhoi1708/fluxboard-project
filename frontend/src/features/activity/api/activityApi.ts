import axiosClient from '../../../lib/axiosClient';

// Định nghĩa Meta
export interface PaginationMeta {
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// Định nghĩa Activity
export interface Activity {
  id: string;
  message: string;
  actor: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  };
  created_at: string;
  action: string;
  source_type: string;
}

// 🚀 Nâng cấp: Đổi sang string[] để dễ quản lý state trên UI
export interface ActivityFilters {
  sourceTypes?: string[]; 
  actions?: string[];
  from?: string; // Lưu ý: Cần format chuẩn ISO-8601 (VD: "2026-05-08T15:41:34Z")
  to?: string;
  actorUserIds?: string[];
  projectId?: string;
}

export interface ActivityListResponse {
  success: boolean;
  code: string;
  message: string;
  data: Activity[];
  meta: PaginationMeta;
}

export const activityApi = {
  getAdminLogs: (page = 0, size = 20, filters: any = {}): Promise<ActivityListResponse> => {
    const paramsToSend: any = { page, size };

    // 🛡️ BỌC THÉP: Bất chấp Component gửi xuống là Chuỗi ("Task") hay Mảng (["Task"])
    if (filters.sourceTypes) {
      // Ép nó thành mảng hết, rồi viết hoa toàn bộ
      const sources = Array.isArray(filters.sourceTypes) ? filters.sourceTypes : [filters.sourceTypes];
      paramsToSend.source_type = sources.map((s: string) => String(s).toUpperCase()).join(',');
    }
    
    if (filters.actions) {
      const actions = Array.isArray(filters.actions) ? filters.actions : [filters.actions];
      paramsToSend.action = actions.map((a: string) => String(a).toUpperCase()).join(',');
    }
    
    if (filters.actorUserIds) {
      const actors = Array.isArray(filters.actorUserIds) ? filters.actorUserIds : [filters.actorUserIds];
      paramsToSend.actor_user_id = actors.join(',');
    }
    
    // Xử lý các params khác
    if (filters.projectId) paramsToSend.project_id = filters.projectId;
    if (filters.from) paramsToSend.from = filters.from;
    if (filters.to) paramsToSend.to = filters.to;

    // 🐛 RADAR: Sếp xem log này ở F12 để biết chính xác frontend đang gửi gì nhé!
    console.log("🚀 Payload gửi xuống Backend:", paramsToSend);

    return axiosClient.get(`/activities`, { params: paramsToSend });
  }
};