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
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMyRatings } from '../hooks/useRatings';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MovieCard } from '../components/MovieCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { EmptyState } from '../components/EmptyState';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');

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
      poster: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94Wi6yVPkr.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/lz8vNn9h6l7xM6yHlY4R5Yx1N8.jpg',
    },
    {
      tmdb_id: 157336,
      title: 'Interstellar',
      overview:
        'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.',
      release_date: '2014-11-05',
      rating: 8.4,
      score: 0.96,
      poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/rAiYTfKGqDCRIIqo6LEuPJevZz.jpg',
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
      backdrop: 'https://image.tmdb.org/t/p/original/eSl2W2al2xR3ij2fmggz1N3mN2.jpg',
    },
    {
      tmdb_id: 329865,
      title: 'Arrival',
      overview:
        'Taking place after alien spacecraft touch down around the globe, an elite team is put together to investigate.',
      release_date: '2016-11-10',
      rating: 7.9,
      score: 0.92,
      poster: 'https://image.tmdb.org/t/p/w500/4ImAOt7p2b9F4bZOSByNycYxKu9.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/y4aD9086lW4ZkH0b1W4A5G6.jpg',
    },
  ];

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

      <main className="md:ml-64 pt-20 md:pt-24 pb-16 px-4 md:px-8 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-10">
        <section className="relative glass-panel rounded-3xl p-6 md:p-10 border border-white/10 overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#f5b94d]/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-[#42e09a]/15 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111318]/80 border border-[#f5b94d]/30 text-xs font-semibold text-[#ffdaa0] mb-3">
              <Zap className="w-3.5 h-3.5 text-[#f5b94d]" /> Neural Engine Ready
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold font-headline tracking-tight text-white mb-2">
              Welcome back, <span className="gradient-text-gold">{user?.username || 'Cinema Explorer'}</span>!
            </h1>
            <p className="text-gray-300 text-sm md:text-base font-body leading-relaxed mb-6">
              What kind of cinema experience are you craving today? Explore natural language semantic prompts or generate recommendations based on your rating history.
            </p>

            <form onSubmit={handleQuickSearchSubmit} className="relative max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Try: 'Emotional romantic drama set in space'..."
                className="w-full bg-[#0b0d12]/90 border border-white/15 rounded-2xl py-3 pl-10 pr-24 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#42e09a] focus:ring-1 focus:ring-[#42e09a] transition-all shadow-inner"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-xs hover:brightness-110 transition-all"
              >
                Search
              </button>
            </form>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-3 w-full md:w-auto shrink-0">
            <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
              <Star className="w-6 h-6 text-[#f5b94d] fill-[#f5b94d] mb-1" />
              <span className="text-2xl font-bold font-headline text-white">
                {myRatings ? myRatings.length : 0}
              </span>
              <span className="text-xs text-gray-400">Movies Rated</span>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
              <TrendingUp className="w-6 h-6 text-[#42e09a] mb-1" />
              <span className="text-2xl font-bold font-headline text-white">99%</span>
              <span className="text-xs text-gray-400 font-semibold">AI Match Score</span>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold font-headline text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#f5b94d]" /> AI Recommendation Methods
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              to="/semantic-search"
              className="glass-card p-6 rounded-3xl border border-white/10 hover:border-[#f5b94d]/50 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#f5b94d]/10 border border-[#f5b94d]/30 flex items-center justify-center text-[#f5b94d] mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-headline text-white mb-1 group-hover:text-[#ffdaa0]">
                Semantic Natural Search
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed font-body mb-4">
                Describe plots, themes, emotions, or character arcs in natural text. Powered by Sentence Transformers.
              </p>
              <div className="flex items-center text-xs font-bold text-[#f5b94d] gap-1 group-hover:translate-x-1 transition-transform">
                Launch Search <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            <Link
              to="/similar-movie"
              className="glass-card p-6 rounded-3xl border border-white/10 hover:border-[#42e09a]/50 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#42e09a]/10 border border-[#42e09a]/30 flex items-center justify-center text-[#42e09a] mb-4 group-hover:scale-110 transition-transform">
                <Film className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-headline text-white mb-1 group-hover:text-[#65fdb5]">
                Similar Sibling Movies
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed font-body mb-4">
                Enter a film you loved and find its visual and narrative siblings via vector embeddings.
              </p>
              <div className="flex items-center text-xs font-bold text-[#42e09a] gap-1 group-hover:translate-x-1 transition-transform">
                Find Siblings <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            <Link
              to="/hybrid-recommendation"
              className="glass-card p-6 rounded-3xl border border-white/10 hover:border-[#ffdaa0]/50 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#ffdaa0]/10 border border-[#ffdaa0]/30 flex items-center justify-center text-[#ffdaa0] mb-4 group-hover:scale-110 transition-transform">
                <ThumbsUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-headline text-white mb-1 group-hover:text-[#ffdaa0]">
                Because You Liked (KNN)
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed font-body mb-4">
                Submit multi-film ratings to trigger Scikit-Learn collaborative nearest-neighbor filtering.
              </p>
              <div className="flex items-center text-xs font-bold text-[#ffdaa0] gap-1 group-hover:translate-x-1 transition-transform">
                Generate KNN <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold font-headline text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#42e09a]" /> AI Picks For You
            </h2>
            <Link to="/semantic-search" className="text-xs font-bold text-[#42e09a] hover:underline">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            {featuredMovies.map((movie) => (
              <MovieCard key={movie.tmdb_id} movie={movie} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold font-headline text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#f5b94d]" /> Recently Rated Movies
            </h2>
            <Link to="/ratings" className="text-xs font-bold text-[#f5b94d] hover:underline">
              Manage Ratings
            </Link>
          </div>

          {isLoadingRatings ? (
            <SkeletonGrid count={4} message="Fetching your ratings history..." />
          ) : myRatings && myRatings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {myRatings.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="glass-card p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f5b94d] to-[#42e09a] flex items-center justify-center font-bold text-[#111318]">
                      {item.movie_id.toString().slice(-2)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold font-headline text-white">
                        Movie ID #{item.movie_id}
                      </span>
                      <span className="text-xs text-gray-400">User Rating</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[#f5b94d] font-bold text-sm bg-[#111318] px-2.5 py-1 rounded-full border border-[#f5b94d]/30">
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
