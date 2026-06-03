import React, { useState } from 'react';
import { Plus, Loader2, Users } from 'lucide-react';
import { useProjectMembersDetail } from '../hooks/useProjectQueries';
import ProjectMemberList from './ProjectDetailMemberList';
import ProjectMemberModal from './ProjectDetailMemberModal';

const ProjectMembersTab = ({ projectId }) => {
    // 🚀 LẤY DATA BẰNG REACT QUERY
    const { data: apiMembers, isLoading } = useProjectMembersDetail(projectId);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [memberToEdit, setMemberToEdit] = useState(null);

    // Chắc chắn members luôn là một mảng
    const members = Array.isArray(apiMembers) ? apiMembers : [];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-14 md:py-20 gap-3 md:gap-4 text-slate-400">
                <Loader2 size={32} className="animate-spin text-indigo-500 w-7 h-7 md:w-8 md:h-8" />
                <p className="text-xs md:text-sm font-medium">Đang tải danh sách nhân sự...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-300">
            {/* 🏆 HEADER RESPONSIVE: Xếp dọc trên mobile, dàn ngang trên màn hình lớn */}
            <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Users size={18} className="text-indigo-600 md:w-5 md:h-5" />
                    Thành viên tham gia ({members.length})
                </h3>
                
                <button 
                    onClick={() => { setMemberToEdit(null); setIsOpen(true); }} // Giữ nguyên State của chồng
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 md:gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2.5 sm:px-4 sm:py-2 rounded-xl font-bold text-xs md:text-sm shadow-sm transition-all active:scale-95 outline-none shrink-0"
                >
                    <Plus size={16} className="w-3.5 h-3.5 md:w-4 md:h-4" /> Mời thành viên
                </button>
            </div>
            
            <ProjectMemberList 
                members={members} 
                projectId={projectId} 
                onEditRequest={(memberData) => { setMemberToEdit(memberData); setIsModalOpen(true); }} 
            />

            <ProjectMemberModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                projectId={projectId}
                editMember={memberToEdit}
            />
        </div>
    );
};

export default ProjectMembersTab;