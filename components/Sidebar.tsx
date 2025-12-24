
import React from 'react';
import { LayoutDashboard, ScanLine, Users, FileText, Bell, LogOut, Settings, GraduationCap, Calendar, Building } from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentRole: UserRole;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  alertCount?: number; // New prop for notifications
}

const Sidebar: React.FC<SidebarProps> = ({ currentRole, activePage, onNavigate, onLogout, alertCount = 0 }) => {
  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, roles: ['ADMIN', 'TEACHER', 'COUNSELOR'] },
    { id: 'schedule', label: 'جدول الاختبارات', icon: Calendar, roles: ['ADMIN'] },
    { id: 'committees', label: 'إدارة اللجان', icon: Building, roles: ['ADMIN'] },
    { id: 'students', label: 'الطلاب', icon: GraduationCap, roles: ['ADMIN'] },
    { id: 'handover', label: 'استلام/تسليم', icon: ScanLine, roles: ['ADMIN', 'TEACHER'] },
    { id: 'attendance', label: 'رصد الغياب', icon: Users, roles: ['ADMIN', 'TEACHER'] },
    { id: 'alerts', label: 'تنبيهات الغياب', icon: Bell, roles: ['ADMIN', 'COUNSELOR'] },
    { id: 'reports', label: 'التقارير والسجلات', icon: FileText, roles: ['ADMIN'] },
    { id: 'setup', label: 'إعدادات النظام', icon: Settings, roles: ['ADMIN'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(currentRole));

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-full shadow-xl">
      <div className="p-6 border-b border-slate-700 flex items-center justify-center">
        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-xl font-bold ml-3">
          م
        </div>
        <h1 className="text-xl font-bold tracking-wider">نظام مُراقب</h1>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-emerald-600 text-white shadow-md transform scale-[1.02]' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3 space-x-reverse">
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </div>
              
              {/* Alert Badge Logic */}
              {item.id === 'alerts' && alertCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                  {alertCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 space-x-reverse bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-4 py-2 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          <span>تسجيل خروج</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
