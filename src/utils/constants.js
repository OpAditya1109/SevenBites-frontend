import Constants from 'expo-constants';
export const COLORS = {
  primary: '#E23744',       // Zomato Red
  secondary: '#FC8019',     // Orange
  background: '#F5F5F5',
  white: '#FFFFFF',
  black: '#1C1C1E',
  gray: '#8E8E93',
  lightGray: '#E5E5EA',
  darkGray: '#3A3A3C',
  success: '#4CAF50',
  warning: '#FF9800',
  card: '#FFFFFF',
  border: '#E5E5EA',
  placeholder: '#C7C7CC',
  textPrimary: '#1C1C1E',
  textSecondary: '#8E8E93',
  green: '#48C479',
  rating: '#F5A623',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};


export const BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://localhost:5001/api';

export const FOOD_CATEGORIES = [
  { id: '1', name: 'Pizza', icon: '🍕' },
  { id: '2', name: 'Burger', icon: '🍔' },
  { id: '3', name: 'Biryani', icon: '🍛' },
  { id: '4', name: 'Chinese', icon: '🥢' },
  { id: '5', name: 'Sushi', icon: '🍱' },
  { id: '6', name: 'Desserts', icon: '🍰' },
  { id: '7', name: 'South Indian', icon: '🥘' },
  { id: '8', name: 'Healthy', icon: '🥗' },
  { id: '9', name: 'Pasta', icon: '🍝' },
  { id: '10', name: 'Drinks', icon: '🥤' },
];

export const OFFERS = [
  {
    id: '1',
    title: '50% OFF up to ₹100',
    subtitle: 'Use code ZOMATO50',
    bg: '#E23744',
    image: '🍕',
  },
  {
    id: '2',
    title: 'Free Delivery',
    subtitle: 'On orders above ₹299',
    bg: '#FC8019',
    image: '🛵',
  },
  {
    id: '3',
    title: '30% OFF',
    subtitle: 'On your first order',
    bg: '#48C479',
    image: '🎉',
  },
];