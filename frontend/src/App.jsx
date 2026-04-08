import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import BoardPage from './pages/BoardPage';
import { SocketProvider } from './context/SocketContext';

function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          {/* Luồng giao diện có chứa Sidebar và Navbar */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/board" replace />} />
            <Route path="/board" element={<BoardPage />} />
            {/* Mốt Long làm trang Settings thì thêm vào đây: */}
            {/* <Route path="/settings" element={<SettingsPage />} /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;