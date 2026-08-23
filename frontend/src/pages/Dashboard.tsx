import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Film,
  ThumbsUp,
  Star,
  Search,
  ArrowRight,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMyRatings } from '../hooks/useRatings';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MovieCard } from '../components/MovieCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { EmptyState } from '../components/EmptyState';
import { FilterDropdown, applyMovieFilters, INITIAL_FILTERS, type MovieFilterState } from '../components/FilterDropdown';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');
  const [filters, setFilters] = useState<MovieFilterState>(INITIAL_FILTERS);

  const { data: myRatings, isLoading: isLoadingRatings } = useMyRatings();

  const featuredMovies = [
    {
      tmdb_id: 438631,
      title: 'Dune: Part One',
      overview:
        'Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding, must travel to the most dangerous planet in the universe.',
      release_date: '2021-09-15',
      rating: 8.0,
      score: 0.98,
      poster: 'https://image.tmdb.org/t/p/w500/v1tRXZ4JtD2Iv6fjkPvT4GiwslV.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/h3HsfV8Kn9Sz2QWUYYdP5ya23hx.jpg',
    },
    {
      tmdb_id: 157336,
      title: 'Interstellar',
      overview:
        'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.',
      release_date: '2014-11-05',
      rating: 8.4,
      score: 0.96,
      poster: 'https://image.tmdb.org/t/p/w500/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/5XNQBqnBwPA9yT0jZ0p3s8bbLh0.jpg',
    },
    {
      tmdb_id: 335984,
      title: 'Blade Runner 2049',
      overview:
        'Thirty years after the events of the first film, a new blade runner, LAPD Officer K, unearths a long-buried secret.',
      release_date: '2017-10-04',
      rating: 7.6,
      score: 0.94,
      poster: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/gNdLJU9TxrpGx4dkZidjys3fyy0.jpg',
    },
    {
      tmdb_id: 329865,
      title: 'Arrival',
      overview:
        'Taking place after alien spacecraft touch down around the globe, an elite team is put together to investigate.',
      release_date: '2016-11-10',
      rating: 7.9,
      score: 0.92,
      poster: 'https://image.tmdb.org/t/p/w500/pEzNVQfdzYDzVK0XqxERIw2x2se.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/8MUZz7oPXQftFTslZpRP3CVMOoq.jpg',
    },
  ];

  const filteredMovies = applyMovieFilters(featuredMovies, filters);

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickQuery.trim()) {
      navigate(`/semantic-search?q=${encodeURIComponent(quickQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white flex flex-col">
      <Navbar onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
      <Sidebar isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />

      <main className="md:ml-64 pt-20 md:pt-24 pb-16 px-3 sm:px-4 md:px-8 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-8 md:gap-10">
        <section className="relative glass-panel rounded-3xl p-5 sm:p-6 md:p-10 border border-white/10 overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#f5b94d]/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-[#42e09a]/15 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-xl w-full">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-headline tracking-tight text-white mb-2">
              Welcome back, <span className="gradient-text-gold">{user?.username || 'Cinema Explorer'}</span>!
            </h1>
            <p className="text-gray-300 text-xs sm:text-sm md:text-base font-body leading-relaxed mb-6">
              Describe what you're in the mood for, or rate a few movies you've seen and we'll do the rest.
            </p>

            <form onSubmit={handleQuickSearchSubmit} className="relative max-w-md w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Try: 'Emotional space thriller'..."
                className="w-full bg-[#0b0d12]/90 border border-white/15 rounded-2xl py-3 pl-10 pr-24 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#42e09a] focus:ring-1 focus:ring-[#42e09a] transition-all shadow-inner"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-xs hover:brightness-110 transition-all"
              >
                Search
              </button>
            </form>
          </div>

          <div className="relative z-10 w-full md:w-auto shrink-0">
            <div className="glass-card p-5 sm:p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center min-w-[140px]">
              <Star className="w-6 h-6 text-[#f5b94d] fill-[#f5b94d] mb-1" />
              <span className="text-2xl sm:text-3xl font-bold font-headline text-white">
                {myRatings ? myRatings.length : 0}
              </span>
              <span className="text-xs text-gray-400 font-semibold">Movies Rated</span>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold font-headline text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#f5b94d]" /> AI Recommendation Methods
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <Link
              to="/semantic-search"
              className="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 hover:border-[#f5b94d]/50 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#f5b94d]/10 border border-[#f5b94d]/30 flex items-center justify-center text-[#f5b94d] mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold font-headline text-white mb-1 group-hover:text-[#ffdaa0]">
                Semantic Natural Search
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed font-body mb-4">
                Describe plots, themes, emotions, or character arcs in natural text. Tell us the vibe.
              </p>
              <div className="flex items-center text-xs font-bold text-[#f5b94d] gap-1 group-hover:translate-x-1 transition-transform">
                Launch Search <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            <Link
              to="/similar-movie"
              className="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 hover:border-[#42e09a]/50 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#42e09a]/10 border border-[#42e09a]/30 flex items-center justify-center text-[#42e09a] mb-4 group-hover:scale-110 transition-transform">
                <Film className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold font-headline text-white mb-1 group-hover:text-[#65fdb5]">
                Similar Sibling Movies
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed font-body mb-4">
                Loved a movie? We'll find others with the same feel.
              </p>
              <div className="flex items-center text-xs font-bold text-[#42e09a] gap-1 group-hover:translate-x-1 transition-transform">
                Find Siblings <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            <Link
              to="/hybrid-recommendation"
              className="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 hover:border-[#ffdaa0]/50 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#ffdaa0]/10 border border-[#ffdaa0]/30 flex items-center justify-center text-[#ffdaa0] mb-4 group-hover:scale-110 transition-transform">
                <ThumbsUp className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold font-headline text-white mb-1 group-hover:text-[#ffdaa0]">
                Because You Liked...
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed font-body mb-4">
                Rate a few movies and get picks based on what similar viewers loved.
              </p>
              <div className="flex items-center text-xs font-bold text-[#ffdaa0] gap-1 group-hover:translate-x-1 transition-transform">
                Explore Picks <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold font-headline text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#42e09a]" /> AI Picks For You
            </h2>
            <div className="flex items-center gap-3">
              <FilterDropdown
                filters={filters}
                onFilterChange={setFilters}
                totalCount={featuredMovies.length}
                filteredCount={filteredMovies.length}
              />
              <Link to="/semantic-search" className="text-xs font-bold text-[#42e09a] hover:underline hidden sm:inline">
                View All
              </Link>
            </div>
          </div>

          {filteredMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {filteredMovies.map((movie) => (
                <MovieCard key={movie.tmdb_id} movie={movie} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="filter"
              title="No movies match selected filters."
              description="Try lowering the minimum rating or expanding the release year range."
              actionText="Reset Filters"
              actionLink="#"
            />
          )}
        </section>

        <section className="flex flex-col gap-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold font-headline text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#f5b94d]" /> Recently Rated Movies
            </h2>
            <Link to="/ratings" className="text-xs font-bold text-[#f5b94d] hover:underline">
              Manage Ratings
            </Link>
          </div>

          {isLoadingRatings ? (
            <SkeletonGrid count={4} message="Fetching your ratings history..." />
          ) : myRatings && myRatings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {myRatings.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="glass-card p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#f5b94d] to-[#42e09a] flex items-center justify-center font-bold text-[#111318] text-xs sm:text-sm">
                      {item.movie_id.toString().slice(-2)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-bold font-headline text-white truncate max-w-[120px]">
                        Movie #{item.movie_id}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-400">User Rating</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[#f5b94d] font-bold text-xs sm:text-sm bg-[#111318] px-2.5 py-1 rounded-full border border-[#f5b94d]/30">
                    <Star className="w-3.5 h-3.5 fill-[#f5b94d]" />
                    {item.rating}/5
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="star"
              title="You haven't rated any movies yet."
              description="Start rating movies to unlock hyper-personalized AI recommendations based on your unique taste."
              actionText="Explore & Rate Movies"
              actionLink="/semantic-search"
            />
          )}
        </section>
      </main>
    </div>
  );
};

