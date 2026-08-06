import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Sparkles, User as UserIcon, LogOut, Film, Menu, X, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMovieAutocomplete } from '../hooks/useRecommendations';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  onMobileMenuToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMobileMenuToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Live autocomplete query hook
  const { data: autocompleteData, isLoading: isSearching } = useMovieAutocomplete(searchTerm);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setIsDropdownOpen(false);
      navigate(`/similar-movie?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-[#0b0d12]/80 backdrop-blur-2xl border-b border-white/10 h-16 md:h-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-full flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand Logo */}
        <div className="flex items-center gap-3 md:gap-6">
          {onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="md:hidden text-gray-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}

          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f5b94d] via-[#f5b94d] to-[#42e09a] p-0.5 shadow-[0_0_20px_rgba(245,185,77,0.3)] transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-[#0b0d12] rounded-[10px] flex items-center justify-center">
                <Film className="w-5 h-5 text-[#f5b94d]" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-bold text-lg tracking-tight text-white flex items-center gap-1">
                CineCast <span className="text-[#f5b94d]">AI</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Middle: Live Autocomplete Search Bar */}
        <div ref={searchRef} className="relative flex-1 max-w-md hidden sm:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Search movie for sibling suggestions..."
              className="w-full bg-[#111318] border border-white/10 rounded-xl py-2 pl-10 pr-9 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#42e09a]/60 focus:ring-1 focus:ring-[#42e09a]/60 transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Autocomplete Dropdown */}
          <AnimatePresence>
            {isDropdownOpen && searchTerm.trim().length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute top-full left-0 right-0 mt-2 glass-dropdown rounded-2xl shadow-2xl overflow-hidden max-h-[320px] overflow-y-auto border border-white/10 z-50 p-2"
              >
                {isSearching ? (
                  <div className="p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#f5b94d] animate-spin" />
                    Searching movies...
                  </div>
                ) : autocompleteData && autocompleteData.results.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {autocompleteData.results.slice(0, 5).map((movie) => (
                      <div
                        key={movie.tmdb_id}
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setSearchTerm('');
                          navigate(`/movie/${movie.tmdb_id}`);
                        }}
                        className="flex items-center gap-3 p-2.5 hover:bg-white/10 rounded-xl cursor-pointer transition-colors"
                      >
                        {movie.poster ? (
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="w-9 h-13 object-cover rounded-md border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-13 bg-gray-800 rounded-md flex items-center justify-center text-gray-500 shrink-0 text-xs">
                            Film
                          </div>
                        )}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-semibold text-sm text-white truncate">
                            {movie.title}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            <span>
                              {movie.release_date
                                ? new Date(movie.release_date).getFullYear()
                                : ''}
                            </span>
                            <span className="flex items-center gap-1 text-[#f5b94d]">
                              <Star className="w-3 h-3 fill-[#f5b94d]" />
                              {movie.rating ? movie.rating.toFixed(1) : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-gray-400">
                    No movies found matching "{searchTerm}"
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: User Profile Avatar & Menu */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl border border-white/10 hover:border-[#f5b94d]/40 transition-colors bg-[#111318]"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#f5b94d] to-[#42e09a] flex items-center justify-center font-bold text-xs text-[#111318]">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-white hidden md:inline">
                  {user.username}
                </span>
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    className="absolute right-0 top-full mt-2 w-48 glass-dropdown rounded-2xl border border-white/10 p-2 shadow-2xl z-50 flex flex-col gap-1"
                  >
                    <div className="px-3 py-2 border-b border-white/10 mb-1">
                      <p className="text-xs text-gray-400">Signed in as</p>
                      <p className="text-sm font-bold text-white truncate">{user.username}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-[#f5b94d]" /> Profile
                    </Link>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                        navigate('/');
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] hover:brightness-110 transition-all shadow-[0_0_15px_rgba(245,185,77,0.3)] active:scale-95"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
