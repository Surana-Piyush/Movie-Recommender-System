import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Sparkles, Eye, Film, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Movie } from '../types';
import { RatingModal } from './RatingModal';
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '../hooks/useWatchlist';
import { useToast } from '../contexts/ToastContext';

interface MovieCardProps {
  movie: Movie;
  userRating?: number;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, userRating }) => {
  const navigate = useNavigate();
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const { data: watchlistItems } = useWatchlist();
  const addToWatchlistMutation = useAddToWatchlist();
  const removeFromWatchlistMutation = useRemoveFromWatchlist();
  const { showToast } = useToast();

  const inWatchlist = Boolean(watchlistItems?.some((item) => item.movie_id === movie.tmdb_id));

  const handleWatchlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!movie.tmdb_id) return;
    try {
      if (inWatchlist) {
        await removeFromWatchlistMutation.mutateAsync(movie.tmdb_id);
        showToast('info', 'Removed from Watchlist', `"${movie.title}" removed from watchlist.`);
      } else {
        await addToWatchlistMutation.mutateAsync(movie.tmdb_id);
        showToast('success', 'Added to Watchlist', `"${movie.title}" saved to watchlist.`);
      }
    } catch (err) {
      showToast('error', 'Watchlist Failed', 'Unable to update watchlist.');
    }
  };

  const releaseYear = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : 'N/A';

  const matchPercentage = movie.score != null
    ? Math.min(Math.round(movie.score <= 1 ? movie.score * 100 : movie.score), 100)
    : null;

  const getPosterUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return `https://image.tmdb.org/t/p/w500${url}`;
    return url;
  };

  const posterSrc = getPosterUrl(movie.poster);

  const handleCardClick = () => {
    if (movie.tmdb_id) {
      navigate(`/movie/${movie.tmdb_id}`);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -6, scale: 1.02 }}
        transition={{ duration: 0.25 }}
        onClick={handleCardClick}
        className="group relative flex flex-col glass-card rounded-2xl overflow-hidden shadow-xl border border-white/5 hover:border-[#f5b94d]/30 transition-all duration-300 cursor-pointer h-full"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0c0e13]">
          {posterSrc && !imgError ? (
            <img
              src={posterSrc}
              alt={movie.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#181a20] to-[#0d0e12] border border-white/5 text-gray-400 group-hover:text-[#ffdaa0] transition-colors relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#f5b94d_1px,transparent_1px)] [background-size:16px_16px]" />
              <Film className="w-12 h-12 mb-3 text-[#f5b94d]/60 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-xs font-bold text-center line-clamp-2 px-2 text-gray-200">{movie.title}</span>
              <span className="text-[10px] text-gray-500 mt-1 font-semibold">{releaseYear}</span>
            </div>
          )}

          {movie.backdrop && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-0 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"
              style={{ backgroundImage: `url(${movie.backdrop})` }}
            />
          )}

          <div className="absolute inset-0 scrim-bottom opacity-80 group-hover:opacity-95 transition-opacity duration-300" />

          {matchPercentage !== null && (
            <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full font-bold text-xs bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#0c0e13] shadow-[0_0_15px_rgba(66,224,154,0.4)] flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {matchPercentage}% Match
            </div>
          )}

          <button
            type="button"
            onClick={handleWatchlistClick}
            className={`absolute top-3 left-3 z-30 p-2 rounded-full backdrop-blur-md border transition-all ${
              inWatchlist
                ? 'bg-[#42e09a] text-[#0b0d12] border-[#42e09a] shadow-[0_0_12px_rgba(66,224,154,0.5)]'
                : 'bg-[#111318]/70 text-gray-300 border-white/15 hover:text-white hover:bg-white/20'
            }`}
            title={inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${inWatchlist ? 'fill-[#0b0d12]' : ''}`} />
          </button>

          {userRating && (
            <div className="absolute top-3 left-12 z-10 px-2.5 py-1 rounded-full font-bold text-xs bg-[#111318]/80 backdrop-blur-md text-[#f5b94d] border border-[#f5b94d]/40 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-[#f5b94d]" />
              You: {userRating}/5
            </div>
          )}

          <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-4 z-20 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-[#0b0d12] via-[#0b0d12]/80 sm:via-[#0b0d12]/70 to-transparent">
            <p className="text-xs text-gray-300 line-clamp-2 sm:line-clamp-3 mb-3 sm:mb-4 leading-relaxed font-body hidden sm:block">
              {movie.overview || 'No synopsis available for this title.'}
            </p>

            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCardClick();
                }}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-[11px] sm:text-xs transition-colors backdrop-blur-md"
              >
                <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Details
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsRatingOpen(true);
                }}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-[11px] sm:text-xs transition-all hover:brightness-110 shadow-lg"
              >
                <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-[#111318]" /> Rate
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 flex flex-col justify-between flex-1 bg-[#111318]/50">
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <span className="text-[11px] sm:text-xs font-semibold text-gray-400">{releaseYear}</span>
              <div className="flex items-center gap-1 text-[#f5b94d] font-bold text-[11px] sm:text-xs">
                <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-[#f5b94d]" />
                <span>{movie.rating ? movie.rating.toFixed(1) : 'N/A'}</span>
              </div>
            </div>

            <h3 className="font-bold text-xs sm:text-sm font-headline text-white line-clamp-1 group-hover:text-[#ffdaa0] transition-colors">
              {movie.title}
            </h3>
          </div>
        </div>
      </motion.div>

      <RatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        movie={{
          tmdb_id: movie.tmdb_id,
          title: movie.title,
          poster: posterSrc,
        }}
        existingRating={userRating}
      />
    </>
  );
};
