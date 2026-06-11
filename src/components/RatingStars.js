import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

/**
 * RatingStars — renders 5 stars filled/half/empty
 * Props:
 *   rating  (number 0-5)
 *   size    (number, default 14)
 */
export default function RatingStars({ rating = 0, size = 14 }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    let name = 'star-outline';
    if (rating >= i) name = 'star';
    else if (rating >= i - 0.5) name = 'star-half';
    stars.push(
      <Ionicons key={i} name={name} size={size} color={COLORS.rating} />
    );
  }
  return <View style={styles.row}>{stars}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});