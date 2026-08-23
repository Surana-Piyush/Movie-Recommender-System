import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, Search, Plus, Trash2, Sparkles, Star } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MovieCard } from '../components/MovieCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { EmptyState } from '../components/EmptyState';
import { RatingStars } from '../components/RatingStars';
import { FilterDropdown, applyMovieFilters, INITIAL_FILTERS, type MovieFilterState } from '../components/FilterDropdown';
import { useHybridRecommendation, useMovieAutocomplete } from '../hooks/useRecommendations';
import { recommendationService } from '../services/recommendation';
import { useToast } from '../contexts/ToastContext';
import type { Movie } from '../types';

interface RatedItem {
  titleWithYear: string;
  rating: number;
}

export const Recommendations: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [movieSearch, setMovieSearch] = useState('');
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [filters, setFilters] = useState<MovieFilterState>(INITIAL_FILTERS);

  const [moviesList, setMoviesList] = useState<Movie[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Initial rated movies list (empty by default, populated by user)
  const [selectedMovies, setSelectedMovies] = useState<RatedItem[]>([]);

  const hybridMutation = useHybridRecommendation();
  const { data: autocompleteData } = useMovieAutocomplete(movieSearch);
  const { showToast } = useToast();

  const handleAddMovie = (title: string, year?: string) => {
    if (!title.trim()) return;
    const formatted = year ? `${title} (${new Date(year).getFullYear()})` : title;

    if (selectedMovies.some((m) => m.titleWithYear.toLowerCase() === formatted.toLowerCase())) {
      showToast('info', 'Already Added', `"${formatted}" is already in your rating list.`);
      return;
    }

    setSelectedMovies((prev) => [...prev, { titleWithYear: formatted, rating: selectedRating }]);
    setMovieSearch('');
    showToast('success', 'Movie Added', `Added "${formatted}" with ${selectedRating} stars.`);
  };

  const handleRemoveMovie = (titleWithYear: string) => {
    setSelectedMovies((prev) => prev.filter((m) => m.titleWithYear !== titleWithYear));
  };

  const handleGenerateRecommendations = () => {
    if (selectedMovies.length === 0) {
      showToast('error', 'No Movies Selected', 'Please add at least one movie rating to generate hybrid recommendations.');
      return;
    }

    setMoviesList([]);
    setHasMore(false);
    const payload: Record<string, number> = {};
    selectedMovies.forEach((item) => {
      payload[item.titleWithYear] = item.rating;
    });

    hybridMutation.mutate(
      { ratings: payload, limit: 10, offset: 0 },
      {
        onSuccess: (data) => {
          setMoviesList(data.results || []);
          setTotalCount(data.count || 0);
          setHasMore(data.has_more ?? false);
        },
        onError: (err) => {
          showToast('error', 'Recommendation Failed', err.message || 'Unable to compute hybrid KNN recommendations.');
        },
      }
    );
  };

  const handleLoadMore = async () => {
    if (selectedMovies.length === 0 || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const payload: Record<string, number> = {};
      selectedMovies.forEach((item) => {
        payload[item.titleWithYear] = item.rating;
      });
      const res = await recommendationService.recommendHybrid(payload, 10, moviesList.length);
      setMoviesList((prev) => [...prev, ...(res.results || [])]);
      setHasMore(res.has_more ?? false);
    } catch (err: any) {
      showToast('error', 'Load More Failed', err.message || 'Failed to load more recommendations.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const filteredResults = applyMovieFilters(moviesList, filters);

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white flex flex-col">
      <Navbar onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
      <Sidebar isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />

      <main className="md:ml-64 pt-20 md:pt-24 pb-16 px-3 sm:px-4 md:px-8 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-6 sm:gap-8">
        {/* Page Header */}
        <section className="text-center max-w-2xl mx-auto flex flex-col items-center mt-2 sm:mt-4 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel border border-[#ffdaa0]/30 text-xs font-semibold text-[#ffdaa0] mb-3">
            <ThumbsUp className="w-3.5 h-3.5 text-[#f5b94d]" /> Personalized Picks
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold font-headline tracking-tight text-white mb-3">
            Because You <span className="gradient-text-gold">Liked</span>
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm md:text-base font-body leading-relaxed mb-6 px-2">
            Build your personalized film profile by rating movies you've seen. The more you rate, the better your recommendations get.
          </p>
        </section>

        {/* Interactive Rating Builder Card */}
        <section className="glass-panel p-4 sm:p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#f5b94d]/10 rounded-full blur-[100px] pointer-events-none" />

          <h2 className="text-base sm:text-lg font-bold font-headline text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#f5b94d]" /> 1. Select & Rate Movies You've Seen
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-6">
            {/* Search Input */}
            <div className="relative md:col-span-6">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Search Movie Title
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={movieSearch}
                  onChange={(e) => setMovieSearch(e.target.value)}
                  placeholder="Search movie title to rate..."
                  className="w-full bg-[#111318] border border-white/15 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#f5b94d]"
                />
              </div>

              {movieSearch.trim().length >= 2 && autocompleteData && autocompleteData.results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 glass-dropdown rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[220px] overflow-y-auto z-50 p-2">
                  {autocompleteData.results.map((m) => (
                    <div
                      key={m.tmdb_id}
                      onClick={() => handleAddMovie(m.title, m.release_date)}
                      className="flex items-center justify-between p-2 hover:bg-white/10 rounded-xl cursor-pointer transition-colors"
                    >
                      <span className="text-xs font-bold text-white truncate">{m.title}</span>
                      <span className="text-[10px] text-gray-400">
                        {m.release_date ? new Date(m.release_date).getFullYear() : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rating Stars Input */}
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Your Rating (1 to 5 Stars)
              </label>
              <div className="flex items-center gap-3 bg-[#111318] p-2 rounded-xl border border-white/15">
                <RatingStars rating={selectedRating} onRatingChange={setSelectedRating} size="md" />
                <span className="text-xs font-bold text-[#f5b94d]">{selectedRating}/5</span>
              </div>
            </div>

            {/* Add Button */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => handleAddMovie(movieSearch)}
                className="w-full py-2.5 rounded-xl bg-[#f5b94d] hover:bg-[#e2a537] text-[#111318] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>

          {/* Selected Rated Movies Badges */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Your Current Rated Profile ({selectedMovies.length} movies)
            </h3>
            <div className="flex flex-wrap gap-2 min-h-[44px] p-2 bg-[#111318]/60 rounded-2xl border border-white/5 items-center">
              <AnimatePresence>
                {selectedMovies.map((item) => (
                  <motion.div
                    key={item.titleWithYear}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white"
                  >
                    <span className="font-semibold">{item.titleWithYear}</span>
                    <span className="flex items-center gap-0.5 text-[#f5b94d] font-bold text-[11px]">
                      <Star className="w-3 h-3 fill-[#f5b94d]" /> {item.rating}
                    </span>
                    <button
                      onClick={() => handleRemoveMovie(item.titleWithYear)}
                      className="text-gray-400 hover:text-red-400 ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {selectedMovies.length === 0 && (
                <span className="text-xs text-gray-500 italic p-1">No movies added to profile yet.</span>
              )}
            </div>
          </div>

          {/* Trigger Generate Button */}
          <button
            type="button"
            onClick={handleGenerateRecommendations}
            disabled={hybridMutation.isPending}
            className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-xs sm:text-sm hover:brightness-110 transition-all shadow-[0_0_25px_rgba(245,185,77,0.35)] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {hybridMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" /> Generating Personalized Recommendations...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Generate Recommendations
              </span>
            )}
          </button>
        </section>

        {/* Recommendation Results Grid */}
        <section className="mt-4">
          {hybridMutation.isPending ? (
            <SkeletonGrid count={10} message="Processing sparse Movie x User matrix with Scikit-Learn KNN..." />
          ) : hybridMutation.isSuccess && moviesList.length > 0 ? (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-base sm:text-xl font-bold font-headline text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#f5b94d]" /> Recommended For You
                  {totalCount > 0 && <span className="text-xs text-gray-400 font-normal">({moviesList.length} of {totalCount} loaded)</span>}
                </h2>
                <FilterDropdown
                  filters={filters}
                  onFilterChange={setFilters}
                  totalCount={moviesList.length}
                  filteredCount={filteredResults.length}
                />
              </div>

              {filteredResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
                  {filteredResults.map((movie, idx) => (
                    <MovieCard key={`${movie.tmdb_id}-${idx}`} movie={movie} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="filter"
                  title="No recommendations match selected filters."
                  description="Try adjusting your rating or movie release age filter options."
                />
              )}

              {hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl glass-panel border border-[#f5b94d]/40 text-[#ffdaa0] font-bold text-xs sm:text-sm hover:bg-[#f5b94d]/10 hover:border-[#f5b94d] hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,185,77,0.25)] flex items-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 text-[#f5b94d] ${isLoadingMore ? 'animate-spin' : ''}`} />
                    {isLoadingMore ? 'Loading More Movies...' : `View More Movies (${totalCount - moviesList.length} remaining)`}
                  </button>
                </div>
              )}
            </div>
          ) : hybridMutation.isSuccess ? (
            <EmptyState
              icon="film"
              title="No hybrid recommendations found."
              description="Try rating different movies or adding popular titles to your profile."
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-xs sm:text-sm text-gray-500 font-body">
                Click "Generate Hybrid Recommendations" above to run the KNN filtering algorithm.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
