import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Heart } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const { user } = useAuth();

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <div className="flex min-h-screen bg-[#FAFAF8] text-[#111827]">
      {/* Mobile Top Navbar */}
      <div className="md:hidden flex items-center justify-between px-4 bg-white border-b border-[#E5E7EB] fixed top-0 left-0 right-0 h-14 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-md hover:bg-[#F5F7FA] text-[#6B7280] active:bg-[#EEF2FF] transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-bold">
              <Heart size={12} className="fill-[#4F46E5]" />
            </div>
            <span className="font-semibold text-[#111827] text-sm">The Date Crew</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-xs font-bold flex items-center justify-center">
          {initials}
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      <div
        className={`mobile-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onExpandChange={setSidebarExpanded}
      />

      {/* Main Content Container */}
      <main
        className="flex-1 min-h-screen overflow-y-auto"
        style={{
          marginLeft: sidebarExpanded ? 'var(--sb-expanded)' : 'var(--sb-collapsed)',
          transition: 'margin-left var(--sb-duration) var(--sb-easing)',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

