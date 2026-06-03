import React, { useState, useEffect } from 'react';
import { X, KanbanSquare, Loader2, Sparkles, LayoutTemplate } from 'lucide-react';
import { useCreateBoard } from '../hooks/useWorkspaceQueries';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../lib/axiosClient'; // Đảm bảo đường dẫn này đúng với project của sếp

// 🚀 Khai báo định dạng Props truyền từ cha xuống
interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  onSuccess?: () => void;
}

type BoardMode = 'standard' | 'ai';

const CreateBoardModal: React.FC<CreateBoardModalProps> = ({ 
  isOpen, 
  onClose, 
  projectId, 
  onSuccess 
}) => {
  const { mutate: createBoard, isPending } = useCreateBoard();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [mode, setMode] = useState<BoardMode>('standard'); // Mặc định mở lên là tạo bảng thường

  // 🚀 TỰ ĐỘNG KÉO THÀNH VIÊN PROJECT NẾU CHỌN CHẾ ĐỘ AI
  const { data: projectMembers = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ['project-members-for-ai', projectId],
    queryFn: async () => {
      // Gọi API lấy danh sách thành viên của Project (nhớ check lại URL nếu Backend sếp có khác)
      const response: any = await axiosClient.get(`/projects/${projectId}/members`);
      return response.data?.data || response.data || [];
    },
    // Tối ưu: Chỉ gọi API khi bật Modal, có ID project và người dùng bấm sang tab AI
    enabled: isOpen && !!projectId && mode === 'ai', 
  });

  // Reset form mỗi khi mở lại modal
  useEffect(() => {
    if (isOpen) {
      setName('');
      setMode('standard');
    }
  }, [isOpen]);

  // 🚀 CHỐT CHẶN
  if (!isOpen || !projectId) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ================= CHẾ ĐỘ 1: TẠO BẢNG THƯỜNG =================
    if (mode === 'standard') {
      if (!name.trim()) return;

      createBoard(
        { project_id: projectId, name: name.trim() },
        {
          onSuccess: () => {
            onClose(); 
            if (onSuccess) onSuccess(); 
          },
          onError: (err: any) => alert(`Lỗi: ${err.response?.data?.message || 'Có lỗi xảy ra'}`)
        }
      );
    } 
    // ================= CHẾ ĐỘ 2: SANG TRANG AI BOARD =================
    else {
      onClose(); // Tắt Modal hiện tại
      
      // 🚀 Bế ID và Member bay sang trang AI (Sửa cái path string cho khớp với Route React của sếp)
      navigate(`/aigenerateboard`, {
        state: { 
          projectId: projectId,
          members: projectMembers 
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl md:rounded-[1.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-4 md:px-6 py-3.5 md:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <h2 className="text-[15px] md:text-lg font-bold text-slate-800 flex items-center gap-2">
            <KanbanSquare size={18} className="text-indigo-600 md:w-5 md:h-5" /> Khởi tạo Bảng công việc
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-full transition-colors shrink-0">
            <X size={18} className="md:w-5 md:h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6">
          <div className="space-y-5 md:space-y-6">
            
            {/* 🚀 LỰA CHỌN CHẾ ĐỘ TẠO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {/* Card 1: Bảng Thường */}
              <div 
                onClick={() => setMode('standard')}
                className={`cursor-pointer p-3.5 md:p-4 rounded-xl border-2 transition-all flex flex-row sm:flex-col items-center sm:text-center gap-3 md:gap-2 ${
                  mode === 'standard' 
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                    : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50 text-slate-500'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${mode === 'standard' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                  <LayoutTemplate size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="flex-1 sm:flex-none text-left sm:text-center">
                  <h3 className={`text-[13px] md:text-sm font-bold ${mode === 'standard' ? 'text-indigo-900' : 'text-slate-700'}`}>Bảng Tiêu Chuẩn</h3>
                  <p className="text-[11px] mt-0.5 md:mt-1 opacity-70">Tự tạo cột và quản lý thủ công</p>
                </div>
              </div>

              {/* Card 2: AI Board */}
              <div 
                onClick={() => setMode('ai')}
                className={`cursor-pointer p-3.5 md:p-4 rounded-xl border-2 transition-all flex flex-row sm:flex-col items-center sm:text-center gap-3 md:gap-2 ${
                  mode === 'ai' 
                    ? 'border-violet-600 bg-violet-50/50 shadow-sm' 
                    : 'border-slate-100 hover:border-violet-200 hover:bg-slate-50 text-slate-500'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${mode === 'ai' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                  <Sparkles size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="flex-1 sm:flex-none text-left sm:text-center">
                  <h3 className={`text-[13px] md:text-sm font-bold flex items-center sm:justify-center gap-1.5 ${mode === 'ai' ? 'text-violet-900' : 'text-slate-700'}`}>
                    AI Board <span className="px-1.5 py-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[9px] rounded-full uppercase tracking-wider">Mới</span>
                  </h3>
                  <p className="text-[11px] mt-0.5 md:mt-1 opacity-70">Phân rã task tự động bằng AI</p>
                </div>
              </div>
            </div>

            {/* 🚀 NỘI DUNG THAY ĐỔI DỰA THEO CHẾ ĐỘ ĐƯỢC CHỌN */}
            <div className="min-h-[70px]">
              {mode === 'standard' ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <label className="block text-[11px] md:text-xs font-bold text-slate-500 uppercase mb-1.5 md:mb-2 tracking-wide">Tên Bảng *</label>
                  <input 
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Sprint Planning, Backend Tasks..."
                    className="w-full px-3.5 md:px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] md:text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all font-medium text-slate-800 placeholder:text-slate-400"
                    required autoFocus
                  />
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 bg-violet-50 border border-violet-100 rounded-xl p-3.5 md:p-4 flex items-start gap-2.5 md:gap-3">
                  <div className="bg-violet-200/50 p-1.5 md:p-2 rounded-lg text-violet-700 shrink-0 mt-0.5">
                    <Sparkles size={14} className="md:w-4 md:h-4" />
                  </div>
                  <div className="text-[13px] md:text-sm text-violet-800 min-w-0">
                    <p className="font-semibold mb-1 md:mb-1.5">Cấu hình AI Generator</p>
                    <p className="text-[11px] md:text-xs opacity-80 leading-relaxed">
                      Hệ thống sẽ lấy tự động dữ liệu Workspace và chuẩn bị danh sách <b>{isLoadingMembers ? '...' : projectMembers.length} thành viên</b> để chuyển sang cấu hình với trợ lý AI.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-2.5 md:gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 md:py-2.5 rounded-xl md:rounded-lg text-[13px] md:text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
              Hủy
            </button>

            {mode === 'standard' ? (
              <button type="submit" disabled={isPending || !name.trim()} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 md:py-2.5 rounded-xl md:rounded-lg text-[13px] md:text-sm font-bold flex justify-center items-center gap-2 transition-all disabled:opacity-50 active:scale-95 shadow-md shadow-indigo-200">
                {isPending ? <Loader2 size={16} className="animate-spin" /> : 'Tạo Bảng'}
              </button>
            ) : (
              <button type="submit" disabled={isLoadingMembers} className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white px-6 py-2.5 md:py-2.5 rounded-xl md:rounded-lg text-[13px] md:text-sm font-bold flex justify-center items-center gap-2 transition-all shadow-md shadow-violet-200 disabled:opacity-50 active:scale-95">
                {isLoadingMembers ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Tiếp tục với AI
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBoardModal;