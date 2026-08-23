import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Bookmark, Sparkles, Calendar, Film, Loader2 } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { RatingModal } from '../components/RatingModal';
import { MovieCard } from '../components/MovieCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { FilterDropdown, applyMovieFilters, INITIAL_FILTERS, type MovieFilterState } from '../components/FilterDropdown';
import { useMovieDetails } from '../hooks/useRecommendations';
import { useToast } from '../contexts/ToastContext';

export const MovieDetail: React.FC = () => {
  const { tmdb_id } = useParams<{ tmdb_id: string }>();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [posterErr, setPosterErr] = useState(false);
  const [backdropErr, setBackdropErr] = useState(false);
  const [filters, setFilters] = useState<MovieFilterState>(INITIAL_FILTERS);

  const { showToast } = useToast();
  const { data, isPending, error } = useMovieDetails(tmdb_id || '');

  const movie = data?.movie;
  const similarMovies = data?.similar?.results || [];
  const filteredSimilar = applyMovieFilters(similarMovies, filters);


  const handleWatchlistToggle = () => {
    setInWatchlist(!inWatchlist);
    showToast(
      !inWatchlist ? 'success' : 'info',
      !inWatchlist ? 'Added to Watchlist' : 'Removed from Watchlist',
      `"${movie?.title || 'Movie'}" has been updated in your private watchlist.`
    );
  };

  const getPosterUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return `https://image.tmdb.org/t/p/w500${url}`;
    return url;
  };

  const posterSrc = getPosterUrl(movie?.poster);
  const releaseYear = movie?.release_date ? new Date(movie.release_date).getFullYear() : null;

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white flex flex-col">
      <Navbar onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
      <Sidebar isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />

      <main className="md:ml-64 pt-16 md:pt-20 pb-16 min-h-screen flex flex-col flex-1">
        <div className="px-4 md:px-8 py-4 max-w-7xl w-full mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-card border border-white/10 text-xs font-semibold text-gray-300 hover:text-white hover:border-white/30 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Browser
          </button>
        </div>

        {isPending ? (
          <div className="px-4 md:px-8 max-w-7xl w-full mx-auto py-12 flex flex-col gap-8">
            <div className="w-full h-80 rounded-3xl bg-white/5 animate-pulse flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#f5b94d] animate-spin" />
              <span className="text-sm font-semibold text-gray-400">Loading film details from TMDB & vector embeddings...</span>
            </div>
            <SkeletonGrid count={5} message="Searching for semantically connected sibling movies..." />
          </div>
        ) : error || !movie ? (
          <div className="px-4 md:px-8 max-w-4xl w-full mx-auto py-16 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Film className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold font-headline">Movie Information Unavailable</h2>
            <p className="text-gray-400 text-sm max-w-md">
              We couldn't retrieve the details for Movie #{tmdb_id}. Please check your connection or return to the recommendations page.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-xs hover:brightness-110 transition-all shadow-lg"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <>
            <section className="relative w-full h-[380px] md:h-[480px] overflow-hidden bg-[#0c0e13]">
              {movie.backdrop && !backdropErr ? (
                <img
                  src={movie.backdrop}
                  alt={movie.title}
                  onError={() => setBackdropErr(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-gray-950 via-gray-900 to-black" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d12] via-[#0b0d12]/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0b0d12] via-transparent to-transparent hidden md:block" />
            </section>

            <section className="px-4 md:px-8 max-w-7xl w-full mx-auto -mt-32 md:-mt-48 relative z-10 flex flex-col gap-10">
              <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-44 sm:w-56 md:w-72 shrink-0 aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl border border-white/15 bg-[#111318]"
                >
                  {posterSrc && !posterErr ? (
                    <img
                      src={posterSrc}
                      alt={movie.title}
                      onError={() => setPosterErr(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#181a20] to-[#0d0e12] text-gray-400">
                      <Film className="w-16 h-16 mb-4 text-[#f5b94d]/60" />
                      <span className="text-sm font-bold text-center text-gray-200">{movie.title}</span>
                    </div>
                  )}
                </motion.div>

                <div className="flex-1 flex flex-col justify-end pt-2 md:pt-16">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-400 mb-3">
                    {releaseYear && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#f5b94d]" />
                        {releaseYear}
                      </span>
                    )}

                    {releaseYear && <span className="w-1 h-1 bg-gray-600 rounded-full" />}

                    <div className="flex items-center gap-1 text-[#f5b94d] font-bold">
                      <Star className="w-4 h-4 fill-[#f5b94d]" />
                      <span>{movie.rating ? movie.rating.toFixed(1) : 'N/A'} TMDB</span>
                    </div>

                    <span className="w-1 h-1 bg-gray-600 rounded-full" />

                    <span className="px-2.5 py-0.5 rounded-full bg-[#42e09a]/10 text-[#42e09a] border border-[#42e09a]/30">
                      AI Vector Matched
                    </span>
                  </div>

                  <h1 className="text-3xl md:text-5xl font-extrabold font-headline text-white mb-4 tracking-tight">
                    {movie.title}
                  </h1>

                  <p className="text-gray-300 text-sm md:text-base font-body leading-relaxed max-w-3xl mb-8">
                    {movie.overview ||
                      'No detailed overview synopsis available for this title. Explore similar recommendations below.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      onClick={() => setIsRatingOpen(true)}
                      className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_25px_rgba(245,185,77,0.35)] active:scale-95 flex items-center gap-2"
                    >
                      <Star className="w-4 h-4 fill-[#111318]" /> Rate Movie
                    </button>

                    <button
                      onClick={handleWatchlistToggle}
                      className={`px-6 py-3.5 rounded-2xl border font-semibold text-sm transition-all flex items-center gap-2 ${
                        inWatchlist
                          ? 'bg-[#42e09a]/20 border-[#42e09a] text-[#42e09a]'
                          : 'glass-card border-white/15 text-white hover:bg-white/10'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${inWatchlist ? 'fill-[#42e09a]' : ''}`} />
                      {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/10">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold font-headline text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#f5b94d]" /> Sibling Movies You Might Enjoy
                  </h2>
                  {data?.similar && data.similar.results.length > 0 && (
                    <FilterDropdown
                      filters={filters}
                      onFilterChange={setFilters}
                      totalCount={data.similar.results.length}
                      filteredCount={filteredSimilar.length}
                    />
                  )}
                </div>

                {data?.similar && data.similar.results.length > 0 ? (
                  filteredSimilar.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
                      {filteredSimilar.slice(0, 10).map((rec) => (
                        <MovieCard key={rec.tmdb_id || rec.title} movie={rec} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-xs sm:text-sm">No sibling movies match the selected filters.</div>
                  )
                ) : (
                  <div className="text-gray-500 text-sm">No similar movies found.</div>
                )}
              </div>
            </section>

            {movie && (
              <RatingModal
                isOpen={isRatingOpen}
                onClose={() => setIsRatingOpen(false)}
                movie={{
                  tmdb_id: movie.tmdb_id,
                  title: movie.title,
                  poster: posterSrc,
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};