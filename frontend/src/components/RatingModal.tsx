import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Sparkles } from 'lucide-react';
import { RatingStars } from './RatingStars';
import { useAddOrUpdateRating } from '../hooks/useRatings';
import { useToast } from '../contexts/ToastContext';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie: {
    tmdb_id: number;
    title: string;
    poster?: string | null;
  };
  existingRating?: number;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  movie,
  existingRating = 0,
}) => {
  const [selectedRating, setSelectedRating] = useState<number>(existingRating || 5);
  const addOrUpdateMutation = useAddOrUpdateRating();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRating <= 0) return;

    try {
      await addOrUpdateMutation.mutateAsync({
        movieId: movie.tmdb_id,
        rating: selectedRating,
      });
      showToast(
        'success',
        existingRating ? 'Rating Updated' : 'Rating Saved',
        `You rated "${movie.title}" ${selectedRating} star${selectedRating > 1 ? 's' : ''}.`
      );
      onClose();
    } catch (err) {
      showToast('error', 'Failed to save rating', 'Please check your connection and try again.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-md glass-panel p-6 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-6">
              {movie.poster ? (
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-16 h-24 object-cover rounded-lg shadow-md border border-white/10 shrink-0"
                />
              ) : (
                <div className="w-16 h-24 bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                  <Star className="w-6 h-6 text-gray-600" />
                </div>
              )}
              <div>
                <span className="text-xs uppercase tracking-wider text-[#f5b94d] font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Rate Movie
                </span>
                <h3 className="text-lg font-bold font-headline text-white line-clamp-2 mt-0.5">
                  {movie.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Your rating feeds the Scikit-Learn collaborative AI engine.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <RatingStars
                  rating={selectedRating}
                  interactive
                  size="lg"
                  onRatingChange={(newRating) => setSelectedRating(newRating)}
                />
                <span className="text-sm font-semibold text-[#ffdaa0] mt-1">
                  {selectedRating === 5 && '🌟 Masterpiece (5/5)'}
                  {selectedRating === 4 && '👍 Great Movie (4/5)'}
                  {selectedRating === 3 && '👌 Good (3/5)'}
                  {selectedRating === 2 && '👎 Mediocre (2/5)'}
                  {selectedRating === 1 && '💩 Terrible (1/5)'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 w-full mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addOrUpdateMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] hover:brightness-110 font-semibold text-sm transition-all shadow-[0_0_20px_rgba(245,185,77,0.3)] active:scale-95 disabled:opacity-50"
                >
                  {addOrUpdateMutation.isPending ? 'Saving...' : 'Submit Rating'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
