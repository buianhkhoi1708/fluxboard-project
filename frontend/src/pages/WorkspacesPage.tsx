import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Plus, MoreVertical, KanbanSquare, Users, Search, LayoutGrid, Loader2 } from 'lucide-react';

import { useWorkspaces } from '../features/workspaces/hooks/useWorkspaceQueries';
import { useWorkspaceUIStore } from '../features/workspaces/store/useWorkspaceUIStore';
import CreateProjectModal from '../features/workspaces/components/CreateProjectModal';
import CreateBoardModal from '../features/workspaces/components/CreateBoardModal';

const WorkspacesPage: React.FC = () => {
  // 1. Lấy ra các hàm cuộn vô hạn từ React Query
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useWorkspaces();
  
  const { openProjectModal, openBoardModal } = useWorkspaceUIStore();
  const [searchTerm, setSearchTerm] = useState('');

  // 2. Ép mảng 2 chiều (pages) thành mảng 1 chiều để dễ render
  const projects = useMemo(() => {
    return data?.pages.flatMap(page => page.data) || [];
  }, [data]);

  const filteredProjects = projects.filter(item => 
    item.project?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 3. Xử lý bắt sự kiện cuộn chuột tới đáy
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    
    // Nếu khoảng cách cuộn đến đáy <= 50px và vẫn còn trang để tải
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  return (
    <div 
      onScroll={handleScroll} 
      className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8"
    >
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r text-slate-800 to-indigo-900 bg-clip-text text-transparent tracking-tight flex items-center gap-3">
              <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-indigo-100">
                <Briefcase className="text-indigo-600" size={24} />
              </div>
              Your Workspaces
            </h1>
            <p className="text-sm font-medium text-slate-500 pl-12">Manage your workspaces, teams, and Kanban boards.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group hidden sm:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-all duration-200" />
              <input 
                type="text" placeholder="Search workspaces..." 
                className="pl-9 pr-4 py-2.5 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all w-64 font-medium shadow-sm"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button onClick={openProjectModal} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200/50 transition-all active:scale-[0.98]">
              <Plus size={18} strokeWidth={2.5} /> <span>New Workspace</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-80 text-slate-400">
            <Loader2 size={48} className="animate-spin text-indigo-600 relative z-10" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm border border-dashed border-indigo-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
             <div className="p-5 bg-indigo-50 rounded-full mb-5"><Briefcase size={56} className="text-indigo-400" /></div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">No Workspaces Found</h3>
          </div>
        ) : (
          <div className="space-y-8 pb-10">
            {filteredProjects.map((item) => {
              const workspace = item.project; 
              const boardsData = item.boards || []; 
              const membersData = item.members || []; 
              if (!workspace) return null; 

              return (
                <section key={workspace.id || workspace._id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/20 p-5 md:p-6 transition-all hover:shadow-xl hover:border-indigo-200/50">
                  <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200/50 shrink-0">
                        <span className="text-lg font-black text-white uppercase">{workspace.name?.charAt(0) || 'W'}</span>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight">{workspace.name}</h2>
                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 mt-1">
                          <span className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-full"><LayoutGrid size={12} /> {boardsData.length} boards</span>
                          <span className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-full text-slate-500"><Users size={12} /> {membersData.length} members</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {boardsData.map((b) => (
                      <Link to={`/board/${b.id || b._id}`} key={b.id || b._id} className="group relative bg-gradient-to-br from-white to-slate-50/80 border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all duration-200 block overflow-hidden">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="bg-white border border-indigo-100 text-indigo-600 w-9 h-9 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-200"><KanbanSquare size={18} /></div>
                          <h3 className="font-bold text-sm text-slate-800 group-hover:text-indigo-700 transition-colors line-clamp-1">{b.name}</h3>
                        </div>
                      </Link>
                    ))}
                    <button 
                      onClick={() => openBoardModal(workspace.id || workspace._id as string)}
                      className="group border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all duration-200 min-h-[104px]"
                    >
                      <div className="p-1.5 rounded-full bg-slate-100 group-hover:bg-indigo-100 transition-colors"><Plus size={20} strokeWidth={2} /></div>
                      <span className="text-xs font-bold uppercase tracking-wider">Create board</span>
                    </button>
                  </div>
                </section>
              );
            })}
            
            {/* Hiển thị vòng xoay mờ mờ ở dưới cùng khi đang cuộn chuột gọi thêm data */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
              </div>
            )}
          </div>
        )}

        <CreateProjectModal />
        <CreateBoardModal />
      </div>
    </div>
  );
};
export default WorkspacesPage;