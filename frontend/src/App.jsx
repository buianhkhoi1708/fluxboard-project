import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import BoardPage from './pages/BoardPage';
import { SocketProvider } from './context/SocketContext';
import ChangePasswordForm from './features/board/components/ChangePasswordForm';

function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          {/* Luồng giao diện có chứa Sidebar và Navbar */}
          <Route element={<MainLayout />}>
            {/* Chuyển hướng mặc định từ / sang /board */}
            <Route path="/" element={<Navigate to="/board" replace />} />
            
            {/* Trang Kanban Board */}
            <Route path="/board" element={<BoardPage />} />
            
            {/* 👉 Thêm Route cho trang đổi mật khẩu tại đây */}
            <Route path="/change-password" element={<ChangePasswordForm />} />
            
            {/* Mốt Long làm trang Settings thì thêm vào đây: */}
            {/* <Route path="/settings" element={<SettingsPage />} /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;