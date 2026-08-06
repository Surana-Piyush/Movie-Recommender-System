import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, Search, Plus, Trash2, Sparkles, Star } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MovieCard } from '../components/MovieCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { EmptyState } from '../components/EmptyState';
import { RatingStars } from '../components/RatingStars';
import { useHybridRecommendation, useMovieAutocomplete } from '../hooks/useRecommendations';
import { useToast } from '../contexts/ToastContext';

interface RatedItem {
  titleWithYear: string;
  rating: number;
}

export const Recommendations: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [movieSearch, setMovieSearch] = useState('');
  const [selectedRating, setSelectedRating] = useState<number>(5);

  // Preset initial rated movies list matching backend dataset titles
  const [selectedMovies, setSelectedMovies] = useState<RatedItem[]>([
    { titleWithYear: 'Interstellar (2014)', rating: 5 },
    { titleWithYear: 'Inception (2010)', rating: 5 },
    { titleWithYear: 'Titanic (1997)', rating: 2 },
  ]);

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

    const payload: Record<string, number> = {};
    selectedMovies.forEach((item) => {
      payload[item.titleWithYear] = item.rating;
    });

    hybridMutation.mutate(payload, {
      onError: (err) => {
        showToast('error', 'Recommendation Failed', err.message || 'Unable to compute hybrid KNN recommendations.');
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white flex flex-col">
      <Navbar onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
      <Sidebar isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />

      <main className="md:ml-64 pt-20 md:pt-24 pb-16 px-4 md:px-8 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-8">
        {/* Page Header */}
        <section className="text-center max-w-2xl mx-auto flex flex-col items-center mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel border border-[#ffdaa0]/30 text-xs font-semibold text-[#ffdaa0] mb-3">
            <ThumbsUp className="w-3.5 h-3.5 text-[#f5b94d]" /> Collaborative KNN Engine
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold font-headline tracking-tight text-white mb-3">
            Because You <span className="gradient-text-gold">Liked</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base font-body leading-relaxed mb-6">
            Build your personalized film profile by rating movies you've seen. Our Scikit-Learn NearestNeighbors matrix calculates recommendations based on collective viewing patterns.
          </p>
        </section>

        {/* Interactive Rating Builder Card */}
        <section className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#f5b94d]/10 rounded-full blur-[100px] pointer-events-none" />

          <h2 className="text-lg font-bold font-headline text-white mb-4 flex items-center gap-2">
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
                  placeholder="Type movie title (e.g. Interstellar, Inception)..."
                  className="w-full bg-[#111318] border border-white/15 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#f5b94d]"
                />
              </div>

              {/* Live Search Suggestions Dropdown */}
              {movieSearch.trim().length >= 2 && autocompleteData && autocompleteData.results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 glass-dropdown rounded-xl border border-white/10 shadow-2xl overflow-hidden max-h-48 overflow-y-auto z-50 p-1">
                  {autocompleteData.results.map((m) => (
                    <div
                      key={m.tmdb_id}
                      onClick={() => handleAddMovie(m.title, m.release_date)}
                      className="p-2 hover:bg-white/10 rounded-lg cursor-pointer flex items-center justify-between text-xs text-white"
                    >
                      <span className="font-semibold">{m.title} ({m.release_date ? new Date(m.release_date).getFullYear() : ''})</span>
                      <span className="text-[#f5b94d]">Add +</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rating Stars Input */}
            <div className="md:col-span-4 flex flex-col justify-end">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Your Rating ({selectedRating}/5 Stars)
              </label>
              <div className="glass-card px-4 py-2 rounded-xl border border-white/10 flex items-center h-10">
                <RatingStars
                  rating={selectedRating}
                  interactive
                  size="md"
                  onRatingChange={(r) => setSelectedRating(r)}
                />
              </div>
            </div>

            {/* Add Button */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => handleAddMovie(movieSearch)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 h-10"
              >
                <Plus className="w-4 h-4 text-[#f5b94d]" /> Add Rating
              </button>
            </div>
          </div>

          {/* Selected Rated Movies Chips */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-400 mb-2">
              Current Rated Movies ({selectedMovies.length}):
            </label>
            <div className="flex flex-wrap gap-2 min-h-[48px] p-3 glass-card rounded-2xl border border-white/10">
              <AnimatePresence>
                {selectedMovies.map((item) => (
                  <motion.div
                    key={item.titleWithYear}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111318] border border-[#f5b94d]/30 text-xs font-semibold text-white shadow-md"
                  >
                    <span>{item.titleWithYear}</span>
                    <span className="flex items-center gap-0.5 text-[#f5b94d]">
                      <Star className="w-3 h-3 fill-[#f5b94d]" /> {item.rating}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMovie(item.titleWithYear)}
                      className="text-gray-400 hover:text-red-400 p-0.5 ml-1"
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
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_25px_rgba(245,185,77,0.35)] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {hybridMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" /> Training KNN Nearest Neighbors...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Generate Hybrid Recommendations
              </span>
            )}
          </button>
        </section>

        {/* Recommendation Results Grid */}
        <section className="mt-4">
          {hybridMutation.isPending ? (
            <SkeletonGrid count={8} message="Processing sparse Movie x User matrix with Scikit-Learn KNN..." />
          ) : hybridMutation.isSuccess && hybridMutation.data ? (
            hybridMutation.data.results.length > 0 ? (
              <div className="flex flex-col gap-6">
                <h2 className="text-xl font-bold font-headline text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#f5b94d]" /> Recommended For You ({hybridMutation.data.count})
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                  {hybridMutation.data.results.map((movie) => (
                    <MovieCard key={movie.tmdb_id} movie={movie} />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon="film"
                title="No hybrid recommendations found."
                description="Try rating different movies or adding popular titles to your profile."
              />
            )
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 font-body">
                Click "Generate Hybrid Recommendations" above to run the KNN filtering algorithm.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
