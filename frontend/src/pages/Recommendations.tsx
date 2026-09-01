import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, Search, Plus, Trash2, Sparkles, Star, Film } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MovieCard } from '../components/MovieCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { EmptyState } from '../components/EmptyState';
import { RatingStars } from '../components/RatingStars';
import { FilterDropdown, applyMovieFilters, INITIAL_FILTERS, type MovieFilterState } from '../components/FilterDropdown';
import { useHybridRecommendation, useMovieAutocomplete } from '../hooks/useRecommendations';
import { useMyRatings, useAddOrUpdateRating, useDeleteRating } from '../hooks/useRatings';
import { recommendationService } from '../services/recommendation';
import { useToast } from '../contexts/ToastContext';
import type { Movie } from '../types';

interface RatedItem {
  movieId?: number;
  titleWithYear: string;
  rating: number;
  poster?: string | null;
}

export const Recommendations: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [movieSearch, setMovieSearch] = useState('');
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [selectedMovieObj, setSelectedMovieObj] = useState<{ tmdb_id: number; title: string; release_date?: string; poster?: string | null } | null>(null);
  const [filters, setFilters] = useState<MovieFilterState>(INITIAL_FILTERS);

  const [moviesList, setMoviesList] = useState<Movie[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Rated movies list initialized from user database ratings
  const [selectedMovies, setSelectedMovies] = useState<RatedItem[]>([]);

  const { data: myRatings, isLoading: isLoadingRatings } = useMyRatings();
  const addRatingMutation = useAddOrUpdateRating();
  const deleteRatingMutation = useDeleteRating();

  const hybridMutation = useHybridRecommendation();
  const { data: autocompleteData } = useMovieAutocomplete(movieSearch);
  const { showToast } = useToast();

  // 1. Sync database user ratings into local state & auto-trigger recommendation query
  useEffect(() => {
    if (myRatings) {
      const mapped: RatedItem[] = myRatings.map((item: any) => ({
        movieId: item.movie_id,
        titleWithYear: item.title || `Movie #${item.movie_id}`,
        rating: item.rating,
        poster: item.poster || null,
      }));
      setSelectedMovies(mapped);

      // Auto-trigger recommendations if user has rated movies
      if (mapped.length > 0) {
        const payload: Record<string, number> = {};
        mapped.forEach((m) => {
          payload[m.titleWithYear] = m.rating;
        });

        hybridMutation.mutate(
          { ratings: payload, limit: 10, offset: 0 },
          {
            onSuccess: (data) => {
              setMoviesList(data.results || []);
              setTotalCount(data.count || 0);
              setHasMore(data.has_more ?? false);
            },
          }
        );
      }
    }
  }, [myRatings]);

  const handleSelectAutocomplete = (m: Movie) => {
    setSelectedMovieObj({
      tmdb_id: m.tmdb_id,
      title: m.title,
      release_date: m.release_date,
      poster: m.poster,
    });
    setMovieSearch(m.title);
  };

  const handleAddMovie = async (title: string) => {
    if (!title.trim()) return;
    
    let tmdb_id = selectedMovieObj?.tmdb_id;
    let formattedTitle = selectedMovieObj?.title || title.trim();

    if (selectedMovies.some((m) => m.titleWithYear.toLowerCase() === formattedTitle.toLowerCase())) {
      showToast('info', 'Already Rated', `"${formattedTitle}" is already in your rated profile.`);
      return;
    }

    try {
      if (tmdb_id) {
        await addRatingMutation.mutateAsync({ movieId: tmdb_id, rating: selectedRating });
      }
      
      const newItem: RatedItem = {
        movieId: tmdb_id,
        titleWithYear: formattedTitle,
        rating: selectedRating,
        poster: selectedMovieObj?.poster || null,
      };

      const updated = [...selectedMovies, newItem];
      setSelectedMovies(updated);
      setMovieSearch('');
      setSelectedMovieObj(null);

      showToast('success', 'Rating Added', `Saved "${formattedTitle}" with ${selectedRating} stars.`);

      // Trigger hybrid recommendation generation
      handleGenerateRecommendationsForList(updated);
    } catch (err) {
      showToast('error', 'Save Failed', 'Unable to save movie rating.');
    }
  };

  const handleRemoveMovie = async (item: RatedItem) => {
    try {
      if (item.movieId) {
        await deleteRatingMutation.mutateAsync(item.movieId);
      }
      const updated = selectedMovies.filter((m) => m.titleWithYear !== item.titleWithYear);
      setSelectedMovies(updated);
      showToast('success', 'Rating Removed', `Removed "${item.titleWithYear}" from your profile.`);
      
      if (updated.length > 0) {
        handleGenerateRecommendationsForList(updated);
      } else {
        setMoviesList([]);
        setTotalCount(0);
      }
    } catch (err) {
      showToast('error', 'Delete Failed', 'Unable to remove rating.');
    }
  };

  const handleGenerateRecommendationsForList = (list: RatedItem[]) => {
    if (list.length === 0) return;
    setMoviesList([]);
    setHasMore(false);
    const payload: Record<string, number> = {};
    list.forEach((item) => {
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
          showToast('error', 'Recommendation Failed', err.message || 'Unable to compute personalized recommendations.');
        },
      }
    );
  };

  const handleGenerateRecommendations = () => {
    if (selectedMovies.length === 0) {
      showToast('error', 'No Movies Rated', 'Please rate at least one movie to generate personalized recommendations.');
      return;
    }
    handleGenerateRecommendationsForList(selectedMovies);
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
            Every movie you rate automatically builds your personalized AI taste profile. The recommendations below update dynamically based on your liked movies.
          </p>
        </section>

        {/* Interactive Rating Builder Card */}
        <section className="glass-panel p-4 sm:p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#f5b94d]/10 rounded-full blur-[100px] pointer-events-none" />

          <h2 className="text-base sm:text-lg font-bold font-headline text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#f5b94d]" /> Your Rated Movies & AI Profile ({selectedMovies.length} movies)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-6">
            {/* Search Input */}
            <div className="relative md:col-span-6">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Search & Rate a New Movie
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={movieSearch}
                  onChange={(e) => {
                    setMovieSearch(e.target.value);
                    if (selectedMovieObj && e.target.value !== selectedMovieObj.title) {
                      setSelectedMovieObj(null);
                    }
                  }}
                  placeholder="Type a movie title to rate..."
                  className="w-full bg-[#111318] border border-white/15 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#f5b94d]"
                />
              </div>

              {movieSearch.trim().length >= 2 && autocompleteData && autocompleteData.results.length > 0 && !selectedMovieObj && (
                <div className="absolute top-full left-0 right-0 mt-2 glass-dropdown rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[220px] overflow-y-auto z-50 p-2">
                  {autocompleteData.results.map((m) => (
                    <div
                      key={m.tmdb_id}
                      onClick={() => handleSelectAutocomplete(m)}
                      className="flex items-center justify-between p-2 hover:bg-white/10 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {m.poster ? (
                          <img src={m.poster} alt={m.title} className="w-7 h-10 object-cover rounded shrink-0" />
                        ) : (
                          <div className="w-7 h-10 bg-gray-800 rounded flex items-center justify-center shrink-0">
                            <Film className="w-3.5 h-3.5 text-gray-500" />
                          </div>
                        )}
                        <span className="text-xs font-bold text-white truncate">{m.title}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">
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
                disabled={!movieSearch.trim() || addRatingMutation.isPending}
                className="w-full py-2.5 rounded-xl bg-[#f5b94d] hover:bg-[#e2a537] text-[#111318] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Rate & Add
              </button>
            </div>
          </div>

          {/* Selected Rated Movies Badges */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Your Rated Profile Movies
            </h3>
            {isLoadingRatings ? (
              <div className="text-xs text-gray-400 animate-pulse p-2">Loading your rated profile...</div>
            ) : (
              <div className="flex flex-wrap gap-2.5 min-h-[50px] p-3 bg-[#111318]/60 rounded-2xl border border-white/10 items-center">
                <AnimatePresence>
                  {selectedMovies.map((item) => (
                    <motion.div
                      key={item.titleWithYear}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white shadow-md hover:border-[#f5b94d]/40 transition-colors"
                    >
                      {item.poster ? (
                        <img src={item.poster} alt={item.titleWithYear} className="w-5 h-7 object-cover rounded shrink-0" />
                      ) : (
                        <Film className="w-3.5 h-3.5 text-[#f5b94d] shrink-0" />
                      )}
                      <span className="font-semibold truncate max-w-[160px]">{item.titleWithYear}</span>
                      <span className="flex items-center gap-0.5 text-[#f5b94d] font-bold text-[11px]">
                        <Star className="w-3 h-3 fill-[#f5b94d]" /> {item.rating}
                      </span>
                      <button
                        onClick={() => handleRemoveMovie(item)}
                        disabled={deleteRatingMutation.isPending}
                        className="text-gray-400 hover:text-red-400 ml-1 transition-colors"
                        title="Remove Rating"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {selectedMovies.length === 0 && (
                  <span className="text-xs text-gray-400 italic p-1">
                    No movies rated yet. Rate movies across CineCast AI or search above to generate custom picks!
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Trigger Generate Button */}
          <button
            type="button"
            onClick={handleGenerateRecommendations}
            disabled={hybridMutation.isPending || selectedMovies.length === 0}
            className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-xs sm:text-sm hover:brightness-110 transition-all shadow-[0_0_25px_rgba(245,185,77,0.35)] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {hybridMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" /> Computing Hybrid AI Recommendations...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Recalculate Recommendations
              </span>
            )}
          </button>
        </section>

        {/* Recommendation Results Grid */}
        <section className="mt-4">
          {hybridMutation.isPending ? (
            <SkeletonGrid count={10} message="Blending user rating profile with Scikit-Learn KNN & FAISS Neural Vectors..." />
          ) : moviesList.length > 0 ? (
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
                  description="Try adjusting your rating or release year filter options."
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
          ) : selectedMovies.length > 0 ? (
            <EmptyState
              icon="film"
              title="No recommendations found."
              description="Try rating additional movies to expand your taste profile."
            />
          ) : (
            <EmptyState
              icon="star"
              title="No Movies Rated Yet"
              description="Rate a few movies above or across CineCast AI to generate hyper-personalized AI picks!"
              actionText="Explore Movies"
              actionLink="/semantic-search"
            />
          )}
        </section>
      </main>
    </div>
  );
};
