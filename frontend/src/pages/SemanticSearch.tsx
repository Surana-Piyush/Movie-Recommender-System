import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Search, X } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MovieCard } from '../components/MovieCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { EmptyState } from '../components/EmptyState';
import { FilterDropdown, applyMovieFilters, INITIAL_FILTERS, type MovieFilterState } from '../components/FilterDropdown';
import { LanguageFilter, type LanguageOption } from '../components/LanguageFilter';
import { useSemanticSearch } from '../hooks/useRecommendations';
import { recommendationService } from '../services/recommendation';
import { useToast } from '../contexts/ToastContext';
import type { Movie } from '../types';

export const SemanticSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [filters, setFilters] = useState<MovieFilterState>(INITIAL_FILTERS);

  const [moviesList, setMoviesList] = useState<Movie[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const semanticSearchMutation = useSemanticSearch();
  const { showToast } = useToast();

  const examplePrompts = [
    '3 Idiots college comedy',
    'Bollywood romantic drama',
    'Hindi action thriller',
    'Mind bending sci-fi time travel',
    'Deep space horror thriller',
    'High adrenaline desert car chase',
  ];

  const handleSearch = (queryText: string, lang: LanguageOption = selectedLanguage) => {
    if (!queryText.trim()) return;
    setQuery(queryText);
    setSearchParams({ q: queryText });
    setMoviesList([]);
    setHasMore(false);

    semanticSearchMutation.mutate(
      { query: queryText, limit: 10, offset: 0, language: lang || undefined },
      {
        onSuccess: (data) => {
          setMoviesList(data.results || []);
          setTotalCount(data.count || 0);
          setHasMore(data.has_more ?? false);
        },
        onError: (err) => {
          showToast('error', 'Search Failed', err.message || 'Unable to connect to semantic search engine.');
        },
      }
    );
  };

  const handleLanguageChange = (lang: LanguageOption) => {
    setSelectedLanguage(lang);
    if (query.trim()) {
      handleSearch(query, lang);
    }
  };

  const handleLoadMore = async () => {
    if (!query.trim() || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await recommendationService.semanticSearch(query, 10, moviesList.length, selectedLanguage || undefined);
      setMoviesList((prev) => [...prev, ...(res.results || [])]);
      setHasMore(res.has_more ?? false);
    } catch (err: any) {
      showToast('error', 'Load More Failed', err.message || 'Failed to load more movies.');
    } finally {
      setIsLoadingMore(false);
    }
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

  const filteredResults = applyMovieFilters(moviesList, filters);

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white flex flex-col">
      <Navbar onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
      <Sidebar isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />

      <main className="md:ml-64 pt-20 md:pt-24 pb-16 px-3 sm:px-4 md:px-8 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-6 sm:gap-8">
        <section className="text-center max-w-2xl mx-auto flex flex-col items-center mt-2 sm:mt-4 w-full">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold font-headline tracking-tight text-white mb-3">
            Semantic Vector <span className="gradient-text-gold">Search</span>
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm md:text-base font-body leading-relaxed mb-6 px-2">
            Type any plot description, theme, atmosphere, or mood in natural text. Just describe what you want to watch.
          </p>

          <form onSubmit={handleSubmit} className="relative w-full max-w-xl">
            <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe the movie you want..."
              className="w-full bg-[#111318] border border-white/15 focus:border-[#f5b94d] rounded-2xl py-3.5 sm:py-4 pl-10 sm:pl-12 pr-24 sm:pr-28 text-xs sm:text-sm text-white placeholder-gray-500 shadow-2xl focus:outline-none focus:ring-1 focus:ring-[#f5b94d] transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-20 sm:right-24 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={semanticSearchMutation.isPending}
              className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-xs hover:brightness-110 transition-all shadow-[0_0_15px_rgba(245,185,77,0.3)] disabled:opacity-50"
            >
              {semanticSearchMutation.isPending ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-4 max-w-xl">
            <span className="text-[11px] sm:text-xs text-gray-500 font-semibold mr-1">Try prompts:</span>
            {examplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSearch(prompt)}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold glass-card border border-white/10 text-gray-300 hover:text-[#f5b94d] hover:border-[#f5b94d]/40 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4">
          {semanticSearchMutation.isPending ? (
            <SkeletonGrid count={10} message="Finding matching movies..." />
          ) : semanticSearchMutation.isSuccess && moviesList.length > 0 ? (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-base sm:text-xl font-bold font-headline text-white flex items-center gap-2">
                  Showing <span className="text-[#f5b94d]">{filteredResults.length}</span> Matches for "{query}"
                  {totalCount > 0 && <span className="text-xs text-gray-400 font-normal">({moviesList.length} of {totalCount} loaded)</span>}
                </h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <LanguageFilter selectedLanguage={selectedLanguage} onChange={handleLanguageChange} />
                  <FilterDropdown
                    filters={filters}
                    onFilterChange={setFilters}
                    totalCount={moviesList.length}
                    filteredCount={filteredResults.length}
                  />
                </div>
              </div>

              {filteredResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
                  {filteredResults.map((movie, idx) => (
                    <MovieCard key={`${movie.tmdb_id}-${idx}`} movie={movie} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="filter"
                  title="No movies match selected filters."
                  description="Try adjusting your rating or movie age filter criteria."
                />
              )}

              {hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl glass-panel border border-[#f5b94d]/40 text-[#ffdaa0] font-bold text-xs sm:text-sm hover:bg-[#f5b94d]/10 hover:border-[#f5b94d] hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,185,77,0.25)] flex items-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 text-[#f5b94d] ${isLoadingMore ? 'animate-spin' : ''}`} />
                    {isLoadingMore ? 'Loading More Movies...' : `View More Movies (${totalCount - moviesList.length} remaining)`}
                  </button>
                </div>
              )}
            </div>
          ) : semanticSearchMutation.isSuccess ? (
            <EmptyState
              icon="search"
              title="No semantic matches found."
              description={`We couldn't find any movies matching "${query}". Try broadening your prompt or describing different genres.`}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-xs sm:text-sm text-gray-500 font-body">
                Enter a query above or click one of the suggested prompts to experience vector search.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

