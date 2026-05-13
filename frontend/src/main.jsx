// src/main.jsx (hoặc main.tsx)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './assets/index.css';

// 1. Import Provider từ thư viện
import { QueryClientProvider } from '@tanstack/react-query';
// 2. Import cấu hình queryClient sếp vừa tạo ở thư mục lib
import { queryClient } from './lib/queryClient'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Truyền queryClient vào Provider */}
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);