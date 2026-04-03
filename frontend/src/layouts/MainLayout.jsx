import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar'; // Nhớ check lại đường dẫn file này
import TopNavbar from './TopNavbar'; // Nhớ check lại đường dẫn file này

const MainLayout = () => {
  const [apiStatus, setApiStatus] = useState('Đang kiểm tra kết nối BE...');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/v1/health-check');
        if (res.ok) setApiStatus('Kết nối Backend thành công! 🟢');
        else setApiStatus('Backend phản hồi lỗi 🔴');
      } catch (err) {
        setApiStatus('Backend đang Offline hoặc lỗi CORS ⚪');
      }
    };
    checkHealth();
  }, []);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#fcfcfc] font-sans text-gray-800">
      <TopNavbar apiStatus={apiStatus} />
      
      <div className="flex flex-1 w-full overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 w-full overflow-hidden flex flex-col bg-white">
          <div className={`px-4 py-1.5 text-xs text-center font-medium border-b flex justify-center items-center gap-2
            ${apiStatus.includes('thành công') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <span>Trạng thái: {apiStatus}</span>
          </div>
          
          <div className="flex-1 overflow-hidden min-h-0 relative">
             {/* 👉 Outlet chính là cánh cửa thần kỳ để Router bơm các trang con (như Bảng Kanban) vào đây */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;