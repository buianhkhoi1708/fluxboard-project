import React, { useState } from 'react';
import { Shield, Mail, Trash2, Edit2, CheckCircle2, XCircle, Search, Users, Fingerprint } from 'lucide-react';
import { useRemoveProjectMember } from '../hooks/useProjectQueries';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../lib/axiosClient';

const ProjectDetailMemberList = ({ members = [], projectId, onEditRequest }: any) => {
    const [searchQuery, setSearchQuery] = useState('');
    const { mutateAsync: removeMember } = useRemoveProjectMember(projectId);

    // 🚀 TỰ ĐỘNG FETCH DATA ROLES ĐỂ MAP TÊN QUYỀN THẬT (Thay vì hardcode)
    const { data: systemRoles = [] } = useQuery({
        queryKey: ['all-system-roles'],
        queryFn: async () => {
            const response: any = await axiosClient.get('/rbac/roles', { params: { size: 100 } });
            if (Array.isArray(response)) return response; 
            if (Array.isArray(response.data)) return response.data; 
            if (Array.isArray(response.data?.data?.content)) return response.data.data.content;
            if (Array.isArray(response.data?.data)) return response.data.data;
            return [];
        }
    });

    // Hàm ánh xạ ID quyền thành Tên quyền đẹp mắt
    const getRoleName = (roleId: string) => {
        const role = systemRoles.find((r: any) => r.id === roleId || r.code === roleId || r.name === roleId);
        return role ? (role.name || role.code) : roleId;
    };

    const filteredMembers = members.filter((m: any) => {
        const name = m.full_name || m.user?.full_name || m.name || m.username || '';
        const email = m.email || m.user?.email || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
               email.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const handleKickMember = async (userId: string, memberName: string) => {
        if (!userId) return alert("Không tìm thấy ID người dùng!");
        if (window.confirm(`Sếp có chắc chắn muốn kick "${memberName}" ra khỏi dự án này không?`)) {
            try {
                await removeMember(userId);
            } catch (error) {
                console.error("Lỗi xóa member:", error);
                alert("Có lỗi xảy ra khi xóa thành viên.");
            }
        }
    };

    return (
        <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            {/* 🏆 TOOLBAR TÌM KIẾM */}
            <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm shrink-0">
                        <Users size={16} className="md:w-[18px] md:h-[18px]" />
                    </div>
                    <div>
                        <h3 className="text-[13px] md:text-sm font-extrabold text-slate-800">Nhân sự Dự án</h3>
                        <p className="text-[10px] md:text-[11px] text-slate-500 font-medium mt-0.5">Tổng cộng {members.length} thành viên</p>
                    </div>
                </div>

                <div className="relative w-full sm:w-72 md:w-80 group">
                    <div className="absolute inset-y-0 left-0 pl-3 md:pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <Search size={14} className="md:w-4 md:h-4" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Tìm theo tên hoặc email..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 md:pl-10 pr-3 md:pr-4 py-2 md:py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] md:text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all w-full font-medium placeholder:text-slate-300 shadow-sm"
                    />
                </div>
            </div>

            {/* 🏆 BẢNG DỮ LIỆU */}
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px] md:min-w-[800px]">
                    <thead>
                        <tr className="bg-white text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="px-4 md:px-6 py-3 md:py-4">Thành viên</th>
                            <th className="px-4 md:px-6 py-3 md:py-4">Vai trò (Role)</th>
                            <th className="px-4 md:px-6 py-3 md:py-4">Trạng thái</th>
                            <th className="px-4 md:px-6 py-3 md:py-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredMembers.length > 0 ? (
                            filteredMembers.map((m: any, idx: number) => {
                                const safeUserId = m.userId || m.user_id || m.user?.id; 
                                const name = m.full_name || m.user?.full_name || m.name || m.username || 'Unnamed User';
                                const email = m.email || m.user?.email || 'Chưa có email';
                                const avatar = m.avatar_url || m.user?.avatar_url;
                                const isActive = m.active !== false; 
                                const roles = m.roleIds || m.role_ids || ['MEMBER']; 
                                
                                return (
                                    <tr key={safeUserId || idx} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            <div className="flex items-center gap-3 md:gap-4">
                                                {avatar ? (
                                                    <img src={avatar} alt={name} className="w-8 h-8 md:w-10 md:h-10 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0" />
                                                ) : (
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700 font-black flex items-center justify-center text-xs md:text-sm shadow-sm border border-indigo-50 shrink-0">
                                                        {name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="font-bold text-slate-900 text-[13px] md:text-sm truncate">{name}</div>
                                                    <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-medium text-slate-500 mt-0.5 truncate">
                                                        <Mail size={10} className="md:w-3 md:h-3 opacity-70 shrink-0" /> <span className="truncate">{email}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            <div className="flex flex-wrap gap-1.5 md:gap-2">
                                                {roles.map((roleId: string) => (
                                                    <span key={roleId} className="flex items-center gap-1 md:gap-1.5 text-[9px] md:text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg uppercase tracking-wider">
                                                        <Shield size={10} className="md:w-3 md:h-3 text-indigo-500 shrink-0" />
                                                        <span className="truncate max-w-[100px] md:max-w-[120px]">{getRoleName(roleId) || 'MEMBER'}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </td>

                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            {isActive ? (
                                                <span className="inline-flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" /> 
                                                    <span className="truncate">Đang hoạt động</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full">
                                                    <XCircle size={12} className="md:w-[14px] md:h-[14px] text-slate-400 shrink-0" /> 
                                                    <span className="truncate">Vô hiệu hóa</span>
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 md:gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => onEditRequest(m)} 
                                                    title="Chỉnh sửa quyền"
                                                    className="p-1.5 md:p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg md:rounded-xl transition-colors"
                                                >
                                                    <Edit2 size={14} className="md:w-4 md:h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleKickMember(safeUserId, name)} 
                                                    title="Khai trừ khỏi dự án"
                                                    className="p-1.5 md:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg md:rounded-xl transition-colors"
                                                >
                                                    <Trash2 size={14} className="md:w-4 md:h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-4 md:px-6 py-12 md:py-16 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <Fingerprint size={40} className="md:w-12 md:h-12 mb-3 md:mb-4 opacity-20" />
                                        <p className="text-[13px] md:text-sm font-bold text-slate-600">Không tìm thấy nhân sự nào</p>
                                        <p className="text-[11px] md:text-xs font-medium mt-1">Hãy thử tìm với một từ khóa khác hoặc mời thêm người mới.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
};

export default ProjectDetailMemberList;