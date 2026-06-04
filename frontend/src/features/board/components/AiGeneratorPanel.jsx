import React, { useState } from 'react';
import { useBoardStore } from '../stores/useBoardStore';
import { Sparkles, Loader2, Zap } from 'lucide-react';

const AiGeneratorPanel = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { setBoardFromAI } = useBoardStore();

  const handleGenerateBoard = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8080/api/v1/ai/generate-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
      });

      const result = await response.json();

      if (result.success) {
        setBoardFromAI(result.data);
        setPrompt(''); 
      } else {
        alert("Lỗi từ Backend: " + result.message);
      }
    } catch (error) {
      console.error("Lỗi gọi API:", error);
      alert("Không kết nối được tới Backend AI của Khôi!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-slate-50 border-b border-slate-200 px-3 md:px-6 py-3 md:py-5 flex justify-center shrink-0">
      <div className="w-full max-w-4xl relative group">
        
        {/* Hiệu ứng Glow */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>

        {/* Khung Input Responsive */}
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-white p-2 sm:p-1.5 rounded-xl md:rounded-2xl shadow-sm border border-slate-200 transition-all focus-within:ring-4 focus-within:ring-indigo-50 focus-within:border-indigo-300 gap-2 sm:gap-0">
          
          <div className="flex items-center flex-1 w-full bg-slate-50/50 sm:bg-transparent rounded-lg sm:rounded-none px-1 sm:px-0">
            <div className="pl-2.5 sm:pl-4 pr-1 sm:pr-2 text-indigo-500 shrink-0">
              <Sparkles className={`w-4 h-4 md:w-5 md:h-5 ${isLoading ? "animate-pulse" : ""}`} />
            </div>

            <input 
              type="text" 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateBoard()}
              placeholder="Nhập yêu cầu để AI tạo dự án (vd: App học Tiếng Anh)..."
              className="flex-1 bg-transparent border-none outline-none px-2 py-2.5 sm:py-3 text-[13px] md:text-sm text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal w-full"
              disabled={isLoading}
            />
          </div>
          
          <button 
            onClick={handleGenerateBoard}
            disabled={isLoading || !prompt.trim()}
            className="w-full sm:w-auto ml-0 sm:ml-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white font-bold px-5 md:px-6 py-2.5 md:py-2.5 rounded-lg md:rounded-xl flex justify-center items-center gap-1.5 md:gap-2 shadow-sm md:shadow-md transition-all duration-300 active:scale-95 shrink-0 text-[13px] md:text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 md:w-[18px] md:h-[18px] animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 md:w-[18px] md:h-[18px] fill-current text-yellow-300" />
                <span>Khởi tạo Bảng</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AiGeneratorPanel;