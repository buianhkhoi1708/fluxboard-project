import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import BoardView from './components/BoardView'; // Bổ sung import Kanban Board

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

  // Hàm phụ trợ để sinh ra vùng nội dung tùy theo Menu đang chọn
  const renderContent = () => {
    switch (activeMenu) {
      case 'Dashboard':
      case 'Workspaces': // Gom chung nếu bạn muốn Kanban hiện ở tab Workspaces
        return (
          // Khung bọc BoardView - tràn viền, ẩn scroll thừa
          <div className="w-full h-full overflow-hidden rounded-xl border border-gray-200 shadow-inner">
            <BoardView />
          </div>
        );
      default:
        return (
          // Khung đứt nét mặc định cho các menu chưa phát triển (Settings, Members...)
          <div className="w-full h-full flex items-center justify-center p-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-400 italic text-lg">
            Dữ liệu cho chức năng "{activeMenu}" sẽ được cập nhật sau...
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#fcfcfc] font-sans text-gray-800">
      <TopNavbar apiStatus={apiStatus} />
      
      <div className="flex flex-1 w-full overflow-hidden">
        <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        
        {/* VÙNG MAIN CONTENT */}
        {/* Đổi overflow-y-auto thành overflow-hidden để Kanban tự xử lý thanh cuộn bên trong */}
        <main className="flex-1 w-full p-4 lg:p-6 overflow-hidden">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
            
            {/* TIÊU ĐỀ MENU */}
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                {activeMenu}
              </h1>
            </div>

            {/* KHUNG HIỂN THỊ TRẠNG THÁI KẾT NỐI BE (Làm mỏng lại một chút để tiết kiệm diện tích cho bảng Kanban) */}
            <div className={`px-4 py-3 mb-4 rounded-lg border-2 font-bold text-sm flex items-center gap-3 transition-colors
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

            {/* VÙNG ĐỔ DỮ LIỆU ĐỘNG */}
            <div className="flex-1 overflow-hidden min-h-0">
              {renderContent()}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

export default App;