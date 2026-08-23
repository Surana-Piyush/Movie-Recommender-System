import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Star, Calendar, RotateCcw, X, Flame, Sparkles, Film, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import type { Movie } from '../types';

export interface MovieFilterState {
  minRating: number;
  minYear: number;
  maxYear: number;
  eraId: string;
  sortBy: 'default' | 'rating-desc' | 'year-desc' | 'year-asc';
}

export const INITIAL_FILTERS: MovieFilterState = {
  minRating: 0,
  minYear: 1950,
  maxYear: 2026,
  eraId: 'all',
  sortBy: 'default',
};

const CURRENT_YEAR = new Date().getFullYear();

export interface EraOption {
  id: string;
  label: string;
  ageText: string;
  yearsText: string;
  minYear: number;
  maxYear: number;
  icon: React.ElementType;
  barHeight: string; // for price-range style visual histogram
}

export const ERA_OPTIONS: EraOption[] = [
  {
    id: 'all',
    label: 'All Eras',
    ageText: 'Any Age',
    yearsText: '1950 - 2026',
    minYear: 1950,
    maxYear: CURRENT_YEAR,
    icon: Film,
    barHeight: 'h-full',
  },
  {
    id: 'recent',
    label: 'Brand New',
    ageText: '< 3 Yrs Old',
    yearsText: `${CURRENT_YEAR - 3} - ${CURRENT_YEAR}`,
    minYear: CURRENT_YEAR - 3,
    maxYear: CURRENT_YEAR,
    icon: Flame,
    barHeight: 'h-10',
  },
  {
    id: 'modern',
    label: 'Modern Era',
    ageText: '3 - 10 Yrs Old',
    yearsText: `${CURRENT_YEAR - 10} - ${CURRENT_YEAR - 3}`,
    minYear: CURRENT_YEAR - 10,
    maxYear: CURRENT_YEAR - 3,
    icon: Sparkles,
    barHeight: 'h-12',
  },
  {
    id: '2000s',
    label: '2000s & 2010s',
    ageText: '10 - 25 Yrs Old',
    yearsText: `${CURRENT_YEAR - 25} - ${CURRENT_YEAR - 10}`,
    minYear: CURRENT_YEAR - 25,
    maxYear: CURRENT_YEAR - 10,
    icon: Clock,
    barHeight: 'h-8',
  },
  {
    id: 'classic',
    label: 'Modern Classics',
    ageText: '25 - 45 Yrs Old',
    yearsText: `${CURRENT_YEAR - 45} - ${CURRENT_YEAR - 25}`,
    minYear: CURRENT_YEAR - 45,
    maxYear: CURRENT_YEAR - 25,
    icon: Film,
    barHeight: 'h-6',
  },
  {
    id: 'vintage',
    label: 'Golden Vintage',
    ageText: '45+ Yrs Old',
    yearsText: `1950 - ${CURRENT_YEAR - 45}`,
    minYear: 1950,
    maxYear: CURRENT_YEAR - 45,
    icon: Clock,
    barHeight: 'h-5',
  },
];

export interface FilterDropdownProps {
  filters: MovieFilterState;
  onFilterChange: (newFilters: MovieFilterState) => void;
  totalCount?: number;
  filteredCount?: number;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  filters,
  onFilterChange,
  totalCount,
  filteredCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate active filter count
  const activeCount = [
    filters.minRating > 0,
    filters.minYear > 1950 || filters.maxYear < CURRENT_YEAR,
    filters.eraId !== 'all',
    filters.sortBy !== 'default',
  ].filter(Boolean).length;

  const handleRatingSelect = (rating: number) => {
    onFilterChange({ ...filters, minRating: rating });
  };

  const handleEraSelect = (era: EraOption) => {
    onFilterChange({
      ...filters,
      eraId: era.id,
      minYear: era.minYear,
      maxYear: era.maxYear,
    });
  };

  const handleReset = () => {
    onFilterChange(INITIAL_FILTERS);
  };

