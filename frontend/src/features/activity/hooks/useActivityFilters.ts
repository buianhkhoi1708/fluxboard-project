import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ActivityFilters } from '../api/activityApi';

const readList = (value: string | null) => {
  if (!value) return undefined;
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
};

export function useActivityFilters(): [ActivityFilters, (newFilters: ActivityFilters) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchKey = searchParams.toString();

  const filters = useMemo<ActivityFilters>(() => {
    return {
      sourceTypes: readList(searchParams.get('sourceTypes')),
      actions: readList(searchParams.get('actions')),
      actorUserIds: readList(searchParams.get('actorUserIds')),
      projectId: searchParams.get('projectId') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
    };
  }, [searchKey]);

  const setFilters = (newFilters: ActivityFilters) => {
    const params = new URLSearchParams();

    if (newFilters.sourceTypes?.length) {
      params.set('sourceTypes', newFilters.sourceTypes.join(','));
    }

    if (newFilters.actions?.length) {
      params.set('actions', newFilters.actions.join(','));
    }

    if (newFilters.actorUserIds?.length) {
      params.set('actorUserIds', newFilters.actorUserIds.join(','));
    }

    if (newFilters.projectId) {
      params.set('projectId', newFilters.projectId);
    }

    if (newFilters.from) {
      params.set('from', newFilters.from);
    }

    if (newFilters.to) {
      params.set('to', newFilters.to);
    }

    setSearchParams(params);
  };

  return [filters, setFilters];
}