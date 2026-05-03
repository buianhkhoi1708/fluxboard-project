import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { useProjectStore } from '../features/project/store/useProjectStore';
import ProjectMemberList from '../features/project/components/ProjectMemberList';
import ProjectMemberModal from '../features/project/components/ProjectMemberModal';

const ProjectMembersPage = () => {
    const { projectId } = useParams(); 
    const navigate = useNavigate();

    const { members, currentProject, isLoading, fetchProjectMembers, fetchSystemUsers, fetchProjectDetails } = useProjectStore();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [memberToEdit, setMemberToEdit] = useState(null); // null = Thêm mới, có data = Chế độ Edit

    useEffect(() => {
        // Gọi dữ liệu khi vừa vào trang
        if (projectId) {
            fetchProjectMembers(projectId);
            fetchSystemUsers(); // Lấy luôn danh bạ công ty dự phòng cho Modal
            fetchProjectDetails(projectId);
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

    return (
        <div className="min-h-screen bg-slate-50/50 pb-12">
            
            {/* Thanh Header Điều hướng */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate('/workspaces')} 
                            className="p-2 bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors outline-none"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <Users size={22} className="text-indigo-600"/> 
                                {currentProject?.name || 'Đang tải dự án...'} 
                            </h1>
                            <p className="text-sm text-slate-500 font-medium">Thiết lập quyền truy cập cho dự án</p>
                        </div>
                    </div>

                    <button 
                        onClick={handleOpenAddModal}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-indigo-200 transition-all active:scale-95 outline-none"
                    >
                        <Plus size={18} /> Mời thành viên
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-6 mt-8">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                        <p className="font-medium">Đang tải danh sách nhân sự...</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-700">Thành viên tham gia ({members.length})</h3>
                        </div>
                        
                        <ProjectMemberList 
                            members={members} 
                            projectId={projectId} 
                            onEditRequest={handleOpenEditModal} 
                        />
                    </>
                )}
            </div>

            {/* Tích hợp Modal */}
            <ProjectMemberModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                projectId={projectId}
                editMember={memberToEdit}
            />
            
        </div>
    );
};

export default ProjectMembersPage;