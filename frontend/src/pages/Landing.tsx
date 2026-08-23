import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Film, Compass, ThumbsUp, ArrowRight, Star } from 'lucide-react';
import { Navbar } from '../components/Navbar';

export const Landing: React.FC = () => {
  const features = [
    {
      icon: Sparkles,
      title: 'Semantic Vector Search',
      description:
        'Powered by Sentence Transformers (all-MiniLM-L6-v2). Describe feelings, themes, or plots in plain natural language.',
      badge: 'Embedding AI',
      color: 'from-[#f5b94d]/20 to-[#f5b94d]/5 border-[#f5b94d]/30',
    },
    {
      icon: Film,
      title: 'Sibling Movie Discovery',
      description:
        'Find cinema siblings connected by visual motifs, narrative pacing, and deep thematic resonance.',
      badge: 'Cosine Similarity',
      color: 'from-[#42e09a]/20 to-[#42e09a]/5 border-[#42e09a]/30',
    },
    {
      icon: ThumbsUp,
      title: 'Hybrid KNN Filtering',
      description:
        'Scikit-Learn NearestNeighbors trained on MovieLens user rating matrix for hyper-personalized recommendations.',
      badge: 'Collaborative AI',
      color: 'from-[#ffdaa0]/20 to-[#ffdaa0]/5 border-[#ffdaa0]/30',
    },
  ];

  const sampleMovies = [
    {
      title: 'Dune: Part Two',
      year: '2024',
      rating: 8.5,
      match: '99% Match',
      poster: 'https://image.tmdb.org/t/p/w500/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg',
    },
    {
      title: 'Interstellar',
      year: '2014',
      rating: 8.6,
      match: '97% Match',
      poster: 'https://image.tmdb.org/t/p/w500/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg',
    },
    {
      title: 'Blade Runner 2049',
      year: '2017',
      rating: 8.0,
      match: '95% Match',
      poster: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    },
    {
      title: 'Arrival',
      year: '2016',
      rating: 7.9,
      match: '93% Match',
      poster: 'https://image.tmdb.org/t/p/w500/pEzNVQfdzYDzVK0XqxERIw2x2se.jpg',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white overflow-hidden flex flex-col justify-between">
      <Navbar />

      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 px-4 md:px-8 max-w-7xl mx-auto w-full text-center flex flex-col items-center">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#f5b94d]/15 to-[#42e09a]/15 rounded-full blur-[140px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-[#f5b94d]/30 mb-8 shadow-xl"
        >
          <Sparkles className="w-4 h-4 text-[#f5b94d]" />
          <span className="text-xs md:text-sm font-semibold font-headline text-[#ffdaa0]">
            Next-Gen AI Movie Recommendation Concierge
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-7xl font-extrabold font-headline tracking-tight max-w-5xl leading-[1.1] mb-6"
        >
          Discover Movies You'll <span className="gradient-text-gold">Actually Love.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-gray-400 text-lg md:text-xl max-w-2xl font-body leading-relaxed mb-10"
        >
          Describe plot vibes in natural language or enter your favorite films. Our neural embeddings and KNN algorithms curate your private cinema.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-base hover:brightness-110 transition-all shadow-[0_0_30px_rgba(245,185,77,0.35)] active:scale-95 flex items-center justify-center gap-2"
          >
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl glass-panel border border-white/10 text-white font-bold text-base hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            <Compass className="w-5 h-5 text-[#f5b94d]" /> Sign In
          </Link>
        </motion.div>
      </section>

      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold font-headline mb-3">
            Three Powerful AI Engines
          </h2>
          <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto">
            Combining Sentence Transformers embeddings with TMDB metadata & Scikit-Learn collaborative filtering.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={`p-8 rounded-3xl glass-panel border bg-gradient-to-b ${feat.color} flex flex-col justify-between shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform`}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#111318] border border-white/10 flex items-center justify-center text-[#f5b94d]">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#111318]/80 text-[#42e09a] border border-[#42e09a]/30">
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold font-headline mb-2 text-white">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed font-body">
                    {feat.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#f5b94d] font-bold">
              AI Recommendations Preview
            </span>
            <h2 className="text-2xl md:text-3xl font-bold font-headline text-white mt-1">
              Curated Masterpieces
            </h2>
          </div>
          <Link
            to="/register"
            className="text-xs md:text-sm font-bold text-[#42e09a] hover:underline flex items-center gap-1"
          >
            Unlock All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
          {sampleMovies.map((movie, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="glass-card rounded-2xl overflow-hidden border border-white/10 group relative aspect-[2/3] shadow-xl cursor-pointer"
            >
              <img
                src={movie.poster}
                alt={movie.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 scrim-bottom" />
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318]">
                {movie.match}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h4 className="font-bold text-sm font-headline text-white">{movie.title}</h4>
                <div className="flex items-center gap-2 text-xs text-gray-300 mt-1">
                  <span>{movie.year}</span>
                  <span className="flex items-center gap-0.5 text-[#f5b94d]">
                    <Star className="w-3 h-3 fill-[#f5b94d]" /> {movie.rating}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#0b0d12] py-10 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-[#f5b94d]" />
            <span className="font-bold text-gray-300">CineCast AI Engine © 2026</span>
          </div>
          <p>Powered by FastAPI, Sentence Transformers, Scikit-Learn KNN & TMDB API.</p>
        </div>
      </footer>
    </div>
  );
};
