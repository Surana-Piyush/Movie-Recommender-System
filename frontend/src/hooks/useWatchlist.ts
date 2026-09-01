import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { watchlistService } from '../services/watchlist';
import type { WatchlistItem } from '../types';

export const useWatchlist = () => {
  return useQuery<WatchlistItem[], Error>({
    queryKey: ['watchlist'],
    queryFn: watchlistService.getMyWatchlist,
    staleTime: 0,
  });
};

export const useAddToWatchlist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (movieId: number) => watchlistService.addToWatchlist(movieId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.refetchQueries({ queryKey: ['watchlist'] });
    },
  });
};

export const useRemoveFromWatchlist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (movieId: number) => watchlistService.removeFromWatchlist(movieId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.refetchQueries({ queryKey: ['watchlist'] });
    },
  });
};
