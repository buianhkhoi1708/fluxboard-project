import React from 'react';
import { useQueryState, parseAsString } from 'nuqs';
// Component
import ChangePasswordForm from '../features/settings/components/ChangePassWordForm';
import { ProfileTab } from '../features/settings/components/ProfileTab';
import { NotificationTab } from '../features/settings/components/NotificationTab';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useQueryState(
    'tab', 
    parseAsString.withDefault('profile')
  );

  const getTabClass = (tabName: string) => `w-full text-left px-4 py-3 rounded-xl font-semibold transition-all ${
    activeTab === tabName 
      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50' 
      : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
  }`;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full h-full overflow-y-auto bg-slate-50 custom-scrollbar">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">Cài đặt hệ thống</h1>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[550px]">
        {/* Menu Tabs bên trái */}
        <div className="w-full md:w-72 bg-slate-50/50 border-r border-slate-200 p-5 shrink-0">
          <ul className="space-y-2">
            <li>
              <button onClick={() => setActiveTab('profile')} className={getTabClass('profile')}>
                Hồ sơ cá nhân
              </button>
            </li>
            <li>
              <button onClick={() => setActiveTab('security')} className={getTabClass('security')}>
                Trung tâm bảo mật
              </button>
            </li>
            <li>
              <button onClick={() => setActiveTab('notifications')} className={getTabClass('notifications')}>
                Cấu hình thông báo
              </button>
            </li>
          </ul>
        </div>

        {/* Nội dung Tab bên phải */}
        <div className="flex-1 p-8 md:p-10 relative">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'security' && <div className="animate-in fade-in duration-300"><ChangePasswordForm /></div>}
          {activeTab === 'notifications' && <NotificationTab />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;