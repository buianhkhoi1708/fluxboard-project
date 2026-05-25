import { useSearchParams } from 'react-router-dom';
import { ActivityFilters } from '../api/activityApi'; // Nhớ trỏ đúng đường dẫn

export function useActivityFilters(): [ActivityFilters, (newFilters: ActivityFilters) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. 🚀 ĐỌC TỪ URL: Chẻ chuỗi (string) thành mảng (string[])
  const filters: ActivityFilters = {
    sourceTypes: searchParams.get('sourceTypes')?.split(',') || undefined,
    actions: searchParams.get('actions')?.split(',') || undefined,
    actorUserIds: searchParams.get('actorUserIds')?.split(',') || undefined,
    projectId: searchParams.get('projectId') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  };

  // 2. 🚀 GHI XUỐNG URL: Gom mảng (string[]) thành chuỗi (string)
  const setFilters = (newFilters: ActivityFilters) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      
      Object.entries(newFilters).forEach(([key, value]) => {
        // Nếu giá trị rỗng, hoặc mảng rỗng -> Xóa khỏi URL cho sạch
        if (!value || (Array.isArray(value) && value.length === 0)) {
          params.delete(key);
        } 
        // Nếu là mảng -> Nối lại bằng dấu phẩy
        else if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } 
        // Nếu là chuỗi bình thường
        else {
          params.set(key, String(value));
        }
      });
      
      return params;
    });
  };

  return [filters, setFilters];
}