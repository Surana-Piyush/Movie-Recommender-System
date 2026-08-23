import { api } from './api';
import type { MovieResponse, Movie } from '../types';

interface MovieDetailsResponse {
  movie: Movie;
  similar: MovieResponse;
}

export const recommendationService = {
  semanticSearch: async (query: string, limit = 10, offset = 0): Promise<MovieResponse> => {
    const response = await api.post<MovieResponse>('/semantic-search', { query, limit, offset });
    return response.data;
  },

  similarMovie: async (movieTitle: string, limit = 10, offset = 0): Promise<MovieResponse> => {
    const response = await api.post<MovieResponse>('/similar-movie', { movie_title: movieTitle, limit, offset });
    return response.data;
  },

  recommendHybrid: async (ratings: Record<string, number>, limit = 10, offset = 0): Promise<MovieResponse> => {
    const response = await api.post<MovieResponse>('/recommend', { ratings, limit, offset });
    return response.data;
  },


  getMovieDetails: async (tmdbId: number): Promise<MovieDetailsResponse> => {
    const response = await api.get<MovieDetailsResponse>(`/movie/${tmdbId}`);
    return response.data;
  },

  pingWarmup: async (): Promise<void> => {
    try {
      await api.get('/warmup');
    } catch {
      // Background silent ping
    }
  },
};
