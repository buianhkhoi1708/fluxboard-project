import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';

const ProtectedRoute = () => {
  const { token } = useAuthStore();

  // Nếu không có token, điều hướng thẳng về trang /login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Nếu có token, cho phép render các component con (Outlet)
  return <Outlet />;
};

export default ProtectedRoute;