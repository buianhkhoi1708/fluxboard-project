import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar'; 
import TopNavbar from './TopNavbar'; 

const MainLayout = () => {

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/v1/health-check');
        if (res.ok) {
          console.log('🟢 Kết nối Backend thành công!');
        } else {
          console.warn('🔴 Backend phản hồi lỗi!');
        }
      } catch (err) {
        console.error('⚪ Backend đang Offline hoặc lỗi CORS:', err);
      }
    };
    checkHealth();
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-slate-50 font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Thanh điều hướng TopNavbar ở trên cùng */}
      <TopNavbar />
      
      <div className="flex flex-1 w-full overflow-hidden relative">
        {/* Sidebar điều hướng bên trái / Menu dưới đáy trên mobile */}
        <Sidebar />
        
        {/* 🚀 FIX: Thêm pb-24 trên mobile để tạo không gian hở, cuộn nội dung qua khỏi thanh Sidebar */}
        <main className="flex-1 w-full overflow-y-auto flex flex-col bg-white md:shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.05)] z-10 custom-scrollbar overscroll-none pb-24 md:pb-0">
          
          <div className="flex-1 relative w-full flex flex-col">
             {/* Outlet bơm trang con vào đây */}
            <Outlet />
          </div>
        </main>
      </div>

      {/* Style scrollbar mượt mà ẩn trên mobile, hiện tinh tế trên desktop */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default MainLayout;