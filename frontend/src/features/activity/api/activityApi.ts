import axiosClient from '../../../lib/axiosClient';

export interface PaginationMeta {
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface ActivityActor {
  user_id?: string;
  userId?: string;
  full_name?: string;
  fullName?: string;
  email?: string;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  role_id?: string;
  roleId?: string;
  role_name?: string;
  roleName?: string;
  status?: string;
}

export interface Activity {
  id: string;
  activity_type?: string;
  activityType?: string;
  message: string;
  actor?: ActivityActor;
  target_user?: ActivityActor;
  targetUser?: ActivityActor;
  actor_role_name?: string;
  actorRoleName?: string;
  target_role_name?: string;
  targetRoleName?: string;
  created_at?: string;
  createdAt?: string;
  action: string;
  source_type?: string;
  sourceType?: string;
  ip_address?: string;
  ipAddress?: string;
  device_info?: string;
  deviceInfo?: string;
  metadata?: Record<string, any>;
}

export interface AccountUser {
  id: string;
  email: string;
  full_name?: string;
  fullName?: string;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  role_id?: string;
  roleId?: string;
  role_name?: string;
  roleName?: string;
  status?: string;
  online?: boolean;
  last_seen_at?: string;
  lastSeenAt?: string;
}

export interface ActivityFilters {
  sourceTypes?: string[];
  actions?: string[];
  from?: string;
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

const toArray = (value: any): any[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.content)) return value.data.content;
  return [];
};

const unwrapData = (res: any) => res?.data || res;

const normalizeMeta = (meta: any, page: number, size: number, length: number): PaginationMeta => ({
  page: meta?.page ?? meta?.page_number ?? page,
  size: meta?.size ?? meta?.page_size ?? size,
  total_elements: meta?.total_elements ?? meta?.totalElements ?? length,
  total_pages: meta?.total_pages ?? meta?.totalPages ?? 1,
  has_next: meta?.has_next ?? meta?.hasNext ?? false,
  has_previous: meta?.has_previous ?? meta?.hasPrevious ?? page > 0,
});

const buildParams = (page: number, size: number, tab: string, filters: ActivityFilters = {}) => {
  const paramsToSend: any = { page, size, tab };

  if (filters.sourceTypes?.length) {
    paramsToSend.source_type = filters.sourceTypes.map((s) => String(s).toUpperCase()).join(',');
  }

  if (filters.actions?.length) {
    paramsToSend.action = filters.actions.map((a) => String(a).toUpperCase()).join(',');
  }

  if (filters.actorUserIds?.length) {
    paramsToSend.actor_user_id = filters.actorUserIds.join(',');
  }

  if (filters.projectId) paramsToSend.project_id = filters.projectId;
  if (filters.from) paramsToSend.from = filters.from;
  if (filters.to) paramsToSend.to = filters.to;

  return paramsToSend;
};

export const activityApi = {
  getLogs: async (
    page = 0,
    size = 20,
    tab: 'activity_log' | 'security_audit' = 'activity_log',
    filters: ActivityFilters = {}
  ): Promise<ActivityListResponse> => {
    const res: any = await axiosClient.get('/activities', {
      params: buildParams(page, size, tab, filters),
    });

    const payload = unwrapData(res);
    const data = toArray(payload);
    const meta = normalizeMeta(payload?.meta, page, size, data.length);

    return {
      success: payload?.success ?? true,
      code: payload?.code ?? 'SUCCESS',
      message: payload?.message ?? 'OK',
      data,
      meta,
    };
  },

  getAdminLogs: (page = 0, size = 20, filters: ActivityFilters = {}) => {
    return activityApi.getLogs(page, size, 'activity_log', filters);
  },

  getSecurityLogs: (page = 0, size = 20, filters: ActivityFilters = {}) => {
    return activityApi.getLogs(page, size, 'security_audit', filters);
  },

  getAccounts: async (page = 0, size = 100): Promise<AccountUser[]> => {
    const res: any = await axiosClient.get('/users/accounts', { params: { page, size } });
    return toArray(unwrapData(res));
  },

  updateAccountRole: async (userId: string, roleId: string) => {
    const res: any = await axiosClient.patch(`/users/accounts/${userId}/role`, { role_id: roleId });
    return unwrapData(res);
  },

  deleteAccount: async (userId: string) => {
    const res: any = await axiosClient.delete(`/users/accounts/${userId}`);
    return unwrapData(res);
  },
};