import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Search, X } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MovieCard } from '../components/MovieCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { EmptyState } from '../components/EmptyState';
import { useSemanticSearch } from '../hooks/useRecommendations';
import { useToast } from '../contexts/ToastContext';

export const SemanticSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const semanticSearchMutation = useSemanticSearch();
  const { showToast } = useToast();

  const examplePrompts = [
    'Funny superhero movie with comedy',
    'Mind bending science fiction time travel',
    'Emotional romantic drama in Paris',
    'Neon cyberpunk noir detective thriller',
    'Deep space psychological thriller',
    'High adrenaline desert car chase',
  ];

  const handleSearch = (queryText: string) => {
    if (!queryText.trim()) return;
    setQuery(queryText);
    setSearchParams({ q: queryText });
    semanticSearchMutation.mutate(queryText, {
      onError: (err) => {
        showToast('error', 'Search Failed', err.message || 'Unable to connect to semantic search engine.');
      },
    });
  };

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white flex flex-col">
      <Navbar onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
      <Sidebar isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />

      <main className="md:ml-64 pt-20 md:pt-24 pb-16 px-4 md:px-8 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-8">
        <section className="text-center max-w-2xl mx-auto flex flex-col items-center mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel border border-[#f5b94d]/30 text-xs font-semibold text-[#ffdaa0] mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#f5b94d]" /> Sentence Transformers (all-MiniLM-L6-v2)
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold font-headline tracking-tight text-white mb-3">
            Semantic Vector <span className="gradient-text-gold">Search</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base font-body leading-relaxed mb-6">
            Type any plot description, theme, atmosphere, or mood in natural text. Our neural vector embedding engine finds matching films using cosine similarity.
          </p>

          <form onSubmit={handleSubmit} className="relative w-full max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe the movie you want (e.g. A funny action movie with superheroes)..."
              className="w-full bg-[#111318] border border-white/15 focus:border-[#f5b94d] rounded-2xl py-4 pl-12 pr-28 text-sm text-white placeholder-gray-500 shadow-2xl focus:outline-none focus:ring-1 focus:ring-[#f5b94d] transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-24 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={semanticSearchMutation.isPending}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-xs hover:brightness-110 transition-all shadow-[0_0_15px_rgba(245,185,77,0.3)] disabled:opacity-50"
            >
              {semanticSearchMutation.isPending ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 max-w-xl">
            <span className="text-xs text-gray-500 font-semibold mr-1">Try prompts:</span>
            {examplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSearch(prompt)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold glass-card border border-white/10 text-gray-300 hover:text-[#f5b94d] hover:border-[#f5b94d]/40 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4">
          {semanticSearchMutation.isPending ? (
            <SkeletonGrid count={8} message="Embedding query & ranking movies with 70% Semantic Similarity + 30% Rating..." />
          ) : semanticSearchMutation.isSuccess && semanticSearchMutation.data ? (
            semanticSearchMutation.data.results.length > 0 ? (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold font-headline text-white flex items-center gap-2">
                    Found <span className="text-[#f5b94d]">{semanticSearchMutation.data.count}</span> Matches for "{query}"
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                  {semanticSearchMutation.data.results.map((movie) => (
                    <MovieCard key={movie.tmdb_id} movie={movie} />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon="search"
                title="No semantic matches found."
                description={`We couldn't find any movies matching "${query}". Try broadening your prompt or describing different genres.`}
              />
            )
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 font-body">
                Enter a query above or click one of the suggested prompts to experience vector search.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
