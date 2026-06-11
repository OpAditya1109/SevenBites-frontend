import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

/**
 * AddressSelector — compact address picker strip
 * Props:
 *   address  (string)  current address label
 *   onPress  (fn)      called when tapped
 */
export default function AddressSelector({ address = 'Select address', onPress }) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name="location" size={18} color={COLORS.primary} />
      <Text style={styles.address} numberOfLines={1}>{address}</Text>
      <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 8,
  },
  address: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
});