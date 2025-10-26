import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { authAPI, cycleAPI } from '../services/api';

// Helper functions for cross-platform storage
const secureStorage = {
  async getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  
  async setItemAsync(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  
  async deleteItemAsync(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

interface CycleSettings {
  avg_cycle_length: number;
  period_length: number;
  luteal_length: number;
  last_period_start: string;
}

interface TodayInfo {
  has_settings: boolean;
  cycle_day?: number;
  dpo?: number;
  is_period?: boolean;
  is_fertile_window?: boolean;
  is_ovulation?: boolean;
  days_until_ovulation?: number;
  next_period_date?: string;
  ovulation_date?: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  cycleSettings: CycleSettings | null;
  todayInfo: TodayInfo | null;
  
  // Auth actions
  setUser: (user: User) => void;
  login: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  
  // Cycle actions
  setCycleSettings: (settings: CycleSettings) => void;
  fetchCycleSettings: () => Promise<void>;
  fetchTodayInfo: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  cycleSettings: null,
  todayInfo: null,
  
  setUser: (user) => {
    set({ user, isAuthenticated: true });
  },
  
  login: async (sessionId) => {
    try {
      const data = await authAPI.processSession(sessionId);
      
      // Сохранить token
      await SecureStore.setItemAsync('session_token', data.session_token);
      
      // Установить пользователя
      set({
        user: {
          id: data.id,
          email: data.email,
          name: data.name,
          picture: data.picture,
        },
        isAuthenticated: true,
        isLoading: false,
      });
      
      // Загрузить настройки цикла
      try {
        await get().fetchCycleSettings();
        await get().fetchTodayInfo();
      } catch (error) {
        // Настройки цикла не найдены - нужен онбординг
        console.log('No cycle settings found, onboarding needed');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await SecureStore.deleteItemAsync('session_token');
      set({
        user: null,
        isAuthenticated: false,
        cycleSettings: null,
        todayInfo: null,
      });
    }
  },
  
  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('session_token');
      
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      
      // Проверить валидность токена
      const user = await authAPI.getCurrentUser();
      
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      
      // Загрузить настройки цикла
      try {
        await get().fetchCycleSettings();
        await get().fetchTodayInfo();
      } catch (error) {
        console.log('No cycle settings found');
      }
      
    } catch (error) {
      // Токен невалидный
      await SecureStore.deleteItemAsync('session_token');
      set({ isLoading: false, isAuthenticated: false });
    }
  },
  
  setCycleSettings: (settings) => {
    set({ cycleSettings: settings });
  },
  
  fetchCycleSettings: async () => {
    try {
      const settings = await cycleAPI.getSettings();
      set({ cycleSettings: settings });
    } catch (error) {
      throw error;
    }
  },
  
  fetchTodayInfo: async () => {
    try {
      const info = await cycleAPI.getTodayInfo();
      set({ todayInfo: info });
    } catch (error) {
      console.error('Error fetching today info:', error);
    }
  },
}));

// Water store
interface WaterStore {
  consumed: number;
  goal: number;
  glass: number;
  isLoading: boolean;
  
  fetchToday: () => Promise<void>;
  addWater: (ml: number) => Promise<void>;
}

export const useWaterStore = create<WaterStore>((set) => ({
  consumed: 0,
  goal: 2000,
  glass: 250,
  isLoading: false,
  
  fetchToday: async () => {
    try {
      set({ isLoading: true });
      const { waterAPI } = await import('../services/api');
      const data = await waterAPI.getToday();
      set({
        consumed: data.consumed_ml,
        goal: data.goal_ml,
        glass: data.glass_ml,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching water:', error);
      set({ isLoading: false });
    }
  },
  
  addWater: async (ml) => {
    try {
      const { waterAPI } = await import('../services/api');
      const data = await waterAPI.addWater(ml);
      set({ consumed: data.consumed_ml });
    } catch (error) {
      console.error('Error adding water:', error);
    }
  },
}));
