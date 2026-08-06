import React, { useState } from 'react';
import { User, Mail, Shield, Star, Film, LogOut, Sparkles } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useMyRatings } from '../hooks/useRatings';

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { data: myRatings } = useMyRatings();

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white flex flex-col">
      <Navbar onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
      <Sidebar isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />

      <main className="md:ml-64 pt-20 md:pt-24 pb-16 px-4 md:px-8 max-w-4xl w-full mx-auto flex-1 flex flex-col gap-8">
        <section className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#f5b94d] via-[#f5b94d] to-[#42e09a] p-1 shadow-2xl shrink-0">
            <div className="w-full h-full bg-[#0b0d12] rounded-[22px] flex items-center justify-center font-bold text-3xl text-[#f5b94d]">
              {user?.username.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="flex flex-col text-center sm:text-left flex-1 min-w-0">
            <div className="inline-flex items-center justify-center sm:justify-start gap-1.5 text-xs font-semibold text-[#42e09a] mb-1">
              <Sparkles className="w-3.5 h-3.5" /> CineCast AI Premium Member
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-headline text-white truncate">
              {user?.username}
            </h1>
            <p className="text-sm text-gray-400 font-body truncate">{user?.email}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-3xl border border-white/10 flex flex-col items-center text-center">
            <Star className="w-8 h-8 text-[#f5b94d] fill-[#f5b94d] mb-2" />
            <span className="text-3xl font-bold font-headline text-white">
              {myRatings?.length || 0}
            </span>
            <span className="text-xs text-gray-400 font-semibold mt-1">Movies Rated</span>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-white/10 flex flex-col items-center text-center">
            <Film className="w-8 h-8 text-[#42e09a] mb-2" />
            <span className="text-lg font-bold font-headline text-[#ffdaa0] truncate max-w-full">
              Sci-Fi & Cyberpunk
            </span>
            <span className="text-xs text-gray-400 font-semibold mt-1">Top Taste Signature</span>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-white/10 flex flex-col items-center text-center">
            <Shield className="w-8 h-8 text-[#65fdb5] mb-2" />
            <span className="text-lg font-bold font-headline text-[#65fdb5]">JWT Encrypted</span>
            <span className="text-xs text-gray-400 font-semibold mt-1">Security Status</span>
          </div>
        </section>

        <section className="glass-panel p-8 rounded-3xl border border-white/10 flex flex-col gap-6">
          <h3 className="text-lg font-bold font-headline text-white border-b border-white/10 pb-4">
            Account Management
          </h3>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 glass-card rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-[#f5b94d]" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-semibold">Username</span>
                  <span className="text-sm font-bold text-white">{user?.username}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#42e09a]" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-semibold">Email Address</span>
                  <span className="text-sm font-bold text-white">{user?.email}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button
              onClick={logout}
              className="px-6 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/20 transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Log Out of CineCast AI
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
