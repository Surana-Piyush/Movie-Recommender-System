import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Film, Search, Sparkles, Star } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MovieCard } from '../components/MovieCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { EmptyState } from '../components/EmptyState';
import { FilterDropdown, applyMovieFilters, INITIAL_FILTERS, type MovieFilterState } from '../components/FilterDropdown';
import { useSimilarMovie, useMovieAutocomplete } from '../hooks/useRecommendations';
import { recommendationService } from '../services/recommendation';
import { useToast } from '../contexts/ToastContext';
import type { Movie } from '../types';

export const SimilarMovie: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTitle = searchParams.get('q') || '';
  const [titleInput, setTitleInput] = useState(initialTitle);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [filters, setFilters] = useState<MovieFilterState>(INITIAL_FILTERS);

  const [seedMovie, setSeedMovie] = useState<Movie | null>(null);
  const [siblingMovies, setSiblingMovies] = useState<Movie[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const similarMovieMutation = useSimilarMovie();
  const { data: autocompleteData } = useMovieAutocomplete(titleInput);
  const { showToast } = useToast();

  const sampleMovies = ['Interstellar', 'Dune: Part One', 'Inception', 'Blade Runner 2049', 'The Dark Knight', 'Titanic'];

  const handleFetchSimilar = (movieName: string) => {
    if (!movieName.trim()) return;
    setTitleInput(movieName);
    setSearchParams({ q: movieName });
    setShowAutocomplete(false);
    setSeedMovie(null);
    setSiblingMovies([]);
    setHasMore(false);

    // Request limit: 11 (1 seed + 10 siblings) for fast initial load
    similarMovieMutation.mutate(
      { movieTitle: movieName, limit: 11, offset: 0 },
      {
        onSuccess: (data) => {
          const results = data.results || [];
          if (results.length > 0) {
            setSeedMovie(results[0]);
            setSiblingMovies(results.slice(1));
          } else {
            setSeedMovie(null);
            setSiblingMovies([]);
          }
          setTotalCount(data.count ? data.count - 1 : 0);
          setHasMore(data.has_more ?? false);
        },
        onError: (err) => {
          showToast('error', 'Search Failed', err.message || 'Unable to find similar movies.');
        },
      }
    );
  };

  const handleLoadMore = async () => {
    if (!titleInput.trim() || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const offset = 1 + siblingMovies.length;
      const res = await recommendationService.similarMovie(titleInput, 10, offset);
      setSiblingMovies((prev) => [...prev, ...(res.results || [])]);
      setHasMore(res.has_more ?? false);
    } catch (err: any) {
      showToast('error', 'Load More Failed', err.message || 'Failed to load more movies.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (initialTitle.trim()) {
      handleFetchSimilar(initialTitle);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFetchSimilar(titleInput);
  };

  const filteredSiblings = applyMovieFilters(siblingMovies, filters);

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white flex flex-col">
      <Navbar onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
      <Sidebar isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />

      <main className="md:ml-64 pt-20 md:pt-24 pb-16 px-3 sm:px-4 md:px-8 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-6 sm:gap-8">
        <section className="text-center max-w-2xl mx-auto flex flex-col items-center mt-2 sm:mt-4 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel border border-[#42e09a]/30 text-xs font-semibold text-[#65fdb5] mb-3">
            <Film className="w-3.5 h-3.5 text-[#42e09a]" /> Find Similar Movies
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold font-headline tracking-tight text-white mb-3">
            Loved a movie? <span className="gradient-text-mint">Find its siblings.</span>
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm md:text-base font-body leading-relaxed mb-6 px-2">
            Enter a movie you loved and we'll find others that feel just like it.
          </p>

          <div className="relative w-full max-w-xl">
            <form onSubmit={handleSubmit} className="relative">
              <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                value={titleInput}
                onChange={(e) => {
                  setTitleInput(e.target.value);
                  setShowAutocomplete(true);
                }}
                onFocus={() => setShowAutocomplete(true)}
                placeholder="Search for a movie title (e.g. Inception)..."
                className="w-full bg-[#111318] border border-white/15 focus:border-[#42e09a] rounded-2xl py-3.5 sm:py-4 pl-10 sm:pl-12 pr-28 text-xs sm:text-sm text-white placeholder-gray-500 shadow-2xl focus:outline-none focus:ring-1 focus:ring-[#42e09a] transition-all"
              />
              <button
                type="submit"
                disabled={similarMovieMutation.isPending}
                className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-xs hover:brightness-110 transition-all shadow-[0_0_15px_rgba(66,224,154,0.3)] disabled:opacity-50"
              >
                {similarMovieMutation.isPending ? 'Searching...' : 'Find Siblings'}
              </button>
            </form>

            {showAutocomplete && autocompleteData && autocompleteData.results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 glass-dropdown rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[280px] overflow-y-auto z-50 p-2 text-left">
                {autocompleteData.results.map((m) => (
                  <div
                    key={m.tmdb_id}
                    onClick={() => handleFetchSimilar(m.title)}
                    className="flex items-center gap-3 p-2.5 hover:bg-white/10 rounded-xl cursor-pointer transition-colors"
                  >
                    {m.poster && (
                      <img
                        src={m.poster}
                        alt={m.title}
                        className="w-8 h-12 object-cover rounded-md border border-white/10 shrink-0"
                      />
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-xs sm:text-sm text-white truncate">{m.title}</span>
                      <span className="text-[10px] sm:text-xs text-gray-400">
                        {m.release_date ? new Date(m.release_date).getFullYear() : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-4 max-w-xl">
            <span className="text-[11px] sm:text-xs text-gray-500 font-semibold mr-1">Popular picks:</span>
            {sampleMovies.map((name, idx) => (
              <button
                key={idx}
                onClick={() => handleFetchSimilar(name)}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold glass-card border border-white/10 text-gray-300 hover:text-[#42e09a] hover:border-[#42e09a]/40 transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4">
          {similarMovieMutation.isPending ? (
            <SkeletonGrid count={10} message={`Computing vector embeddings for "${titleInput}"...`} />
          ) : similarMovieMutation.isSuccess && (seedMovie || siblingMovies.length > 0) ? (
            <div className="flex flex-col gap-6 sm:gap-8">
              {seedMovie && (
                <div className="glass-panel p-5 sm:p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-5 sm:gap-6 items-center">
                  <div className="absolute -left-20 -top-20 w-64 h-64 bg-[#f5b94d]/15 rounded-full blur-[100px] pointer-events-none" />

                  <img
                    src={seedMovie.poster || ''}
                    alt={seedMovie.title}
                    className="w-32 sm:w-40 md:w-52 aspect-[2/3] object-cover rounded-2xl shadow-2xl border border-white/10 shrink-0"
                  />

                  <div className="flex flex-col flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-bold text-[#f5b94d] mb-2">
                      <Sparkles className="w-4 h-4" /> Seed Title Searched
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-4xl font-extrabold font-headline text-white mb-2">
                      {seedMovie.title}
                    </h2>
                    <div className="flex items-center justify-center md:justify-start gap-3 text-xs text-gray-300 mb-3 sm:mb-4 font-semibold">
                      <span>
                        {seedMovie.release_date
                          ? new Date(seedMovie.release_date).getFullYear()
                          : ''}
                      </span>
                      <span className="flex items-center gap-1 text-[#f5b94d]">
                        <Star className="w-3.5 h-3.5 fill-[#f5b94d]" />
                        {seedMovie.rating?.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-300 font-body leading-relaxed max-w-3xl line-clamp-3 mb-4 sm:mb-6">
                      {seedMovie.overview}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <h3 className="text-base sm:text-xl font-bold font-headline text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#42e09a]" /> Movies Like{' '}
                    <span className="text-[#ffdaa0] italic">{titleInput}</span>
                    {totalCount > 0 && <span className="text-xs text-gray-400 font-normal">({siblingMovies.length} of {totalCount} loaded)</span>}
                  </h3>
                  <FilterDropdown
                    filters={filters}
                    onFilterChange={setFilters}
                    totalCount={siblingMovies.length}
                    filteredCount={filteredSiblings.length}
                  />
                </div>

                {filteredSiblings.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
                    {filteredSiblings.map((movie, idx) => (
                      <MovieCard key={`${movie.tmdb_id}-${idx}`} movie={movie} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="filter"
                    title="No sibling movies match selected filters."
                    description="Try adjusting your rating or release year filters."
                  />
                )}

                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl glass-panel border border-[#42e09a]/40 text-[#65fdb5] font-bold text-xs sm:text-sm hover:bg-[#42e09a]/10 hover:border-[#42e09a] hover:scale-105 transition-all shadow-[0_0_20px_rgba(66,224,154,0.25)] flex items-center gap-2 disabled:opacity-50"
                    >
                      <Sparkles className={`w-4 h-4 text-[#42e09a] ${isLoadingMore ? 'animate-spin' : ''}`} />
                      {isLoadingMore ? 'Loading More Movies...' : `View More Movies (${totalCount - siblingMovies.length} remaining)`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : similarMovieMutation.isSuccess ? (
            <EmptyState
              icon="film"
              title="No sibling movies found."
              description={`We couldn't find movies similar to "${titleInput}". Try checking title spelling or searching another popular movie.`}
            />
          ) : (
            <div className="text-center py-12 sm:py-16 glass-panel rounded-3xl border border-white/5 max-w-xl mx-auto flex flex-col items-center px-4">
              <Film className="w-10 h-10 sm:w-12 sm:h-12 text-[#42e09a]/60 mb-3" />
              <h3 className="text-base sm:text-lg font-bold text-white mb-1 font-headline">Search for any Movie</h3>
              <p className="text-xs text-gray-400 font-body max-w-md text-center">
                Enter a title in the search box above to discover visually & narratively connected films.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
