import React, { useEffect, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { useProjectStore } from '../store/useProjectDetailStore';
import ProjectMemberList from './ProjectDetailMemberList';
import ProjectMemberModal from './ProjectDetailMemberModal';

const ProjectMembersTab = ({ projectId }) => {
    const { members, isLoading, fetchProjectMembers, fetchSystemUsers } = useProjectStore();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [memberToEdit, setMemberToEdit] = useState(null);

    useEffect(() => {
        if (projectId) {
            fetchProjectMembers(projectId);
            fetchSystemUsers();
        }
    }, [projectId]);

    const handleOpenAddModal = () => {
        setMemberToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (memberData) => {
        setMemberToEdit(memberData);
        setIsModalOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
                <p className="font-medium">Đang tải danh sách nhân sự...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-300">
            <div className="mb-6 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">Thành viên tham gia ({members.length})</h3>
                
                <button 
                    onClick={handleOpenAddModal}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95 outline-none"
                >
                    <Plus size={16} /> Mời thành viên
                </button>
            </div>
            
            <ProjectMemberList 
                members={members} 
                projectId={projectId} 
                onEditRequest={handleOpenEditModal} 
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