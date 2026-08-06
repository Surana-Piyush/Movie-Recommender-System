import { api } from './api';
import type { User, AuthResponse, RegisterResponse } from '../types';

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/login', { email, password });
    return response.data;
  },

  register: async (username: string, email: string, password: string): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>('/register', { username, email, password });
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/profile');
    return response.data;
  },
};
