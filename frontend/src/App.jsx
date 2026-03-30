import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import './App.css';

function App() {
  const [activeMenu, setActiveMenu] = useState('Dashboard');

  return (
    <div className="app-container">
      <TopNavbar />
      <div className="main-layout">
        <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        <main className="content-area">
          <div className="card">
            <h1>{activeMenu}</h1>
            <p>Chào mừng bạn đến với TaskHub. Bạn đang xem mục <strong>{activeMenu}</strong>.</p>
            <div className="placeholder-content">
               Nội dung chi tiết của trang sẽ được cập nhật tại đây...
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;