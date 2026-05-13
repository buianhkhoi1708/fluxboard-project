import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, LayoutGrid, Users, Settings, Loader2 } from 'lucide-react';
import { useProjectStore } from '../features/project/store/useProjectDetailStore';
import ProjectMembersTab from '../features/project/components/ProjectDetailMembersTab';
import ProjectBoardsTab from '../features/project/components/ProjectDetailBoardsTab';
import ProjectSettingsTab from '../features/project/components/ProjectDetailSettingsTab';

const ProjectDetailPage = () => {
    const { projectId } = useParams(); 
    const navigate = useNavigate();
    
    // Lấy tham số tab từ URL
    const [searchParams, setSearchParams] = useSearchParams();
    const { currentProject, isLoading, fetchProjectOverview } = useProjectStore();
    
    // Lấy giá trị tab từ URL (nếu có), nếu không mặc định là 'boards'
    const defaultTab = searchParams.get('tab') || 'boards';
    const [activeTab, setActiveTab] = useState(defaultTab); 

    useEffect(() => {
        if (projectId) fetchProjectOverview(projectId);
    }, [projectId]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setSearchParams({ tab: tabId });
    };

    const TABS = [
        { id: 'boards', label: 'Bảng (Boards)', icon: LayoutGrid },
        { id: 'members', label: 'Thành viên', icon: Users },
        { id: 'settings', label: 'Cài đặt', icon: Settings }
    ];

    return (
        <div className="min-h-screen bg-slate-50/50 pb-12">
            {/* Header: Tiêu đề & Nút Back */}
            <div className="bg-white px-6 pt-6 sticky top-0 z-20 border-b border-slate-200">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-4 mb-6">
                        <button 
                            onClick={() => navigate('/workspaces')} 
                            className="p-2 bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors outline-none"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                {currentProject?.name || (isLoading ? 'Đang tải...' : 'Chi tiết Dự án')}
                            </h1>
                            <p className="text-sm text-slate-500 font-medium mt-1">Quản lý không gian làm việc và nhân sự</p>
                        </div>
                    </div>

                    {/* Dãy Menu Tabs */}
                    <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`flex items-center gap-2 pb-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap outline-none ${
                                        isActive 
                                            ? 'border-indigo-600 text-indigo-600' 
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                    }`}
                                >
                                    <Icon size={16} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Nội dung của từng Tab */}
            <div className="max-w-6xl mx-auto px-6 mt-8">
                {activeTab === 'boards' && (
                    <ProjectBoardsTab projectId={projectId} />
                )}
                
                {activeTab === 'members' && (
                    <ProjectMembersTab projectId={projectId} />
                )}
                
                {activeTab === 'settings' && (
                    <ProjectSettingsTab projectId={projectId} />
                )}
            </div>
        </div>
    );
};

export default ProjectDetailPage;