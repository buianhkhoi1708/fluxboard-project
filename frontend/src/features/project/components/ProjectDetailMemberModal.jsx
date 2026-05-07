import React, { useState, useEffect } from 'react';
import { X, Search, Shield, User, Check, AlertCircle } from 'lucide-react';
import { useProjectStore } from '../store/useProjectDetailStore';

const AVAILABLE_ROLES = [
    { id: 'PROJECT_ADMIN', label: 'Quản trị viên', desc: 'Toàn quyền cấu hình dự án và nhân sự', color: 'text-rose-600 bg-rose-50' },
    { id: 'MEMBER', label: 'Thành viên', desc: 'Có thể tạo, sửa và kéo thả công việc', color: 'text-indigo-600 bg-indigo-50' },
    { id: 'VIEWER', label: 'Người xem', desc: 'Chỉ xem dữ liệu, không thể chỉnh sửa', color: 'text-slate-600 bg-slate-100' }
];

const ProjectMemberModal = ({ isOpen, onClose, projectId, editMember = null }) => {
    const { systemUsers, addMember, updateMember, isActionLoading } = useProjectStore();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRole, setSelectedRole] = useState('MEMBER'); // Mặc định là MEMBER
    const [isActive, setIsActive] = useState(true);
    const [error, setError] = useState('');

    // Reset/Set Form mỗi khi mở Modal
    useEffect(() => {
        if (isOpen) {
            if (editMember) {
                // Chế độ Sửa
                setSelectedUserId(editMember.user?.id);
                setSelectedRole(editMember.role_ids?.[0] || 'MEMBER');
                setIsActive(editMember.active);
            } else {
                // Chế độ Thêm mới
                setSearchQuery('');
                setSelectedUserId('');
                setSelectedRole('MEMBER');
                setIsActive(true);
            }
            setError('');
        }
    }, [isOpen, editMember]);

    if (!isOpen) return null;

    // Lọc danh bạ (ẩn những người đã có trong dự án nếu đang ở chế độ thêm mới)
    const filteredUsers = systemUsers.filter(u => 
        (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const toggleRole = (role_ids) => {
        setSelectedRoles(prev => 
            prev.includes(role_ids) 
                ? prev.filter(id => id !== role_ids) 
                : [...prev, role_ids]
        );
    };

    const handleSubmit = async () => {
        setError('');
        if (!selectedUserId && !editMember) return setError('Vui lòng chọn một thành viên.');
        if (!selectedRole) return setError('Vui lòng chọn quyền hạn.');
        
        const roleArrayToSend = [selectedRole];

        let success = false;
        if (editMember) {
            success = await updateMember(projectId, editMember.id, roleArrayToSend, isActive);
        } else {
            success = await addMember(projectId, selectedUserId, roleArrayToSend);
        }

        if (success) onClose();
        else setError('Có lỗi xảy ra, vui lòng thử lại.');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 py-8">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={onClose}></div>

            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {editMember ? <Shield size={20} className="text-indigo-600"/> : <User size={20} className="text-indigo-600"/>}
                        {editMember ? 'Cập nhật Quyền hạn' : 'Thêm Thành viên mới'}
                    </h3>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium">
                            <AlertCircle size={16}/> {error}
                        </div>
                    )}

                    {/* Chọn Người (Chỉ hiện khi thêm mới) */}
                    {!editMember && (
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-700">1. Chọn thành viên từ hệ thống</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Tìm theo tên hoặc email..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                                />
                            </div>

                            <div className="h-48 overflow-y-auto border border-slate-200 rounded-xl custom-scrollbar">
                                {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                    <div 
                                        key={user.id} 
                                        onClick={() => setSelectedUserId(user.id)}
                                        className={`flex items-center gap-3 p-3 cursor-pointer border-b border-slate-100 last:border-0 transition-colors ${selectedUserId === user.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                                    >
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shadow-sm"/>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">{user.full_name?.charAt(0)}</div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-bold truncate ${selectedUserId === user.id ? 'text-indigo-900' : 'text-slate-700'}`}>{user.full_name}</p>
                                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                        </div>
                                        {selectedUserId === user.id && <Check size={18} className="text-indigo-600"/>}
                                    </div>
                                )) : (
                                    <div className="p-4 text-center text-sm text-slate-500">Không tìm thấy người dùng phù hợp.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Hiển thị người đang sửa (Chế độ Edit) */}
                    {editMember && (
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                            {editMember.user?.avatar_url ? (
                                <img src={editMember.user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shadow-sm"/>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">{editMember.user?.full_name?.charAt(0)}</div>
                            )}
                            <div>
                                <p className="text-sm font-bold text-slate-800">{editMember.user?.full_name}</p>
                                <p className="text-xs text-slate-500">Đang điều chỉnh quyền hạn...</p>
                            </div>
                        </div>
                    )}

                    {/* Chọn Quyền hạn (Đa quyền) */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700">{editMember ? '1' : '2'}. Gán quyền</label>
                        <div className="grid gap-2">
                            {AVAILABLE_ROLES.map(role => (
                                <div 
                                    key={role.id}
                                    onClick={() => setSelectedRole(role.id)} // 👉 ĐÃ SỬA: Gán thẳng giá trị thay vì toggle
                                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedRole === role.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200'}`}
                                >
                                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-colors ${selectedRole === role.id ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                                        {selectedRole === role.id && <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in" />}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold ${selectedRole === role.id ? 'text-indigo-900' : 'text-slate-700'}`}>{role.label}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{role.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Trạng thái Đình chỉ (Chỉ hiện khi Edit) */}
                    {editMember && (
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-800">Trạng thái hoạt động</p>
                                <p className="text-xs text-slate-500">Tắt để tạm thời cấm người này truy cập dự án.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Hủy bỏ</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isActionLoading}
                        className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isActionLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        {editMember ? 'Lưu thay đổi' : 'Thêm vào dự án'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ProjectMemberModal;