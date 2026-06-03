import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, AlertTriangle, Trash2, CheckCircle2, XCircle, X, AlertOctagon } from 'lucide-react';
import { 
    useProjectOverview, 
    useUpdateProjectInfo, 
    useDeleteProject 
} from '../hooks/useProjectQueries';

const ProjectSettingsTab = ({ projectId }) => {
    const navigate = useNavigate();

    // 🚀 BỐC DỮ LIỆU BẰNG REACT QUERY
    const { data: projectOverview } = useProjectOverview(projectId);
    const { mutateAsync: updateProject, isPending: isUpdating } = useUpdateProjectInfo(projectId);
    const { mutateAsync: deleteProject, isPending: isDeleting } = useDeleteProject(projectId);

    const currentProject = projectOverview?.project;
    const isActionLoading = isUpdating || isDeleting;

    const [formData, setFormData] = useState({
        name: '',
        status: '',
        departmentId: '',
        ownerId: ''
    });

    const [notification, setNotification] = useState({
        isOpen: false,
        message: '',
        type: 'success'
    });

    // 🚀 STATE CHO MODAL XÓA DỰ ÁN
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const showNotification = (message, type = 'success') => {
        setNotification({ isOpen: true, message, type });
    };

    useEffect(() => {
        if (currentProject) {
            setFormData({
                name: currentProject.name || '',
                status: currentProject.status || 'ACTIVE',
                departmentId: currentProject.departmentId || currentProject.department_id || 'DEP-DEFAULT',
                ownerId: currentProject.ownerId || currentProject.owner_id || '' 
            });
        }
    }, [currentProject]);

    const handleSave = async () => {
        if (!formData.name.trim()) {
            return showNotification("Tên dự án không được để trống!", "error");
        }

        const payloadToSend = {
            name: formData.name,
            status: formData.status,
            department_id: formData.departmentId,
            owner_id: formData.ownerId 
        };

        try {
            await updateProject(payloadToSend);
            showNotification("Đã lưu cài đặt dự án thành công!", "success");
        } catch (error) {
            console.error("Lỗi cập nhật dự án:", error);
            showNotification("Lưu thất bại! Vui lòng kiểm tra lại.", "error");
        }
    };

    // 🚀 HÀM THỰC THI XÓA (GỌI API)
    const executeDelete = async () => {
        try {
            await deleteProject();
            setIsDeleteModalOpen(false); // Đóng modal
            navigate('/workspaces');      // Đá về trang danh sách
        } catch (error) {
            console.error("Lỗi xóa dự án:", error);
            setIsDeleteModalOpen(false);
            showNotification(error.response?.data?.message || "Xóa thất bại! Vui lòng kiểm tra lại.", "error");
        }
    };

    // Đóng modal xóa và reset text
    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setDeleteConfirmText('');
    };

    return (
        <div className="max-w-3xl animate-in fade-in duration-300 relative pb-8 md:pb-12">
            {/* Thông tin chung */}
            <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 p-5 md:p-6 lg:p-8 shadow-sm mb-6 md:mb-8">
                <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 md:mb-5">Thông tin chung</h3>
                
                <div className="space-y-4 md:space-y-5">
                    <div>
                        <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Tên Dự Án</label>
                        <input 
                            type="text" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full px-3.5 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-[13px] md:text-sm font-medium text-slate-700"
                        />
                    </div>

                    <div>
                        <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Trạng thái</label>
                        <select 
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                            className="w-full px-3.5 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-[13px] md:text-sm font-medium text-slate-700 bg-white"
                        >
                            <option value="ACTIVE">Đang hoạt động (Active)</option>
                            <option value="ON_HOLD">Tạm dừng (On Hold)</option>
                            <option value="COMPLETED">Đã hoàn thành (Completed)</option>
                        </select>
                    </div>

                    <div className="pt-2 md:pt-4 flex justify-end">
                        <button 
                            onClick={handleSave}
                            disabled={isActionLoading}
                            className="w-full sm:w-auto flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 md:py-3 rounded-xl font-bold text-[13px] md:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Save size={16} className="md:w-[18px] md:h-[18px]" /> {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-rose-50/50 rounded-2xl md:rounded-3xl border border-rose-200 p-5 md:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4">
                    <div className="p-2.5 md:p-3 bg-rose-100 text-rose-600 rounded-full shrink-0">
                        <AlertTriangle size={20} className="md:w-[24px] md:h-[24px]" />
                    </div>
                    <div className="flex-1 w-full">
                        <h3 className="text-base md:text-lg font-bold text-rose-800">Khu vực Nguy hiểm (Danger Zone)</h3>
                        <p className="text-[12px] md:text-sm text-rose-600/80 mt-1 mb-4 font-medium leading-relaxed">
                            Xóa dự án sẽ xóa vĩnh viễn toàn bộ Bảng (Boards), Cột, và Công việc (Tasks) bên trong. 
                            Hành động này KHÔNG THỂ hoàn tác!
                        </p>
                        <button 
                            onClick={() => setIsDeleteModalOpen(true)}
                            disabled={isActionLoading || !currentProject}
                            className="w-full sm:w-auto flex justify-center items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 md:py-3 rounded-xl mt-2 font-bold text-[13px] md:text-sm shadow-sm transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Trash2 size={16} className="md:w-[18px] md:h-[18px]" /> Xóa vĩnh viễn Dự án
                        </button>
                    </div>
                </div>
            </div>

            {/* 🚀 MODAL XÁC NHẬN XÓA DỰ ÁN (XỊN XÒ) */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" 
                        onClick={closeDeleteModal}
                    ></div>
                    
                    <div className="relative bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-md p-5 md:p-6 lg:p-8 flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4 md:mb-5 text-rose-600">
                            <div className="p-2.5 md:p-3 bg-rose-100 rounded-full">
                                <AlertOctagon size={24} className="md:w-[28px] md:h-[28px]" />
                            </div>
                            <h3 className="text-lg md:text-xl font-black">Xác nhận xóa dự án</h3>
                        </div>

                        <div className="bg-rose-50 border border-rose-100 p-3.5 md:p-4 rounded-xl mb-4 md:mb-5">
                            <p className="text-[13px] md:text-sm text-rose-800 font-medium leading-relaxed">
                                Bạn chuẩn bị xóa vĩnh viễn dự án <span className="font-bold">"{currentProject?.name}"</span>. 
                                Toàn bộ dữ liệu bao gồm bảng, thẻ công việc, và bình luận sẽ bị hủy và không thể khôi phục.
                            </p>
                        </div>

                        <label className="block text-[12px] md:text-sm font-bold text-slate-700 mb-2">
                            Vui lòng nhập <span className="text-rose-600 select-none">"{currentProject?.name}"</span> để xác nhận:
                        </label>
                        <input 
                            type="text" 
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            className="w-full px-3.5 md:px-4 py-2.5 md:py-3 border-2 border-slate-200 rounded-xl focus:ring-rose-200 focus:border-rose-500 outline-none transition-all text-[13px] md:text-sm font-semibold text-slate-800 mb-5 md:mb-6"
                            placeholder="Nhập tên dự án..."
                            autoFocus
                        />

                        <div className="flex flex-col sm:flex-row gap-2.5 md:gap-3 mt-auto">
                            <button 
                                onClick={closeDeleteModal}
                                disabled={isDeleting}
                                className="flex-1 w-full px-4 py-2.5 md:py-3 rounded-xl font-bold text-[13px] md:text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
                            >
                                Hủy bỏ
                            </button>
                            <button 
                                onClick={executeDelete}
                                disabled={deleteConfirmText !== currentProject?.name || isDeleting}
                                className="flex-1 w-full px-4 py-2.5 md:py-3 rounded-xl font-bold text-[13px] md:text-sm text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all active:scale-95 disabled:opacity-50 disabled:bg-rose-300 disabled:shadow-none flex justify-center items-center gap-2"
                            >
                                {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* KHUNG THÔNG BÁO CUSTOM (Giữ nguyên) */}
            {notification.isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" 
                        onClick={() => setNotification({ ...notification, isOpen: false })}
                    ></div>
                    
                    <div className="relative bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-sm p-5 md:p-6 lg:p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setNotification({ ...notification, isOpen: false })}
                            className="absolute top-3 right-3 md:top-4 md:right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 md:p-2 rounded-full transition-colors"
                        >
                            <X size={18} className="md:w-5 md:h-5" />
                        </button>

                        {notification.type === 'success' ? (
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-3 md:mb-4 shrink-0">
                                <CheckCircle2 size={28} className="md:w-[32px] md:h-[32px]" />
                            </div>
                        ) : (
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-3 md:mb-4 shrink-0">
                                <XCircle size={28} className="md:w-[32px] md:h-[32px]" />
                            </div>
                        )}

                        <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-1.5 md:mb-2">
                            {notification.type === 'success' ? 'Thành công!' : 'Có lỗi xảy ra!'}
                        </h3>
                        <p className="text-slate-500 text-[13px] md:text-sm mb-5 md:mb-6">
                            {notification.message}
                        </p>

                        <button
                            onClick={() => setNotification({ ...notification, isOpen: false })}
                            className={`w-full py-2.5 md:py-3 rounded-xl font-bold text-[13px] md:text-sm text-white transition-all active:scale-95 mt-1 md:mt-2 ${
                                notification.type === 'success' 
                                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-200' 
                                    : 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-200'
                            }`}
                        >
                            Đóng lại
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectSettingsTab;