import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  Film,
  ThumbsUp,
  Star,
  Bookmark,
  User,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onMobileClose }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Semantic Search', path: '/semantic-search', icon: Sparkles },
    { label: 'Similar Movies', path: '/similar-movie', icon: Film },
    { label: 'Because You Liked', path: '/hybrid-recommendation', icon: ThumbsUp },
    { label: 'Watchlist', path: '/watchlist', icon: Bookmark },
    { label: 'My Ratings', path: '/ratings', icon: Star },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between p-4 md:p-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between md:hidden pb-4 border-b border-white/10">
          <span className="font-headline font-bold text-lg text-white">Navigation</span>
          <button
            onClick={onMobileClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Links */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#f5b94d]/20 to-[#42e09a]/10 text-[#f5b94d] border border-[#f5b94d]/30 shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="pt-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm text-red-400 hover:bg-red-500/10 w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed left-0 top-20 bottom-0 bg-[#0b0d12]/90 backdrop-blur-2xl border-r border-white/10 z-40">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-[110] md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative z-10 w-72 bg-[#0b0d12] border-r border-white/10 h-full"
            >
              {navContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
