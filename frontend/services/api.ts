import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('session_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Session expired, clear token
      await SecureStore.deleteItemAsync('session_token');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  processSession: async (sessionId: string) => {
    const response = await api.post('/auth/session', null, {
      headers: { 'X-Session-ID': sessionId },
    });
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Cycle API
export const cycleAPI = {
  saveOnboarding: async (data: any) => {
    const response = await api.post('/onboarding', data);
    return response.data;
  },
  
  getSettings: async () => {
    const response = await api.get('/cycle/settings');
    return response.data;
  },
  
  updateSettings: async (data: any) => {
    const response = await api.put('/cycle/settings', data);
    return response.data;
  },
  
  getCalendar: async (startDate: string, endDate: string) => {
    const response = await api.get('/cycle/calendar', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },
  
  getTodayInfo: async () => {
    const response = await api.get('/cycle/today');
    return response.data;
  },
  
  getReminders: async () => {
    const response = await api.get('/cycle/reminders');
    return response.data;
  },
};

// Journal API
export const journalAPI = {
  createEntry: async (data: any) => {
    const response = await api.post('/journal', data);
    return response.data;
  },
  
  getEntries: async (startDate?: string, endDate?: string) => {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    const response = await api.get('/journal', { params });
    return response.data;
  },
  
  getEntry: async (date: string) => {
    const response = await api.get(`/journal/${date}`);
    return response.data;
  },
};

// Water API
export const waterAPI = {
  getToday: async () => {
    const response = await api.get('/water/today');
    return response.data;
  },
  
  addWater: async (ml: number) => {
    const response = await api.post('/water/add', { ml });
    return response.data;
  },
  
  updateSettings: async (goalMl: number, glassMl: number) => {
    const response = await api.put('/water/settings', null, {
      params: { goal_ml: goalMl, glass_ml: glassMl },
    });
    return response.data;
  },
};

// Habits API
export const habitsAPI = {
  create: async (data: any) => {
    const response = await api.post('/habits', data);
    return response.data;
  },
  
  getAll: async () => {
    const response = await api.get('/habits');
    return response.data;
  },
  
  update: async (habitId: string, data: any) => {
    const response = await api.put(`/habits/${habitId}`, data);
    return response.data;
  },
  
  delete: async (habitId: string) => {
    const response = await api.delete(`/habits/${habitId}`);
    return response.data;
  },
  
  log: async (habitId: string, data: any, date?: string) => {
    const params = date ? { date } : {};
    const response = await api.post(`/habits/${habitId}/log`, data, { params });
    return response.data;
  },
  
  getLogs: async (habitId: string, startDate?: string, endDate?: string) => {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    const response = await api.get(`/habits/${habitId}/logs`, { params });
    return response.data;
  },
};

// Tips API
export const tipsAPI = {
  getDailyTip: async () => {
    const response = await api.get('/tips/daily');
    return response.data;
  },
};

// Summaries API
export const summariesAPI = {
  generate: async (periodType: string) => {
    const response = await api.get('/summaries/generate', {
      params: { period_type: periodType },
    });
    return response.data;
  },
  
  getAll: async (periodType?: string) => {
    const params = periodType ? { period_type: periodType } : {};
    const response = await api.get('/summaries', { params });
    return response.data;
  },
};

export default api;
