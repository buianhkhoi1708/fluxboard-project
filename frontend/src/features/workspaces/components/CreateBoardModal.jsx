import React, { useState } from 'react';
import { boardApi } from '../../board/api/boardApi'; 
import { X, KanbanSquare, Loader2 } from 'lucide-react';
import useProjectStore from '../store/useProjectStore';

const CreateBoardModal = ({ isOpen, onClose, projectId, onSuccess }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addBoardToProject = useProjectStore((state) => state.addBoardToProject);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      
      const payload = {
        project_id: projectId, 
        name: name.trim()
      };

      console.log("📤 Gửi Board Payload:", payload);

      const response = await boardApi.createBoard(payload);
      
      if (response.success) {
          addBoardToProject(projectId, response.data); 
          setName('');
          onSuccess(); 
      }
    } catch (error) {
      console.error("❌ Lỗi tạo Board:", error);
      const msg = error.response?.data?.message || "Lỗi tạo Board (400)";
      alert(`Backend báo: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 rounded-t-2xl">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <KanbanSquare size={20} className="text-indigo-600 shrink-0" />
            <span className="truncate">Create New Board</span>
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body (Có thể cuộn trên màn hình quá nhỏ) */}
        <div className="overflow-y-auto overflow-x-hidden">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Board Name *
                </label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Sprint Planning, Bug Tracker..."
                  className="w-full px-4 py-2.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                  required 
                  autoFocus
                />
              </div>
            </div>

            {/* Footer / Buttons */}
            <div className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={onClose} 
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting || !name.trim()}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 sm:py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-slate-300 disabled:active:scale-100"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Create Board'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default CreateBoardModal;