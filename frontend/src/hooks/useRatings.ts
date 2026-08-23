import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ratingService } from '../services/rating';
import type { Rating } from '../types';

export const useMyRatings = () => {
  return useQuery<Rating[], Error>({
    queryKey: ['ratings'],
    queryFn: ratingService.getMyRatings,
    staleTime: 0,
  });
};

export const useAddOrUpdateRating = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ movieId, rating }: { movieId: number; rating: number }) =>
      ratingService.addOrUpdateRating(movieId, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings'] });
      queryClient.refetchQueries({ queryKey: ['ratings'] });
    },
  });
};

export const useDeleteRating = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (movieId: number) => ratingService.deleteRating(movieId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings'] });
      queryClient.refetchQueries({ queryKey: ['ratings'] });
    },
  });
};
