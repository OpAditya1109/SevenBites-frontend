import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';

export default function CategoryChip({ category, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.selectedChip]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.emoji}>{category.icon}</Text>
      <Text style={[styles.name, selected && styles.selectedName]}>{category.name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: { alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: COLORS.border, minWidth: 72 },
  selectedChip: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  emoji: { fontSize: 22, marginBottom: 4 },
  name: { fontSize: 11, fontWeight: '600', color: COLORS.gray },
  selectedName: { color: '#fff' },
});