import { useMutation, useQuery } from '@tanstack/react-query';
import { recommendationService } from '../services/recommendation';
import type { MovieResponse } from '../types';

export interface SearchPayload {
  query: string;
  limit?: number;
  offset?: number;
  language?: string;
}

export interface SimilarPayload {
  movieTitle: string;
  limit?: number;
  offset?: number;
  language?: string;
}

export interface HybridPayload {
  ratings: Record<string, number>;
  limit?: number;
  offset?: number;
  language?: string;
}

export const useSemanticSearch = () => {
  return useMutation<MovieResponse, Error, SearchPayload | string>({
    mutationFn: (param) => {
      if (typeof param === 'string') {
        return recommendationService.semanticSearch(param, 10, 0);
      }
      return recommendationService.semanticSearch(param.query, param.limit ?? 10, param.offset ?? 0, param.language);
    },
  });
};

export const useSimilarMovie = () => {
  return useMutation<MovieResponse, Error, SimilarPayload | string>({
    mutationFn: (param) => {
      if (typeof param === 'string') {
        return recommendationService.similarMovie(param, 10, 0);
      }
      return recommendationService.similarMovie(param.movieTitle, param.limit ?? 10, param.offset ?? 0, param.language);
    },
  });
};

export const useHybridRecommendation = () => {
  return useMutation<MovieResponse, Error, HybridPayload | Record<string, number>>({
    mutationFn: (param) => {
      if (param && 'ratings' in param && typeof (param as HybridPayload).ratings === 'object') {
        const payload = param as HybridPayload;
        return recommendationService.recommendHybrid(payload.ratings, payload.limit ?? 10, payload.offset ?? 0, payload.language);
      }
      return recommendationService.recommendHybrid(param as Record<string, number>, 10, 0);
    },
  });
};

export const useMovieAutocomplete = (searchTerm: string) => {
  return useQuery<MovieResponse, Error>({
    queryKey: ['movieAutocomplete', searchTerm],
    queryFn: () => recommendationService.similarMovie(searchTerm, 5, 0),
    enabled: searchTerm.trim().length >= 2,
    staleTime: 1000 * 60 * 5,
  });
};

export const useMovieDetails = (tmdbId: string) => {
  return useQuery({
    queryKey: ['movieDetails', tmdbId],
    queryFn: () => recommendationService.getMovieDetails(Number(tmdbId)),
    enabled: !!tmdbId,
  });
};
