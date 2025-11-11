import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: async (username: string, email: string, password: string, displayName?: string) => {
    const response = await api.post('/auth/register', { username, email, password, displayName });
    return response.data;
  },

  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  verify: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

// Game API
export const gameAPI = {
  createTournament: async (name: string, maxPlayers: number = 8) => {
    const response = await api.post('/game/tournament/create', { name, maxPlayers });
    return response.data;
  },

  joinTournament: async (tournamentId: number, playerAlias: string, userId?: number) => {
    const response = await api.post('/game/tournament/join', { tournamentId, playerAlias, userId });
    return response.data;
  },

  getTournament: async (tournamentId: number) => {
    const response = await api.get(`/game/tournament/${tournamentId}`);
    return response.data;
  }
};

export default api;
