import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Plus, KanbanSquare, Users, Search, LayoutGrid, Loader2 } from 'lucide-react';

// Import hooks và stores
import { useWorkspaces } from '../features/workspaces/hooks/useWorkspaceQueries';
import { useWorkspaceUIStore } from '../features/workspaces/store/useWorkspaceUIStore';

// Import Components
import CreateProjectModal from '../features/workspaces/components/CreateProjectModal';
import CreateBoardModal from '../features/workspaces/components/CreateBoardModal';

const WorkspacesPage: React.FC = () => {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useWorkspaces();
  const { openProjectModal, openBoardModal } = useWorkspaceUIStore();
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Phẳng hóa dữ liệu từ các trang (pages) thành 1 mảng duy nhất
  const allProjects = useMemo(() => data?.pages.flatMap(p => p.data) || [], [data]);

  // 2. Lọc dữ liệu theo ô tìm kiếm
  const filtered = allProjects.filter(p => 
    p.project?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // =======================================================
  // 3. THUẬT TOÁN CUỘN VÔ HẠN (INTERSECTION OBSERVER)
  // =======================================================
  const observer = useRef<IntersectionObserver | null>(null);
  
  const bottomBoundaryRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return; 
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      // Khi thẻ div ở đáy xuất hiện, tải thêm dữ liệu tiếp theo
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, { rootMargin: '150px' }); // Load sớm trước khi chạm đáy 150px

    if (node) observer.current.observe(node);
  }, [isLoading, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="flex-1 bg-slate-50 h-full overflow-y-auto p-6 md:p-10 custom-scrollbar">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-indigo-100">
              <Briefcase className="text-indigo-600" size={24} />
            </div>
            Your Workspaces
          </h1>
          <button 
            onClick={openProjectModal} 
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
            <Plus size={18} /> New Workspace
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="relative mb-8 max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm dự án..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* PROJECT LIST */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
          </div>
        ) : (
          <div className="space-y-8 pb-4">
            {filtered.map((item) => {
              // 🛡️ Bọc lót an toàn tránh lỗi undefined
              const project = item.project;
              const boards = item.boards || [];
              const members = item.members || [];
              const tasks = item.tasks || []; // 🚀 Lấy danh sách tasks

              if (!project) return null;

              return (
                <section key={project.id || project._id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  
                  {/* PROJECT INFO (Avatar, Name, Stats) */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                        {project.name?.charAt(0).toUpperCase() || 'W'}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">{project.name}</h2>
                        <div className="flex gap-4 mt-1">
                          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                            <LayoutGrid size={12} /> {boards.length} Boards
                          </span>
                          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                            <Users size={12} /> {members.length} Members
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BOARDS GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {boards.map(b => (
                      <Link to={`/board/${b.id || b._id}`} key={b.id || b._id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-indigo-300 transition-all group">
                        <div className="flex items-center gap-3 mb-1">
                          <KanbanSquare size={16} className="text-indigo-500" />
                          <span className="font-bold text-sm text-slate-700 group-hover:text-indigo-600 truncate">{b.name}</span>
                        </div>
                      </Link>
                    ))}
                    <button 
                      onClick={() => openBoardModal(project.id || project._id as string)} 
                      className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                    >
                      <Plus size={20} />
                      <span className="text-[10px] font-black uppercase mt-1">Create board</span>
                    </button>
                  </div>

                  {/* 🚀 TASKS LIST DISPLAY */}
                  {tasks.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-slate-100/80">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                        Công việc nổi bật ({tasks.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {/* Render tối đa 4 task đầu tiên để tránh vỡ UI */}
                        {tasks.slice(0, 4).map(task => (
                          <div 
                            key={task.id || task._id} 
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg truncate max-w-[200px]"
                          >
                            <span className="text-indigo-500 mr-1.5">•</span>
                            {task.name}
                          </div>
                        ))}
                        
                        {/* Nếu có nhiều hơn 4 task, hiển thị thẻ đếm số lượng còn lại */}
                        {tasks.length > 4 && (
                          <div className="bg-slate-50 border border-dashed border-slate-300 text-slate-500 text-xs font-bold px-3 py-1.5 rounded-lg">
                            +{tasks.length - 4} tasks khác
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </section>
              );
            })}

            {/* ĐIỂM CẮM VÔ HÌNH Ở ĐÁY: KÍCH HOẠT TẢI DỮ LIỆU */}
            <div ref={bottomBoundaryRef} className="h-4 w-full"></div>

            {/* LOADER: Báo hiệu đang lấy thêm data ngầm */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-indigo-400" size={32} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}
      <CreateProjectModal />
      <CreateBoardModal />
    </div>
  );
};

export default WorkspacesPage;