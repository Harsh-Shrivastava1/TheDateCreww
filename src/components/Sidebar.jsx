import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../services/firebase/auth';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Heart,
  LogOut,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/seed', icon: Sparkles, label: 'Seed Database' },
];

export default function Sidebar() {
  const { user } = useAuth();

  const handleSignOut = async () => {
    try { await signOut(); } catch (e) { console.error(e); }
  };

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed left-0 top-0 h-screen w-60 flex flex-col z-30"
      style={{
        background: 'linear-gradient(180deg, #141414 0%, #1f1f1f 100%)',
        borderRight: '1px solid rgba(201,168,76,0.15)',
      }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b" style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #b8920e)' }}
          >
            <Heart size={18} className="text-white" fill="white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">TDC Matchmaker</div>
            <div className="text-xs" style={{ color: '#c9a84c' }}>Pro Dashboard</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 py-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(201,168,76,0.6)' }}>
            Navigation
          </span>
        </div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )
            }
            style={({ isActive }) =>
              isActive
                ? {
                    background: 'rgba(201,168,76,0.15)',
                    color: '#e4c97c',
                    borderLeft: '3px solid #c9a84c',
                  }
                : {}
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} style={{ color: isActive ? '#c9a84c' : undefined }} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} style={{ color: '#c9a84c' }} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* AI Badge */}
      <div className="px-3 py-3">
        <div
          className="rounded-lg p-3 flex items-center gap-2"
          style={{
            background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.2)',
          }}
        >
          <Sparkles size={15} style={{ color: '#c9a84c' }} />
          <div>
            <div className="text-xs font-semibold" style={{ color: '#c9a84c' }}>AI-Powered</div>
            <div className="text-xs text-gray-500">Llama 3.3 · 70B</div>
          </div>
        </div>
      </div>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #b8920e)' }}
          >
            {user?.email?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">
              {user?.email?.split('@')[0] || 'Matchmaker'}
            </div>
            <div className="text-xs text-gray-500">Matchmaker</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </motion.aside>
  );
}
