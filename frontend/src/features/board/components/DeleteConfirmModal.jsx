import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, taskTitle }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop: Lớp nền mờ */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shadow-sm">
            <AlertTriangle size={28} />
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-bold text-slate-900">Xác nhận xoá Task?</h3>
            <p className="text-sm text-slate-500 px-2">
              Ông có chắc chắn muốn xoá task <span className="font-bold text-slate-800">"{taskTitle}"</span> không? Hành động này không thể hoàn tác đâu nhé!
            </p>
          </div>

          <div className="flex gap-3 w-full mt-2">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all active:scale-95"
            >
              Huỷ bỏ
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-200 transition-all active:scale-95"
            >
              Xoá ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;