import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Trash2, Film, Star } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { SkeletonGrid } from '../components/SkeletonCard';
import { EmptyState } from '../components/EmptyState';
import { FilterDropdown, applyMovieFilters, INITIAL_FILTERS, type MovieFilterState } from '../components/FilterDropdown';
import { useWatchlist, useRemoveFromWatchlist } from '../hooks/useWatchlist';
import { useToast } from '../contexts/ToastContext';
import type { Movie } from '../types';

export const WatchlistPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [filters, setFilters] = useState<MovieFilterState>(INITIAL_FILTERS);

  const { data: watchlistItems, isLoading } = useWatchlist();
  const removeMutation = useRemoveFromWatchlist();
  const { showToast } = useToast();

  const handleRemove = async (movieId: number, title: string) => {
    try {
      await removeMutation.mutateAsync(movieId);
      showToast('info', 'Removed from Watchlist', `"${title}" has been removed from your watchlist.`);
    } catch (err) {
      showToast('error', 'Remove Failed', 'Unable to remove movie from watchlist.');
    }
  };

  // Map watchlist items to Movie interface for FilterDropdown compatibility & rich display
  const mappedMovies: Movie[] = (watchlistItems || []).map((item) => ({
    tmdb_id: item.movie_id,
    title: item.title,
    overview: '',
    release_date: item.release_date || '',
    rating: item.vote_average || 0.0,
    poster: item.poster,
    backdrop: item.backdrop,
  }));

  const filteredMovies = applyMovieFilters(mappedMovies, filters);

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white flex flex-col">
      <Navbar onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
      <Sidebar isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />

      <main className="md:ml-64 pt-20 md:pt-24 pb-16 px-3 sm:px-4 md:px-8 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-6 sm:gap-8">
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <span className="text-xs uppercase tracking-widest font-bold text-[#42e09a] flex items-center gap-1.5 mb-1">
              <Bookmark className="w-3.5 h-3.5 fill-[#42e09a]" /> Saved For Later
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-headline text-white">
              My Watchlist
            </h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <FilterDropdown
              filters={filters}
              onFilterChange={setFilters}
              totalCount={watchlistItems?.length || 0}
              filteredCount={filteredMovies.length}
            />
            <div className="px-3.5 py-2 rounded-xl glass-card border border-white/10 text-xs font-semibold text-gray-300">
              Total Saved: <span className="text-[#42e09a] font-bold">{watchlistItems?.length || 0}</span>
            </div>
          </div>
        </section>

        <section className="w-full">
          {isLoading ? (
            <SkeletonGrid count={6} message="Fetching your saved watchlist..." />
          ) : watchlistItems && watchlistItems.length > 0 ? (
            filteredMovies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <AnimatePresence>
                  {filteredMovies.map((item) => (
                    <motion.div
                      key={item.tmdb_id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-3 sm:gap-4 shadow-xl hover:border-[#42e09a]/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        {item.poster ? (
                          <img
                            src={item.poster}
                            alt={item.title}
                            className="w-12 h-16 sm:w-14 sm:h-20 object-cover rounded-xl border border-white/10 shadow-md shrink-0 cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => navigate(`/movie/${item.tmdb_id}`)}
                          />
                        ) : (
                          <div
                            className="w-12 h-16 sm:w-14 sm:h-20 rounded-xl bg-gradient-to-tr from-[#42e09a]/20 to-[#f5b94d]/20 border border-white/10 flex items-center justify-center shrink-0 text-[#42e09a] cursor-pointer"
                            onClick={() => navigate(`/movie/${item.tmdb_id}`)}
                          >
                            <Film className="w-6 h-6" />
                          </div>
                        )}

                        <div className="flex flex-col min-w-0 flex-1">
                          <h4
                            onClick={() => navigate(`/movie/${item.tmdb_id}`)}
                            className="font-bold text-xs sm:text-sm font-headline text-white truncate cursor-pointer hover:text-[#42e09a] transition-colors"
                          >
                            {item.title}
                          </h4>
                          {item.release_date && (
                            <span className="text-[11px] sm:text-xs text-gray-400 font-medium mt-0.5">
                              {new Date(item.release_date).getFullYear()}
                            </span>
                          )}
                          <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[#f5b94d]">
                            <Star className="w-3 h-3 fill-[#f5b94d]" />
                            <span>{item.rating ? item.rating.toFixed(1) : 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleRemove(item.tmdb_id, item.title)}
                          disabled={removeMutation.isPending}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                          title="Remove from Watchlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <EmptyState
                icon="filter"
                title="No watchlist movies match selected filters."
                description="Try broadening your filter criteria."
              />
            )
          ) : (
            <EmptyState
              icon="film"
              title="Your Watchlist is Empty"
              description="Explore movies across CineCast AI and click 'Add to Watchlist' to save titles for later."
              actionText="Explore Movies"
              actionLink="/semantic-search"
            />
          )}
        </section>
      </main>
    </div>
  );
};
