import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Trash2, Edit2, Film } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { RatingStars } from '../components/RatingStars';
import { RatingModal } from '../components/RatingModal';
import { SkeletonGrid } from '../components/SkeletonCard';
import { EmptyState } from '../components/EmptyState';
import { useMyRatings, useDeleteRating } from '../hooks/useRatings';
import { useToast } from '../contexts/ToastContext';

export const Ratings: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<{ tmdb_id: number; title: string; rating: number } | null>(null);

  const { data: myRatings, isLoading } = useMyRatings();
  const deleteMutation = useDeleteRating();
  const { showToast } = useToast();

  const handleDelete = async (movieId: number) => {
    try {
      await deleteMutation.mutateAsync(movieId);
      showToast('success', 'Rating Deleted', 'The movie rating has been removed from your history.');
    } catch (err) {
      showToast('error', 'Delete Failed', 'Unable to remove rating.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white flex flex-col">
      <Navbar onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
      <Sidebar isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />

      <main className="md:ml-64 pt-20 md:pt-24 pb-16 px-4 md:px-8 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-8">
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <span className="text-xs uppercase tracking-widest font-bold text-[#f5b94d] flex items-center gap-1.5 mb-1">
              <Star className="w-3.5 h-3.5 fill-[#f5b94d]" /> Personal Ratings History
            </span>
            <h1 className="text-3xl font-extrabold font-headline text-white">
              My Rated Movies
            </h1>
          </div>
          <div className="px-4 py-2 rounded-xl glass-card border border-white/10 text-xs font-semibold text-gray-300">
            Total Rated: <span className="text-[#f5b94d] font-bold">{myRatings?.length || 0}</span>
          </div>
        </section>

        <section className="w-full">
          {isLoading ? (
            <SkeletonGrid count={6} message="Fetching user ratings from database..." />
          ) : myRatings && myRatings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {myRatings.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="glass-panel p-5 rounded-2xl border border-white/10 flex items-center justify-between gap-4 shadow-xl hover:border-[#f5b94d]/40 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-14 rounded-xl bg-gradient-to-tr from-[#f5b94d]/20 to-[#42e09a]/20 border border-white/10 flex items-center justify-center shrink-0 text-[#f5b94d]">
                        <Film className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h4 className="font-bold text-sm font-headline text-white truncate">
                          Movie ID #{item.movie_id}
                        </h4>
                        <div className="mt-1">
                          <RatingStars rating={item.rating} size="sm" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() =>
                          setEditingMovie({
                            tmdb_id: item.movie_id,
                            title: `Movie #${item.movie_id}`,
                            rating: item.rating,
                          })
                        }
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                        title="Edit Rating"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(item.movie_id)}
                        disabled={deleteMutation.isPending}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                        title="Delete Rating"
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
              icon="star"
              title="You haven't rated any movies yet."
              description="Start rating movies across CineCast AI to personalize your collaborative recommendations."
              actionText="Explore & Rate Movies"
              actionLink="/semantic-search"
            />
          )}
        </section>

        {editingMovie && (
          <RatingModal
            isOpen={!!editingMovie}
            onClose={() => setEditingMovie(null)}
            movie={{ tmdb_id: editingMovie.tmdb_id, title: editingMovie.title }}
            existingRating={editingMovie.rating}
          />
        )}
      </main>
    </div>
  );
};
