export interface User {
  user_id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterResponse {
  message: string;
  user_id: number;
  username: string;
  email: string;
}

export interface Movie {
  tmdb_id: number;
  title: string;
  overview: string;
  release_date: string;
  rating: number; // TMDB rating vote_average
  poster: string | null;
  backdrop: string | null;
  score?: number; // Similarity/Hybrid recommendation score
  genres?: string[];
  runtime?: number;
  tagline?: string;
}

export interface MovieResponse {
  count: number;
  results: Movie[];
}

export interface Rating {
  id: number;
  user_id: number;
  movie_id: number;
  rating: number;
}

export interface UserRatingItem {
  id: number;
  user_id: number;
  movie_id: number;
  rating: number;
  movieDetails?: Movie;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}
