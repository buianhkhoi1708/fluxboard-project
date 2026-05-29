import { useInfiniteQuery } from '@tanstack/react-query';
import { activityApi, ActivityFilters } from './activityApi';

export function useInfiniteAdminLogs(
  tab: 'activity_log' | 'security_audit',
  filters: ActivityFilters
) {
  return useInfiniteQuery({
    queryKey: ['adminLogs', 'infinite', tab, filters],

    queryFn: ({ pageParam = 0 }) => activityApi.getLogs(pageParam, 20, tab, filters),

    initialPageParam: 0,

    getNextPageParam: (lastPage, allPages) => {
      if (lastPage?.meta?.has_next) return allPages.length;
      return undefined;
    },
  });
}