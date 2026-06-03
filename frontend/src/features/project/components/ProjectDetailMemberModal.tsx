import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Shield, CheckCircle2, Loader2, Sparkles, AlertCircle, Fingerprint } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../lib/axiosClient'; 
import { useAddProjectMember, useUpdateProjectMember } from '../hooks/useProjectQueries';

const ProjectDetailMemberModal = ({ isOpen, onClose, projectId, editMember }: any) => {
    const { mutateAsync: addMember, isPending: isAdding } = useAddProjectMember(projectId);
    const { mutateAsync: updateMember, isPending: isUpdating } = useUpdateProjectMember(projectId);
    
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRole, setSelectedRole] = useState(''); // Lưu ID của Role thật
    const [isActive, setIsActive] = useState(true);

    // Lọc quyền safe-list: Chỉ hiện các vai trò phổ biến cho modal này
    const ALLOWED_PROJECT_ROLES = ['PM', 'LEAD', 'MEMBER', 'VIEWER'];

    // ==========================================
    // 1. FETCH USERS VỚI THIẾT KẾ BỌC THÉP
    // ==========================================
    const { data: systemUsers = [], isLoading: isUsersLoading } = useQuery({
        queryKey: ['all-system-users'],
        queryFn: async () => {
            // ⚠️ Nhớ đổi path API thật của sếp tại đây (VD: '/api/v1/users')
            const response: any = await axiosClient.get('/users', { params: { size: 100 } });
            
            if (Array.isArray(response)) return response; 
            if (Array.isArray(response.data)) return response.data; 
            if (Array.isArray(response.data?.data?.content)) return response.data.data.content;
            if (Array.isArray(response.data?.data)) return response.data.data;
            return [];
        },
        enabled: isOpen, 
    });

    // ==========================================
    // 2. FETCH ROLES ĐỘNG & LỌC QUYỀN
    // ==========================================
    const { data: systemRoles = [], isLoading: isRolesLoading } = useQuery({
        queryKey: ['filtered-project-roles'],
        queryFn: async () => {
            const response: any = await axiosClient.get('/rbac/roles', { params: { size: 100 } });
            
            // Format data trả về thành mảng
            let rawRoles: any[] = [];
            if (Array.isArray(response)) rawRoles = response; 
            else if (Array.isArray(response.data)) rawRoles = response.data; 
            else if (Array.isArray(response.data?.data?.content)) rawRoles = response.data.data.content;
            else if (Array.isArray(response.data?.data)) rawRoles = response.data.data;
            else rawRoles = [];

            // 🚀 BƯỚC LỌC QUYỀN TRỰC QUAN: Chỉ giữ lại các vai trò trong safe-list
            return rawRoles.filter((role: any) => ALLOWED_PROJECT_ROLES.includes(role.name?.toUpperCase()));
        },
        enabled: isOpen, 
    });

    // ==========================================
    // 3. LOGIC ĐỒNG BỘ CASCADING
    // ==========================================
    useEffect(() => {
        if (isOpen) {
            if (editMember) {
                const safeUserId = editMember.userId || editMember.user_id || editMember.user?.id;
                const roles = editMember.roleIds || editMember.role_ids || [];
                setSelectedUserId(safeUserId || '');
                setSelectedRole(roles.length > 0 ? roles[0] : '');
                setIsActive(editMember.active !== false);
            } else {
                setSelectedUserId('');
                setIsActive(true);
            }
        }
    }, [isOpen, editMember]);

    // Tự động chọn Role mặc định (MEMBER) khi data load xong cho chế độ Tạo mới
    useEffect(() => {
        if (isOpen && !editMember && systemRoles.length > 0 && !selectedRole) {
            const defaultRole = systemRoles.find((r: any) => r.name?.toUpperCase().includes('MEMBER')) || systemRoles[0];
            if (defaultRole) {
                setSelectedRole(defaultRole.id);
            }
        }
    }, [isOpen, editMember, systemRoles, selectedRole]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!selectedUserId) return alert("Vui lòng chọn người dùng!");
        if (!selectedRole) return alert("Vui lòng gán một vai trò!");
        
        try {
            if (editMember) {
                await updateMember({ memberId: selectedUserId, roleIds: [selectedRole], isActive });
            } else {
                await addMember({ userId: selectedUserId, roleIds: [selectedRole] });
            }
            onClose();
        } catch (error: any) {
            console.error("Lỗi:", error);
            alert(`Lỗi: ${error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!'}`);
        }
    };

    const isProcessing = isAdding || isUpdating;

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}></div>
            
            <div className="relative bg-[#F8FAFC] rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100 max-h-[92vh]">
                
                {/* 🏆 HEADER TRỰC QUAN */}
                <div className="px-4 md:px-6 py-4 md:py-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner shrink-0">
                            {editMember ? <Shield size={20} className="md:w-6 md:h-6" /> : <UserPlus size={20} className="md:w-6 md:h-6" />}
                        </div>
                        <div>
                            <h3 className="text-lg md:text-xl font-extrabold text-slate-950 tracking-tight leading-tight">
                                {editMember ? 'Cập nhật Quyền & Trạng thái' : 'Mời Thành Viên Vào Dự Án'}
                            </h3>
                            <p className="text-[11px] md:text-sm text-slate-500 font-medium mt-0.5 md:mt-1 line-clamp-1">
                                Cấu hình vai trò và quyền hạn chi tiết cho nhân sự.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 md:p-2 rounded-full transition-colors shrink-0">
                        <X size={18} className="md:w-5 md:h-5" />
                    </button>
                </div>

                {/* 🏆 BODY VỚI GRID LAYOUT */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-5 md:space-y-6 lg:space-y-8 custom-scrollbar">
                    
                    {/* KHỐI 1: CHỌN NGƯỜI DÙNG */}
                    <div className="bg-white p-4 md:p-5 lg:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm">
                        <label className="block text-[11px] md:text-xs font-bold text-slate-500 uppercase mb-2.5 md:mb-3 tracking-widest flex items-center gap-1.5 md:gap-2">
                           <Fingerprint size={14} className="text-slate-400" /> Bước 1: Chọn Người dùng *
                        </label>
                        <select 
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            disabled={!!editMember || isUsersLoading}
                            className="w-full px-4 md:px-5 py-2.5 md:py-3 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-[13px] md:text-sm font-semibold transition-all disabled:bg-slate-50 disabled:text-slate-500 appearance-none bg-slate-50 hover:bg-slate-100 cursor-pointer"
                        >
                            <option value="" disabled>
                                {isUsersLoading ? 'Đang tải danh sách nhân sự...' : ' -- Click để chọn một người dùng từ hệ thống --'}
                            </option>
                            {systemUsers?.map((u: any) => (
                                <option key={u.id} value={u.id}>
                                    {u.full_name || u.name || u.username} ({u.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* KHỐI 2: CHỌN VAI TRÒ (DẠNG CARDS TRỰC QUAN) */}
                    <div className="bg-white p-4 md:p-5 lg:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm">
                        <label className="block text-[11px] md:text-xs font-bold text-slate-500 uppercase mb-3 md:mb-4 tracking-widest flex items-center gap-1.5 md:gap-2">
                           <Sparkles size={14} className="text-slate-400" /> Bước 2: Cấu hình Quyền (Role) *
                        </label>
                        
                        {isRolesLoading ? (
                             <div className="flex flex-col items-center justify-center py-8 md:py-10 text-slate-400 gap-2 md:gap-3 border-2 border-dashed border-slate-100 rounded-xl md:rounded-2xl">
                                <Loader2 size={28} className="animate-spin text-indigo-500 md:w-8 md:h-8" />
                                <span className="text-[13px] md:text-sm font-medium">Đang tải hệ thống phân quyền...</span>
                             </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 content-start">
                                {systemRoles?.map((role: any) => {
                                    const isSelected = selectedRole === role.id;
                                    return (
                                        <button 
                                            key={role.id}
                                            type="button"
                                            onClick={() => setSelectedRole(role.id)}
                                            className={`group relative flex flex-col p-4 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all duration-200 text-left h-full ${
                                                isSelected 
                                                    ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-100' 
                                                    : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50 hover:shadow-md'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3 mb-2.5 md:mb-3 shrink-0 w-full">
                                                <div className={`p-1.5 md:p-2 rounded-lg md:rounded-xl border ${isSelected ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                    <Shield size={16} className="md:w-[18px] md:h-[18px]" />
                                                </div>
                                                {isSelected && <CheckCircle2 size={18} className="text-indigo-600 shrink-0 animate-in zoom-in md:w-5 md:h-5" />}
                                            </div>
                                            
                                            <div className="flex-1 flex flex-col justify-between w-full">
                                                <div>
                                                    <h4 className={`font-bold text-[13px] md:text-sm tracking-tight mb-0.5 md:mb-1 ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                                                        {role.name || role.code}
                                                    </h4>
                                                    <p className={`text-[10px] md:text-[11px] font-medium leading-relaxed ${isSelected ? 'text-indigo-800 opacity-90' : 'text-slate-500'}`}>
                                                        {role.description || 'Quyền hạn cơ bản trong hệ thống.'}
                                                    </p>
                                                </div>
                                                
                                                {/* Hiển thị tóm tắt quyền khi được chọn */}
                                                {isSelected && role.permissions?.length > 0 && (
                                                    <div className="mt-3 md:mt-4 pt-2 md:pt-3 border-t border-indigo-200 space-y-1.5 animate-in fade-in duration-300 w-full">
                                                        <p className="text-[9px] md:text-[10px] font-black text-indigo-700 uppercase tracking-widest">Quyền hạn chính:</p>
                                                        {role.permissions.slice(0, 3).map((p: any) => (
                                                            <div key={p.id} className="text-[10px] font-semibold text-indigo-900 flex items-center gap-1.5 line-clamp-1">
                                                                <div className="w-1 h-1 bg-indigo-400 rounded-full shrink-0" /> <span className="truncate">{p.name?.toLowerCase().replace('project_', '')}</span>
                                                            </div>
                                                        ))}
                                                        {role.permissions.length > 3 && <p className="text-[10px] font-bold text-indigo-600">+ {role.permissions.length - 3} quyền khác...</p>}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* KHỐI 3: TRẠNG THÁI (CHỈ HIỆN KHI EDIT) */}
                    {editMember && (
                        <div className="bg-white p-4 md:p-5 lg:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <label className="block text-[11px] md:text-xs font-bold text-slate-500 uppercase mb-3 md:mb-4 tracking-widest flex items-center gap-1.5 md:gap-2">
                               <AlertCircle size={14} className="text-slate-400" /> Bước 3: Trạng thái Hoạt động
                            </label>
                            
                            <label className="flex items-center gap-3 md:gap-4 cursor-pointer group w-full sm:w-max p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl hover:bg-slate-100/50 transition-colors">
                                <div className={`w-12 h-6 md:w-14 md:h-7 rounded-full transition-colors relative flex items-center px-1 shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                    <div className={`bg-white w-4 h-4 md:w-5 md:h-5 rounded-full transition-transform shadow-md ${isActive ? 'translate-x-6 md:translate-x-7' : 'translate-x-0'}`}></div>
                                </div>
                                <div className="min-w-0">
                                    <span className={`text-[13px] md:text-sm font-bold block truncate ${isActive ? 'text-emerald-700' : 'text-slate-600'}`}>{isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}</span>
                                    <span className="text-[10px] md:text-xs text-slate-400 font-medium truncate block">{isActive ? 'User có thể truy cập dự án này.' : 'User tạm thời bị chặn truy cập.'}</span>
                                </div>
                            </label>
                        </div>
                    )}
                </div>

                {/* 🏆 FOOTER ĐẸP MẮT */}
                <div className="px-4 md:px-6 lg:px-8 py-4 md:py-5 bg-white border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-2.5 md:gap-3 shrink-0">
                    <button onClick={onClose} disabled={isProcessing} className="w-full sm:w-auto px-5 md:px-6 py-2.5 md:py-3 text-slate-600 hover:bg-slate-100 bg-slate-50 sm:bg-white rounded-xl text-[11px] md:text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50">
                        Hủy bỏ
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isProcessing || !selectedUserId || !selectedRole || isUsersLoading || isRolesLoading} 
                        className="w-full sm:w-auto flex justify-center items-center gap-2 md:gap-2.5 bg-indigo-600 hover:bg-indigo-700 text-white px-6 md:px-8 py-2.5 md:py-3 rounded-xl text-[11px] md:text-xs font-black active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-100 transition-all uppercase tracking-widest"
                    >
                        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        {editMember ? 'Lưu cập nhật' : 'Gán vào dự án'}
                    </button>
                </div>
            </div>

            {/* Custom Scrollbar Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                @media (min-width: 768px) { .custom-scrollbar::-webkit-scrollbar { width: 6px; } }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default ProjectDetailMemberModal;