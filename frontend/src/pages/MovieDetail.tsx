import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Bookmark, Sparkles, Calendar, Film } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { RatingModal } from '../components/RatingModal';
import { MovieCard } from '../components/MovieCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { useSimilarMovie } from '../hooks/useRecommendations';
import { useToast } from '../contexts/ToastContext';
import type { Movie } from '../types';

export const MovieDetail: React.FC = () => {
  const { tmdb_id } = useParams<{ tmdb_id: string }>();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [movie, setMovie] = useState<Movie | null>(null);

  const { showToast } = useToast();
  const similarMutation = useSimilarMovie();

  useEffect(() => {
    if (tmdb_id) {
      similarMutation.mutate(`ID ${tmdb_id}`, {
        onSuccess: (data) => {
          if (data.results && data.results.length > 0) {
            setMovie(data.results[0]);
          }
        },
      });
    }
  }, [tmdb_id]);

  const handleWatchlistToggle = () => {
    setInWatchlist(!inWatchlist);
    showToast(
      !inWatchlist ? 'success' : 'info',
      !inWatchlist ? 'Added to Watchlist' : 'Removed from Watchlist',
      `"${movie?.title || 'Movie'}" has been updated in your private watchlist.`
    );
  };

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

        <section className="relative w-full h-[380px] md:h-[480px] overflow-hidden bg-[#0c0e13]">
          {movie?.backdrop ? (
            <img
              src={movie.backdrop}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-gray-900 via-gray-800 to-black" />
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
              {movie?.poster ? (
                <img src={movie.poster} alt={movie?.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  <Film className="w-12 h-12" />
                </div>
              )}
            </motion.div>

            <div className="flex-1 flex flex-col justify-end pt-2 md:pt-16">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-400 mb-3">
                {movie?.release_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#f5b94d]" />
                    {new Date(movie.release_date).getFullYear()}
                  </span>
                )}

                <span className="w-1 h-1 bg-gray-600 rounded-full" />

                <div className="flex items-center gap-1 text-[#f5b94d] font-bold">
                  <Star className="w-4 h-4 fill-[#f5b94d]" />
                  <span>{movie?.rating ? movie.rating.toFixed(1) : 'N/A'} TMDB</span>
                </div>

                <span className="w-1 h-1 bg-gray-600 rounded-full" />

                <span className="px-2.5 py-0.5 rounded-full bg-[#42e09a]/10 text-[#42e09a] border border-[#42e09a]/30">
                  AI Match Recommended
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-extrabold font-headline text-white mb-4 tracking-tight">
                {movie?.title || `Movie #${tmdb_id}`}
              </h1>

              <p className="text-gray-300 text-sm md:text-base font-body leading-relaxed max-w-3xl mb-8">
                {movie?.overview ||
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
            <h2 className="text-xl md:text-2xl font-bold font-headline text-white mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#f5b94d]" /> Sibling Movies You Might Enjoy
            </h2>

            {similarMutation.isPending ? (
              <SkeletonGrid count={5} message="Finding semantically connected sibling movies..." />
            ) : similarMutation.data && similarMutation.data.results.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {similarMutation.data.results.slice(0, 5).map((rec) => (
                  <MovieCard key={rec.tmdb_id} movie={rec} />
                ))}
              </div>
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
              poster: movie.poster,
            }}
          />
        )}
      </main>
    </div>
  );
};
