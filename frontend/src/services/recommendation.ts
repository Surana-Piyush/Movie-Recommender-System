import { api } from './api';
import type { MovieResponse } from '../types';

export const recommendationService = {
  semanticSearch: async (query: string): Promise<MovieResponse> => {
    const response = await api.post<MovieResponse>('/semantic-search', { query });
    return response.data;
  },

  similarMovie: async (movieTitle: string): Promise<MovieResponse> => {
    const response = await api.post<MovieResponse>('/similar-movie', { movie_title: movieTitle });
    return response.data;
  },

  recommendHybrid: async (ratings: Record<string, number>): Promise<MovieResponse> => {
    const response = await api.post<MovieResponse>('/recommend', { ratings });
    return response.data;
  },
};
