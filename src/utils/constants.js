// ── Add to COLORS object ──
export const COLORS = {
  primary: '#E23744',
  secondary: '#FC8019',
  background: '#F5F5F5',
  cream: '#FBF2E9',        // NEW - home screen background
  offerPill: '#FDE9D8',    // NEW - the peach "Flat 50% off..." pill
  vegGreen: '#2E7D32',     // NEW - veg indicator
  nonVegRed: '#C0392B',    // NEW - non-veg indicator
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

// NEW — the icon-circle row on the home screen (separate from FOOD_CATEGORIES,
// which is left untouched since it's still used for cuisine filtering elsewhere)
export const HOME_CATEGORIES = [
  { id: 'trending', name: 'Trending', icon: '🔥', bg: '#FFE3D1' },
  { id: 'fast', name: 'Fast Delivery', icon: '⚡', bg: '#FFF2C2' },
  { id: 'premium', name: 'Premium', icon: '✨', bg: '#ECE1FF' },
  { id: 'healthy', name: 'Healthy', icon: '🥗', bg: '#DFF3DE' },
  { id: 'veg', name: 'Pure Veg', icon: '🌱', bg: '#D9F7E8' },
  { id: 'late', name: 'Late Night', icon: '🌙', bg: '#E0E7FF' },
];