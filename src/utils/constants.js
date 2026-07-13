import Constants from 'expo-constants';

export const COLORS = {
  primary: '#E23744',
  secondary: '#FC8019',
  background: '#F5F5F5',
  cream: '#FBF2E9',
  offerPill: '#FDE9D8',
  vegGreen: '#2E7D32',
  nonVegRed: '#C0392B',
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

  // NEW — dark theme tokens
  darkBg: '#0B0B0D',
  darkCard: '#1B1B1E',
  darkCardAlt: '#242427',
  darkBorder: '#2E2E32',
  darkTextSecondary: '#9A9A9E',
};

export const TESTING_ZERO_FEES = true;

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

// ── Billing ───────────────────────────────────────────
export const PLATFORM_FEE = 6;
export const GST_RATE = 0.05;
export const FREE_DELIVERY_THRESHOLD = 299;
export const DEFAULT_DELIVERY_FEE = 49;
export const ACTIVE_ADDRESS_KEY = 'sevenbites_active_address';

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
    subtitle: 'Use code SeventBites50',
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

// NEW — the icon-circle row on the home screen (separate from FOOD_CATEGORIES,
// which is still used for cuisine filtering elsewhere)
export const HOME_CATEGORIES = [
  { id: 'trending', name: 'Trending', icon: '🔥', bg: '#FFE3D1' },
  { id: 'fast', name: 'Fast Delivery', icon: '⚡', bg: '#FFF2C2' },
  { id: 'premium', name: 'Premium', icon: '✨', bg: '#ECE1FF' },
  { id: 'healthy', name: 'Healthy', icon: '🥗', bg: '#DFF3DE' },
  { id: 'veg', name: 'Pure Veg', icon: '🌱', bg: '#D9F7E8' },
  { id: 'late', name: 'Late Night', icon: '🌙', bg: '#E0E7FF' },
];