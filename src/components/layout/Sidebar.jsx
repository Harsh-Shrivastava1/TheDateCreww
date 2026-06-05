import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Heart,
  Activity,
  FileText,
  Calendar,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { signOut } from '../../services/firebase/auth';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customers',  icon: Users,           label: 'Customers' },
  { to: '/matches',    icon: Heart,           label: 'Matches' },
  { to: '/activities', icon: Activity,        label: 'Activities' },
  { to: '/notes',      icon: FileText,        label: 'Notes' },
  { to: '/calendar',   icon: Calendar,        label: 'Calendar' },
  { to: '/reports',    icon: BarChart2,       label: 'Reports' },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, setMobileOpen, onExpandChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const timeoutRef = useRef(null);

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'AD';

  const displayName = user?.email
    ? user.email.split('@')[0].replace(/[._]/g, ' ')
    : 'Admin';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setHovered(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setHovered(false);
    }, 150); // 150ms collapse delay
  };

  const handleIconMouseEnter = (e, label) => {
    if (isExpanded) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      label,
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  };

  const handleIconMouseLeave = () => {
    setTooltip(null);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Determine if the sidebar is visually expanded in desktop, tablet or mobile
  const isExpanded = mobileOpen || !collapsed || hovered;

  // Notify parent whenever expanded state changes so content margin follows
  useEffect(() => {
    onExpandChange?.(isExpanded);
  }, [isExpanded]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={clsx(
        'sidebar',
        isExpanded && 'expanded'
      )}
      style={{ userSelect: 'none' }}
    >
      {/* Workspace Switcher */}
      <div className="px-2 pt-3 pb-2 border-b border-[#E8E8E5] flex-shrink-0">
        <div className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-[#F5F5F3] active:bg-[#E8E8E5] transition-all duration-150 cursor-pointer border border-transparent hover:border-[#E8E8E5] group/workspace">
          {/* Logo icon */}
          <div className="w-8 h-8 rounded-lg bg-[#0F1117] text-white flex items-center justify-center font-bold flex-shrink-0 shadow-sm border border-[#2B2D36] transition-transform duration-200 group-hover/workspace:scale-105">
            <Heart size={15} className="fill-white text-white" />
          </div>

          {/* Expanded view */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex items-center justify-between min-w-0"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[#0F1117] text-[14px] font-black truncate leading-tight tracking-tight">
                  The Date Crew
                </div>
                <div className="text-[9.5px] text-[#6B6F7A] font-bold tracking-wider uppercase leading-none mt-0.5">
                  CRM Matchmaker
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggle();
                }}
                className="p-1 rounded-md text-[#9B9EA8] hover:text-[#0F1117] hover:bg-gray-200 transition-all flex-shrink-0"
                title={collapsed ? "Lock sidebar open" : "Collapse sidebar"}
              >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Manual toggle (Visible on tablet only) */}
      {isExpanded ? (
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#E5E7EB] hidden md:flex lg:hidden flex-shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Navigation</span>
          <button
            onClick={onToggle}
            className="p-1 rounded-md text-[#6B7280] hover:text-[#111827] hover:bg-[#F5F7FA] transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      ) : (
        <div className="flex justify-center py-2 border-b border-[#E5E7EB] hidden md:flex lg:hidden flex-shrink-0">
          <button
            onClick={onToggle}
            className="p-1 rounded-md text-[#6B7280] hover:text-[#111827] hover:bg-[#F5F7FA] transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-1 space-y-1.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)} // Close drawer on mobile click
            className={({ isActive }) =>
              clsx('sidebar-nav-item', isActive && 'active')
            }
            onMouseEnter={(e) => handleIconMouseEnter(e, label)}
            onMouseLeave={handleIconMouseLeave}
          >
            {/* Icon Wrapper */}
            <div className="relative flex items-center justify-center">
              <Icon size={18} className="sidebar-icon" />
            </div>

            {/* Label */}
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="font-medium flex-1"
              >
                {label}
              </motion.span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User & Settings Section */}
      <div className="p-3 border-t border-[#E5E7EB] flex-shrink-0 space-y-1.5">
        {/* Settings link */}
        <NavLink
          to="/settings"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            clsx('sidebar-nav-item', isActive && 'active')
          }
          onMouseEnter={(e) => handleIconMouseEnter(e, 'Settings')}
          onMouseLeave={handleIconMouseLeave}
        >
          <div className="relative flex items-center justify-center">
            <Settings size={18} className="sidebar-icon" />
          </div>
          {isExpanded && <span className="font-medium">Settings</span>}
        </NavLink>

        {/* User profile item */}
        <div
          className={clsx(
            "flex items-center gap-3 p-2.5 rounded-xl transition-all duration-150 border border-transparent",
            isExpanded ? "bg-[#FAFAF9] border-[#E8E8E5] shadow-3xs" : "justify-center"
          )}
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-[#0F1117] text-white border border-[#2B2D36] shadow-sm cursor-pointer hover:scale-105 transition-transform"
            onMouseEnter={(e) => handleIconMouseEnter(e, `Sign out (${displayName})`)}
            onMouseLeave={handleIconMouseLeave}
            onClick={handleSignOut}
          >
            {initials}
          </div>

          {/* User details (Expanded only) */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 min-w-0 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[#0F1117] text-[12px] font-bold truncate capitalize leading-tight">
                  {displayName}
                </div>
                <div className="text-[10px] text-[#9B9EA8] font-bold tracking-wider uppercase leading-none mt-0.5">
                  Matchmaker
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-lg bg-white border border-[#E8E8E5] shadow-3xs text-[#6B6F7A] hover:text-[#E5484D] hover:border-[#E5484D] transition-colors flex-shrink-0"
                title="Sign out"
              >
                <LogOut size={13} />
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Floating Tooltips (Collapsed only) */}
      {tooltip && (
        <div
          className="tooltip-fixed"
          style={{
            top: tooltip.top,
            left: tooltip.left,
            transform: 'translateY(-50%)',
            opacity: 1,
          }}
        >
          {tooltip.label}
        </div>
      )}
    </div>
  );
}
