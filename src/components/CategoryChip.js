import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';

export default function CategoryChip({ category, selected, onPress }) {
  return (
    <TouchableOpacity style={styles.wrap} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconCircle, { backgroundColor: category.bg }, selected && styles.iconCircleSelected]}>
        <Text style={styles.emoji}>{category.icon}</Text>
      </View>
      <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: 68 },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6, borderWidth: 2, borderColor: 'transparent',
  },
  iconCircleSelected: { borderColor: COLORS.primary },
  emoji: { fontSize: 24 },
  name: { fontSize: 11, fontWeight: '600', color: COLORS.darkGray, textAlign: 'center' },
  nameSelected: { color: COLORS.primary, fontWeight: '700' },
});