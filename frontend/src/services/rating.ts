import { api } from './api';
import type { Rating } from '../types';

export const ratingService = {
  addOrUpdateRating: async (movieId: number, rating: number): Promise<{ message: string; movie_id: number; rating: number }> => {
    const response = await api.post('/rating', { movie_id: movieId, rating });
    return response.data;
  },

  getMyRatings: async (): Promise<Rating[]> => {
    const response = await api.get<Rating[]>('/ratings');
    return response.data;
  },

  deleteRating: async (movieId: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/rating/${movieId}`);
    return response.data;
  },
};
