import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Film, Search, Sparkles, Star } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MovieCard } from '../components/MovieCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { EmptyState } from '../components/EmptyState';
import { useSimilarMovie, useMovieAutocomplete } from '../hooks/useRecommendations';
import { useToast } from '../contexts/ToastContext';

export const SimilarMovie: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTitle = searchParams.get('q') || 'Interstellar';
  const [titleInput, setTitleInput] = useState(initialTitle);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const similarMovieMutation = useSimilarMovie();
  const { data: autocompleteData } = useMovieAutocomplete(titleInput);
  const { showToast } = useToast();

  const sampleMovies = ['Interstellar', 'Dune: Part One', 'Inception', 'Blade Runner 2049', 'The Dark Knight', 'Titanic'];

  const handleFetchSimilar = (movieName: string) => {
    if (!movieName.trim()) return;
    setTitleInput(movieName);
    setSearchParams({ q: movieName });
    setShowAutocomplete(false);

    similarMovieMutation.mutate(movieName, {
      onError: (err) => {
        showToast('error', 'Search Failed', err.message || 'Unable to find similar movies.');
      },
    });
  };

  useEffect(() => {
    if (initialTitle) {
      handleFetchSimilar(initialTitle);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFetchSimilar(titleInput);
  };

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white flex flex-col">
      <Navbar onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
      <Sidebar isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />

      <main className="md:ml-64 pt-20 md:pt-24 pb-16 px-4 md:px-8 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-8">
        <section className="text-center max-w-2xl mx-auto flex flex-col items-center mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel border border-[#42e09a]/30 text-xs font-semibold text-[#65fdb5] mb-3">
            <Film className="w-3.5 h-3.5 text-[#42e09a]" /> Sibling Movie Vector Discovery
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold font-headline tracking-tight text-white mb-3">
            Loved a movie? <span className="gradient-text-mint">Find its siblings.</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base font-body leading-relaxed mb-6">
            Enter a film title that resonated with you. Our neural engine curates visually and narratively connected masterpieces.
          </p>

          <div className="relative w-full max-w-xl">
            <form onSubmit={handleSubmit} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={titleInput}
                onChange={(e) => {
                  setTitleInput(e.target.value);
                  setShowAutocomplete(true);
                }}
                onFocus={() => setShowAutocomplete(true)}
                placeholder="Search for a movie title (e.g. Blade Runner 2049)..."
                className="w-full bg-[#111318] border border-white/15 focus:border-[#42e09a] rounded-2xl py-4 pl-12 pr-28 text-sm text-white placeholder-gray-500 shadow-2xl focus:outline-none focus:ring-1 focus:ring-[#42e09a] transition-all"
              />
              <button
                type="submit"
                disabled={similarMovieMutation.isPending}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-xs hover:brightness-110 transition-all shadow-[0_0_15px_rgba(66,224,154,0.3)] disabled:opacity-50"
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
                      <span className="text-sm font-bold text-white truncate">{m.title}</span>
                      <span className="text-xs text-gray-400">
                        {m.release_date ? new Date(m.release_date).getFullYear() : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 max-w-xl">
            <span className="text-xs text-gray-500 font-semibold mr-1">Popular picks:</span>
            {sampleMovies.map((name, idx) => (
              <button
                key={idx}
                onClick={() => handleFetchSimilar(name)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold glass-card border border-white/10 text-gray-300 hover:text-[#42e09a] hover:border-[#42e09a]/40 transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4">
          {similarMovieMutation.isPending ? (
            <SkeletonGrid count={8} message={`Computing vector embeddings for "${titleInput}"...`} />
          ) : similarMovieMutation.isSuccess && similarMovieMutation.data ? (
            similarMovieMutation.data.results.length > 0 ? (
              <div className="flex flex-col gap-8">
                {similarMovieMutation.data.results[0] && (
                  <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-6 items-center">
                    <div className="absolute -left-20 -top-20 w-64 h-64 bg-[#f5b94d]/15 rounded-full blur-[100px] pointer-events-none" />

                    <img
                      src={similarMovieMutation.data.results[0].poster || ''}
                      alt={similarMovieMutation.data.results[0].title}
                      className="w-40 md:w-52 aspect-[2/3] object-cover rounded-2xl shadow-2xl border border-white/10 shrink-0"
                    />

                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#f5b94d] mb-2">
                        <Sparkles className="w-4 h-4" /> Seed Title Searched
                      </div>
                      <h2 className="text-2xl md:text-4xl font-extrabold font-headline text-white mb-2">
                        {similarMovieMutation.data.results[0].title}
                      </h2>
                      <div className="flex items-center gap-3 text-xs text-gray-300 mb-4 font-semibold">
                        <span>
                          {similarMovieMutation.data.results[0].release_date
                            ? new Date(similarMovieMutation.data.results[0].release_date).getFullYear()
                            : ''}
                        </span>
                        <span className="flex items-center gap-1 text-[#f5b94d]">
                          <Star className="w-3.5 h-3.5 fill-[#f5b94d]" />
                          {similarMovieMutation.data.results[0].rating?.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 font-body leading-relaxed max-w-3xl line-clamp-3 mb-6">
                        {similarMovieMutation.data.results[0].overview}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold font-headline text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#42e09a]" /> Movies Like{' '}
                    <span className="text-[#ffdaa0] italic">{titleInput}</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {similarMovieMutation.data.results.slice(1).map((movie) => (
                      <MovieCard key={movie.tmdb_id} movie={movie} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon="film"
                title="No sibling movies found."
                description={`We couldn't find movies similar to "${titleInput}". Try checking title spelling or searching another popular movie.`}
              />
            )
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 font-body">
                Search for a movie title above to retrieve its nearest vector siblings.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
