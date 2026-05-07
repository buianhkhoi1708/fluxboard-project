import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Plus, MoreVertical, KanbanSquare, Users, Search, LayoutGrid, Loader2 } from 'lucide-react';

// 🚀 Imports theo kiến trúc mới
import { useWorkspaces } from '../features/workspaces/hooks/useWorkspaceQueries';
import { useWorkspaceUIStore } from '../features/workspaces/store/useProjectStore';
import CreateProjectModal from '../features/workspaces/components/CreateProjectModal';
import CreateBoardModal from '../features/workspaces/components/CreateBoardModal';

const WorkspacesPage: React.FC = () => {
  // 1. Dùng React Query lấy Data
  const { data: projects = [], isLoading } = useWorkspaces();
  
  // 2. Dùng Zustand quản lý Đóng/Mở Modal
  const { openProjectModal, openBoardModal } = useWorkspaceUIStore();

  const [searchTerm, setSearchTerm] = useState('');

  // 3. Xử lý UI
  const filteredProjects = projects.filter(item => 
    item.project?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-indigo-100">
                <Briefcase className="text-indigo-600" size={24} />
              </div>
              Your Workspaces
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group hidden sm:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" />
              <input 
                type="text" placeholder="Search workspaces..." 
                className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all w-64"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button 
              onClick={openProjectModal}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95"
            >
              <Plus size={18} /> <span>New Workspace</span>
            </button>
          </div>
        </div>

        {/* LOADING & EMPTY STATE */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-80 text-slate-400">
             <Loader2 size={48} className="animate-spin text-indigo-600" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white border border-dashed border-indigo-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
             <Briefcase size={56} className="text-indigo-400 mb-4" />
             <h3 className="text-xl font-bold text-slate-800">No Workspaces Found</h3>
             <button onClick={openProjectModal} className="mt-4 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold">+ Create New Workspace</button>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredProjects.map((item) => {
              const workspace = item.project; 
              const boardsData = item.boards || []; 
              const membersData = item.members || []; 
              if (!workspace) return null; 

              return (
                <section key={workspace.id || workspace._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 transition-all hover:shadow-md">
                  <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
                        <span className="text-lg font-black text-white uppercase">{workspace.name?.charAt(0)}</span>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">{workspace.name}</h2>
                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 mt-1">
                          <span className="flex items-center gap-1.5"><LayoutGrid size={12} /> {boardsData.length} boards</span>
                          <span className="flex items-center gap-1.5"><Users size={12} /> {membersData.length} members</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {boardsData.map((b) => (
                      <Link to={`/board/${b.id || b._id}`} key={b.id || b._id} className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-indigo-300 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                          <KanbanSquare size={18} className="text-indigo-600" />
                          <h3 className="font-bold text-sm text-slate-800 line-clamp-1">{b.name}</h3>
                        </div>
                      </Link>
                    ))}
                    <button 
                      onClick={() => openBoardModal(workspace.id || workspace._id as string)}
                      className="border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all min-h-[104px]"
                    >
                      <Plus size={20} /> <span className="text-xs font-bold uppercase">Create board</span>
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Gọi Component Modals (Props đã được cắt giảm, Store tự quản lý Đóng/Mở) */}
        <CreateProjectModal />
        <CreateBoardModal />
      </div>
    </div>
  );
};

export default WorkspacesPage;