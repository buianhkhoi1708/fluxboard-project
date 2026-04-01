import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';

function App() {
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [apiStatus, setApiStatus] = useState('Đang kiểm tra kết nối BE...');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/v1/health-check');
        if (res.ok) {
          setApiStatus('Kết nối Backend thành công! 🟢');
        } else {
          setApiStatus('Backend phản hồi lỗi 🔴');
        }
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
        <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        
        <main className="flex-1 w-full p-4 lg:p-8 overflow-y-auto">
          <div className="w-full h-full">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-full flex flex-col">
              
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  {activeMenu}
                </h1>
              </div>

              {/* KHUNG HIỂN THỊ TRẠNG THÁI KẾT NỐI BE */}
              <div className={`p-4 mb-8 rounded-lg border-2 font-bold text-lg flex items-center gap-3 transition-colors
                ${apiStatus.includes('thành công') 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : apiStatus.includes('Đang') 
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                <span>Trạng thái Hệ thống:</span>
                <span>{apiStatus}</span>
              </div>

              {/* Vùng nội dung chính */}
              <div className="flex-1 flex items-center justify-center p-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-400 italic text-lg">
                 Dữ liệu từ Backend sẽ được đổ vào đây...
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;