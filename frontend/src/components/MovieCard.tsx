import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Sparkles, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Movie } from '../types';
import { RatingModal } from './RatingModal';

interface MovieCardProps {
  movie: Movie;
  userRating?: number;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, userRating }) => {
  const [isRatingOpen, setIsRatingOpen] = useState(false);

  const releaseYear = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : 'N/A';

  const matchPercentage = movie.score
    ? Math.round(movie.score * 100)
    : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -6, scale: 1.02 }}
        transition={{ duration: 0.25 }}
        className="group relative flex flex-col glass-card rounded-2xl overflow-hidden shadow-xl border border-white/5 hover:border-[#f5b94d]/30 transition-all duration-300 cursor-pointer h-full"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0c0e13]">
          {movie.poster ? (
            <img
              src={movie.poster}
              alt={movie.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gray-900 text-gray-500">
              <Film className="w-12 h-12 mb-2" />
              <span className="text-xs text-center">{movie.title}</span>
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

          {userRating && (
            <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full font-bold text-xs bg-[#111318]/80 backdrop-blur-md text-[#f5b94d] border border-[#f5b94d]/40 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-[#f5b94d]" />
              You: {userRating}/5
            </div>
          )}

          <div className="absolute inset-0 flex flex-col justify-end p-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-[#0b0d12] via-[#0b0d12]/70 to-transparent">
            <p className="text-xs text-gray-300 line-clamp-3 mb-4 leading-relaxed font-body">
              {movie.overview || 'No synopsis available for this title.'}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Link
                to={`/movie/${movie.tmdb_id}`}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors backdrop-blur-sm"
              >
                <Eye className="w-3.5 h-3.5" /> Details
              </Link>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsRatingOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-xs transition-all hover:brightness-110 shadow-lg"
              >
                <Star className="w-3.5 h-3.5 fill-[#111318]" /> Rate
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 flex flex-col justify-between flex-1 bg-[#111318]/50">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-400">{releaseYear}</span>
              <div className="flex items-center gap-1 text-[#f5b94d] font-bold text-xs">
                <Star className="w-3.5 h-3.5 fill-[#f5b94d]" />
                <span>{movie.rating ? movie.rating.toFixed(1) : 'N/A'}</span>
              </div>
            </div>

            <h3 className="font-bold text-sm font-headline text-white line-clamp-1 group-hover:text-[#ffdaa0] transition-colors">
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
          poster: movie.poster,
        }}
        existingRating={userRating}
      />
    </>
  );
};

function Film(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" strokeWidth="2" />
      <path strokeWidth="2" d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4" />
    </svg>
  );
}
