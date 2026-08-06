import { useMutation, useQuery } from '@tanstack/react-query';
import { recommendationService } from '../services/recommendation';
import type { MovieResponse } from '../types';

export const useSemanticSearch = () => {
  return useMutation<MovieResponse, Error, string>({
    mutationFn: (query: string) => recommendationService.semanticSearch(query),
  });
};

export const useSimilarMovie = () => {
  return useMutation<MovieResponse, Error, string>({
    mutationFn: (movieTitle: string) => recommendationService.similarMovie(movieTitle),
  });
};

export const useHybridRecommendation = () => {
  return useMutation<MovieResponse, Error, Record<string, number>>({
    mutationFn: (ratings: Record<string, number>) => recommendationService.recommendHybrid(ratings),
  });
};

export const useMovieAutocomplete = (searchTerm: string) => {
  return useQuery<MovieResponse, Error>({
    queryKey: ['movieAutocomplete', searchTerm],
    queryFn: () => recommendationService.similarMovie(searchTerm),
    enabled: searchTerm.trim().length >= 2,
    staleTime: 1000 * 60 * 5,
  });
};
