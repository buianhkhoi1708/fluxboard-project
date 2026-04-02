import React, { useState } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { Sparkles, Loader2 } from 'lucide-react';

const AiGeneratorPanel = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Lấy hàm nạp data AI từ Store của Chấn/Long
  const { setBoardFromAI } = useBoardStore();

  const handleGenerateBoard = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);

    try {
      // Gọi xuống Backend của Khôi (Nhớ check lại đúng port 8080 nhé)
      const response = await fetch('http://localhost:8080/api/v1/ai/generate-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
      });

      const result = await response.json();

      if (result.success) {
        // Truyền cái chuỗi JSON (result.data) vào hàm của Store để nó tự phân tích và vẽ UI
        setBoardFromAI(result.data);
        setPrompt(''); // Xóa text sau khi tạo xong
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
    <div className="w-full bg-white/10 backdrop-blur-md p-4 flex gap-3 items-center border-b border-white/20">
      <input 
        type="text" 
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleGenerateBoard()}
        placeholder="Ví dụ: Tạo cho tôi dự án App Học Tiếng Anh Flux có team 5 người..."
        className="flex-1 px-4 py-2 rounded-xl bg-white/90 text-slate-800 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-300"
        disabled={isLoading}
      />
      <button 
        onClick={handleGenerateBoard}
        disabled={isLoading || !prompt.trim()}
        className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold px-6 py-2 rounded-xl flex items-center gap-2 shadow-lg disabled:opacity-70 transition-all"
      >
        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
        {isLoading ? 'AI đang suy nghĩ...' : 'Tạo Bảng Bằng AI'}
      </button>
    </div>
  );
};

export default AiGeneratorPanel;