  const scrollEras = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div ref={dropdownRef} className="relative inline-block text-left z-30">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold text-xs md:text-sm transition-all shadow-lg border ${
          activeCount > 0
            ? 'bg-gradient-to-r from-[#f5b94d]/20 to-[#42e09a]/20 border-[#f5b94d] text-[#ffdaa0] shadow-[0_0_20px_rgba(245,185,77,0.25)]'
            : 'bg-[#111318] hover:bg-[#181b22] border-white/15 text-gray-200 hover:text-white'
        }`}
      >
        <SlidersHorizontal className={`w-4 h-4 ${activeCount > 0 ? 'text-[#f5b94d]' : 'text-gray-400'}`} />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-[#f5b94d] text-[#111318] font-black text-[11px] flex items-center justify-center shadow-md">
            {activeCount}
          </span>
        )}
      </button>

      {/* Filter Dropdown Modal / Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 sm:right-0 left-auto top-full mt-3 w-[92vw] max-w-[420px] sm:w-[450px] glass-panel bg-[#0d0f15]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 shadow-2xl z-50 flex flex-col gap-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#f5b94d]" />
                <h3 className="font-bold font-headline text-base text-white">Filter & Sort Movies</h3>
                {filteredCount !== undefined && totalCount !== undefined && (
                  <span className="text-xs text-gray-400 font-normal">
                    ({filteredCount}/{totalCount})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeCount > 0 && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-400 hover:text-[#f5b94d] transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Section 1: IMDB / TMDB Rating */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-[#f5b94d] fill-[#f5b94d]" /> IMDB Rating Filter
                </label>
                <span className="text-xs font-extrabold text-[#f5b94d] bg-[#f5b94d]/10 px-2 py-0.5 rounded-lg border border-[#f5b94d]/20">
                  {filters.minRating > 0 ? `${filters.minRating.toFixed(1)}+ ⭐` : 'Any Rating'}
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="0"
                max="9"
                step="0.5"
                value={filters.minRating}
                onChange={(e) => handleRatingSelect(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#f5b94d]"
              />

              {/* Quick Select Rating Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[0, 6.0, 7.0, 7.5, 8.0, 8.5].map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRatingSelect(r)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all border ${
                      filters.minRating === r
                        ? 'bg-[#f5b94d] text-[#111318] border-[#f5b94d] shadow-sm font-bold'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {r === 0 ? 'All Ratings' : `${r}+ ⭐`}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Section 2: Movie Age ("How old the movie is" - Horizontal Scroll Price-Range Style) */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#42e09a]" /> How Old The Movie Is (Era)
                </label>
                <span className="text-xs font-semibold text-[#42e09a] bg-[#42e09a]/10 px-2 py-0.5 rounded-lg border border-[#42e09a]/20">
                  {filters.minYear} - {filters.maxYear}
                </span>
              </div>

              {/* Horizontal Scroll Price Range Style Era Cards Container */}
              <div className="relative group/scroll">
                <button
                  type="button"
                  onClick={() => scrollEras('left')}
                  className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-[#111318]/90 border border-white/20 text-white flex items-center justify-center shadow-lg hover:bg-[#f5b94d] hover:text-[#111318] transition-all opacity-80 group-hover/scroll:opacity-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div
                  ref={scrollRef}
                  className="flex items-center gap-2.5 overflow-x-auto py-2 px-1 scrollbar-none scroll-smooth"
                >
                  {ERA_OPTIONS.map((era) => {
                    const isSelected = filters.eraId === era.id;
                    const Icon = era.icon;
                    return (
                      <div
                        key={era.id}
                        onClick={() => handleEraSelect(era)}
                        className={`flex-shrink-0 w-32 p-3 rounded-2xl cursor-pointer border transition-all duration-200 flex flex-col justify-center gap-1 h-20 ${
                          isSelected
                            ? 'bg-gradient-to-b from-[#42e09a]/20 to-[#f5b94d]/10 border-[#42e09a] shadow-[0_0_15px_rgba(66,224,154,0.3)] scale-[1.02]'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                          <Icon className="w-3.5 h-3.5 text-[#42e09a] shrink-0" />
                          <span className="truncate">{era.label}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-semibold">{era.ageText}</div>
                        <div className="text-[9px] text-[#ffdaa0] font-mono">{era.yearsText}</div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => scrollEras('right')}
                  className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-[#111318]/90 border border-white/20 text-white flex items-center justify-center shadow-lg hover:bg-[#f5b94d] hover:text-[#111318] transition-all opacity-80 group-hover/scroll:opacity-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Year Range Sliders */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 block mb-1">Min Release Year</label>
                  <input
                    type="number"
                    min="1950"
                    max={filters.maxYear}
                    value={filters.minYear}
                    onChange={(e) =>
                      onFilterChange({
                        ...filters,
                        minYear: parseInt(e.target.value) || 1950,
                        eraId: 'custom',
                      })
                    }
                    className="w-full bg-[#111318] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#42e09a]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 block mb-1">Max Release Year</label>
                  <input
                    type="number"
                    min={filters.minYear}
                    max={CURRENT_YEAR}
                    value={filters.maxYear}
                    onChange={(e) =>
                      onFilterChange({
                        ...filters,
                        maxYear: parseInt(e.target.value) || CURRENT_YEAR,
                        eraId: 'custom',
                      })
                    }
                    className="w-full bg-[#111318] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#42e09a]"
                  />
                </div>
              </div>
            </div>

            {/* Filter Section 3: Sorting Options */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300">Sort By</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'default', label: 'Match Score' },
                  { id: 'rating-desc', label: 'Highest Rated ⭐' },
                  { id: 'year-desc', label: 'Newest First 📅' },
                  { id: 'year-asc', label: 'Oldest First 🎞️' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() =>
                      onFilterChange({
                        ...filters,
                        sortBy: opt.id as MovieFilterState['sortBy'],
                      })
                    }
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors border ${
                      filters.sortBy === opt.id
                        ? 'bg-[#f5b94d]/20 border-[#f5b94d] text-[#ffdaa0]'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/10">
              <span className="text-xs text-gray-400">
                {activeCount === 0 ? 'No filters active' : `${activeCount} filter(s) applied`}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-xs hover:brightness-110 transition-all shadow-md"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper function to apply active filters & sorting on any Movie array
export const applyMovieFilters = (movies: Movie[], filters: MovieFilterState): Movie[] => {
  if (!movies || movies.length === 0) return [];

  let result = movies.filter((movie) => {
    // IMDB / TMDB Rating check
    const rating = movie.rating || 0;
    if (rating < filters.minRating) return false;

    // Release Year check
    if (movie.release_date) {
      const year = new Date(movie.release_date).getFullYear();
      if (!isNaN(year)) {
        if (year < filters.minYear || year > filters.maxYear) return false;
      }
    }

    return true;
  });

  // Sorting
  if (filters.sortBy === 'rating-desc') {
    result = [...result].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (filters.sortBy === 'year-desc') {
    result = [...result].sort((a, b) => {
      const yA = a.release_date ? new Date(a.release_date).getFullYear() : 0;
      const yB = b.release_date ? new Date(b.release_date).getFullYear() : 0;
      return yB - yA;
    });
  } else if (filters.sortBy === 'year-asc') {
    result = [...result].sort((a, b) => {
      const yA = a.release_date ? new Date(a.release_date).getFullYear() : 9999;
      const yB = b.release_date ? new Date(b.release_date).getFullYear() : 9999;
      return yA - yB;
    });
  }

  return result;
};
