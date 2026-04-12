import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import BoardPage from './pages/BoardPage';
import { SocketProvider } from './context/SocketContext';
import AdminRBACPage from './pages/AdminRBACPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './routes/ProtectedRoute';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          {/* Route công khai: Ai cũng vào được */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* Các Route cần bảo vệ: Phải đăng nhập mới vào được */}
          {/* Luồng giao diện có chứa Sidebar và Navbar */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/board" element={<BoardPage />} />
              <Route path="/adminrbac" element={<AdminRBACPage/>} />
              {/* Mốt Long làm trang Settings thì thêm vào đây: */}
              {/* <Route path="/settings" element={<SettingsPage />} /> */}
            </Route>
          </Route>

        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;