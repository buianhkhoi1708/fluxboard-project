import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import BoardPage from "./pages/BoardPage";
import { SocketProvider } from "./context/SocketContext";
import AdminRBACPage from "./pages/AdminRBACPage";
import WorkspacesPage from "./pages/WorkspacesPage";
import BoardView from "./features/board/components/BoardView";
import AiBoardGeneratorPage from "./pages/AiBoardGeneratePage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          {/* Route công khai: Ai cũng vào được */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot" element={<ForgotPasswordPage />} />
          <Route path="/reset" element={<ResetPasswordPage />} />


          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/board" element={<BoardPage />} />
              <Route path="/adminrbac" element={<AdminRBACPage />} />
              {/* Mốt Long làm trang Settings thì thêm vào đây: */}
              <Route path="/workspaces" element={<WorkspacesPage />} />
              <Route path="/board/:id" element={<BoardView />} />
              <Route path="/aigenerateboard"element={<AiBoardGeneratorPage />}/>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;
