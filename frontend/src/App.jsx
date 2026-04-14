import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import BoardPage from './pages/BoardPage';
import { SocketProvider } from './context/SocketContext';
import AdminRBACPage from './pages/AdminRBACPage';

// 👉 1. Import SettingsPage vào đây (nhớ kiểm tra đúng đường dẫn thư mục nhé)
import SettingsPage from './pages/SettingsPage'; 

function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          {/* Luồng giao diện có chứa Sidebar và Navbar */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/board" replace />} />
            <Route path="/board" element={<BoardPage />} />
            <Route path="/adminrbac" element={<AdminRBACPage/>} />
            
            {/* 👉 2. Đã mở comment trang Settings và đưa vào trong MainLayout */}
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;