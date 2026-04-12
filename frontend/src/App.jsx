import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import BoardPage from './pages/BoardPage';
import { SocketProvider } from './context/SocketContext';
import AdminRBACPage from './pages/AdminRBACPage';
import WorkspacesPage from './pages/WorkspacesPage';
import BoardView from './features/board/components/BoardView';
import AiBoardGeneratorPage from './pages/AiBoardGeneratePage';

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
            <Route path="/workspaces" element={<WorkspacesPage/>} />
            <Route path="/board/:id" element={<BoardView />} />
            <Route path="/aigenerateboard" element={<AiBoardGeneratorPage/>}/>
            {/* Mốt Long làm trang Settings thì thêm vào đây: */}
            {/* <Route path="/settings" element={<SettingsPage />} /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;