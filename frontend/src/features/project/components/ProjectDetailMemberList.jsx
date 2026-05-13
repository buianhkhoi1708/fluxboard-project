import React, { useState } from 'react';
import { MoreVertical, Shield, ShieldOff, Edit2, Trash2 } from 'lucide-react';
import { useProjectStore } from '../store/useProjectDetailStore';

const ProjectMemberList = ({ members, projectId, onEditRequest }) => {
    const { removeMember } = useProjectStore();
    const [openMenuId, setOpenMenuId] = useState(null);

    const handleDelete = async (memberId, memberName) => {
        if (window.confirm(`Bạn có chắc chắn muốn XÓA HẲN [${memberName}] khỏi dự án? Hành động này có thể gây mất dữ liệu task do người này tạo.`)) {
            await removeMember(projectId, memberId);
        }
        setOpenMenuId(null);
    };

    const getRoleBadge = (role_ids) => {
        switch(role_ids) {
            case 'PROJECT_ADMIN': return <span key={role_ids} className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 rounded border border-rose-200">ADMIN</span>;
            case 'MEMBER': return <span key={role_ids} className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded border border-indigo-200">MEMBER</span>;
            case 'VIEWER': return <span key={role_ids} className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 rounded border border-slate-300">VIEWER</span>;
            default: return <span key={role_ids} className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded border border-slate-200">{role_ids}</span>;
        }
    };

    if (!members || members.length === 0) {
        return <div className="text-center py-10 text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">Chưa có thành viên nào trong dự án này.</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {members.map(member => (
                <div key={member.id} className={`relative flex items-start gap-3 p-4 rounded-2xl border transition-all ${member.active ? 'bg-white border-slate-200 shadow-sm hover:shadow-md' : 'bg-slate-50 border-slate-200 opacity-70'}`}>
                    
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        {member.user?.avatar_url ? (
                            <img src={member.user.avatar_url} alt="" className={`w-12 h-12 rounded-full object-cover shadow-sm ${!member.active && 'grayscale'}`}/>
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-black text-lg shadow-sm">
                                {member.user?.full_name?.charAt(0)}
                            </div>
                        )}
                        {/* Chấm trạng thái */}
                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${member.active ? 'bg-emerald-500' : 'bg-rose-500'}`} title={member.active ? 'Đang hoạt động' : 'Bị đình chỉ'}></div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pt-0.5">
                        <h4 className="text-sm font-bold text-slate-800 truncate" title={member.user?.full_name}>{member.user?.full_name}</h4>
                        <p className="text-[11px] text-slate-500 truncate mb-1.5">{member.user?.email || 'No email'}</p>
                        
                        {/* Mảng Roles */}
                        <div className="flex flex-wrap gap-1">
                            {(member.role_ids || []).map(r => getRoleBadge(r))}
                        </div>
                    </div>

                    {/* Nút 3 chấm Dropdown */}
                    <div className="relative">
                        <button 
                            onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                            <MoreVertical size={16}/>
                        </button>
                        
                        {openMenuId === member.id && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)}></div>
                                <div className="absolute right-0 top-8 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20 animate-in fade-in zoom-in-95 overflow-hidden">
                                    <button 
                                        onClick={() => { onEditRequest(member); setOpenMenuId(null); }}
                                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2"
                                    >
                                        <Edit2 size={14} /> Chỉnh sửa Quyền
                                    </button>
                                    <div className="h-px bg-slate-100 my-1"></div>
                                    <button 
                                        onClick={() => handleDelete(member.id, member.user?.full_name)}
                                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                    >
                                        <Trash2 size={14} /> Xóa khỏi dự án
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ProjectMemberList;