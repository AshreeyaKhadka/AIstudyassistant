import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/react';
import {
  LayoutDashboard,
  Users,
  Activity,
  FileUp,
  FileText,
  LineChart,
  ShieldCheck,
  LogOut,
  ArrowLeft,
  X,
  Gauge,
  Menu,
} from 'lucide-react';

const AdminLayout = () => {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    signOut({ redirectUrl: '/' });
  };

  const navItems = [
    { to: '/admin', icon: <LayoutDashboard size={16} />, label: 'Overview', end: true },
    { to: '/admin/users', icon: <Users size={16} />, label: 'Users' },
    { to: '/admin/materials', icon: <FileText size={16} />, label: 'Materials' },
    { to: '/admin/tokens', icon: <Gauge size={16} />, label: 'Token Usage' },
    { to: '/admin/content', icon: <FileUp size={16} />, label: 'Content' },
    { to: '/admin/activity', icon: <Activity size={16} />, label: 'Activity Log' },
    { to: '/admin/quotas', icon: <ShieldCheck size={16} />, label: 'Quotas' },
    { to: '/admin/moderation', icon: <LineChart size={16} />, label: 'Moderation' },
  ];

  return (
    <div className="flex h-screen bg-[#F7F5F2] overflow-hidden font-sans text-[#111111]">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-[240px] bg-[#102326] text-white
          flex flex-col h-screen select-none shrink-0
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#C96A32] rounded-[4px] flex items-center justify-center">
              <ShieldCheck size={16} strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold tracking-tight">Admin Panel</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-white/60 hover:text-white lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `w-full flex items-center gap-2.5 px-3 py-2 rounded-[4px] text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                }`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-[4px] text-xs text-white/60 hover:bg-white/8 hover:text-white/90 transition-colors mb-1"
          >
            <ArrowLeft size={14} />
            Back to App
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-[4px] text-xs text-white/60 hover:bg-white/8 hover:text-white/90 transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-3 left-3 z-20 p-2 bg-[#102326] text-white rounded-[4px] lg:hidden shadow-md"
        >
          <Menu size={16} />
        </button>

        <div className="flex-1 overflow-y-auto p-4 pt-12 md:p-6 md:pt-6">
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
