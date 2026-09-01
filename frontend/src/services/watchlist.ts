import { api } from './api';
import type { WatchlistItem } from '../types';

export const watchlistService = {
  getMyWatchlist: async (): Promise<WatchlistItem[]> => {
    const response = await api.get<WatchlistItem[]>('/watchlist');
    return response.data;
  },

  addToWatchlist: async (movieId: number): Promise<{ message: string; movie_id: number }> => {
    const response = await api.post<{ message: string; movie_id: number }>(`/watchlist/${movieId}`);
    return response.data;
  },

  removeFromWatchlist: async (movieId: number): Promise<{ message: string; movie_id: number }> => {
    const response = await api.delete<{ message: string; movie_id: number }>(`/watchlist/${movieId}`);
    return response.data;
  },
};
