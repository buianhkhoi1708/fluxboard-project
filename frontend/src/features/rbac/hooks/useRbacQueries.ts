import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../lib/axiosClient';

export const RBAC_KEYS = {
  roles: ['rbac', 'roles'] as const,
};

export interface Role {
  id: string;
  name: string;
  description?: string;
}

const unwrapList = (res: any): any[] => {
  const payload = res?.data || res;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  return [];
};

export const useRolesDictionary = () => {
  return useQuery({
    queryKey: RBAC_KEYS.roles,
    queryFn: async (): Promise<Role[]> => {
      const res: any = await axiosClient.get('/rbac/roles?size=100');
      return unwrapList(res);
    },
    staleTime: 1000 * 60 * 60,
  });
};