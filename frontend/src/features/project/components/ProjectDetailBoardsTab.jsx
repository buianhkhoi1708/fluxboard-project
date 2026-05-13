import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KanbanSquare, Plus } from 'lucide-react';
import { useProjectStore } from '../store/useProjectDetailStore';
import CreateBoardModal from '../../workspaces/components/CreateBoardModal';

const ProjectBoardsTab = ({ projectId }) => {
    const { boards, fetchProjectOverview } = useProjectStore();
    const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);

    return (
        <div className="animate-in fade-in duration-300">
            <div className="mb-6 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">Danh sách Bảng ({boards.length})</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {boards.map((item) => {
                    const b = item.board;
                    if (!b) return null;
                    return (
                        <Link 
                            to={`/board/${b.id || b._id}`} 
                            key={b.id || b._id}
                            className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all duration-200 overflow-hidden block"
                        >
                            <div className="flex items-center gap-3 mb-3 relative z-10">
                                <div className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <KanbanSquare size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-800 group-hover:text-indigo-700 line-clamp-1">{b.name}</h3>
                                    <p className="text-[11px] text-slate-500">{item.columns?.length || 0} cột</p>
                                </div>
                            </div>
                        </Link>
                    );
                })}

                {/* Nút Tạo Bảng Mới */}
                <button 
                    onClick={() => setIsBoardModalOpen(true)}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-all min-h-[104px]"
                >
                    <Plus size={24} />
                    <span className="text-xs font-bold uppercase">Tạo Bảng mới</span>
                </button>
            </div>

            <CreateBoardModal 
                isOpen={isBoardModalOpen} 
                onClose={() => setIsBoardModalOpen(false)} 
                projectId={projectId} 
                onSuccess={() => {
                    setIsBoardModalOpen(false);
                    fetchProjectOverview(projectId);
                }} 
            />
        </div>
    );
};

export default ProjectBoardsTab;