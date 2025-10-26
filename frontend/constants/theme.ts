// Минималистичная пастельная цветовая схема
export const colors = {
  // Основные цвета
  primary: '#E8B4D4', // Нежно-розовый
  primaryLight: '#F5D9E8',
  primaryDark: '#D89AB8',
  
  secondary: '#B4D4E8', // Нежно-голубой
  secondaryLight: '#D9E8F5',
  secondaryDark: '#9AB8D8',
  
  // Фон
  background: '#FDFCFB',
  backgroundSecondary: '#F7F6F4',
  
  // Текст
  text: '#4A4A4A',
  textLight: '#8A8A8A',
  textDark: '#2A2A2A',
  
  // Состояния цикла
  period: '#FFB4C4', // Менструация
  ovulation: '#B4E8D4', // Овуляция
  fertile: '#D4E8B4', // Фертильное окно
  pms: '#E8D4B4', // ПМС
  
  // Системные
  success: '#B4E8C4',
  warning: '#E8D4B4',
  error: '#E8B4B4',
  info: '#B4D4E8',
  
  // Нейтральные
  white: '#FFFFFF',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  
  // Вода
  water: '#A8D5E2',
  waterLight: '#D4EDF4',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
};
