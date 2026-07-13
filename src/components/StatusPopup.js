import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { COLORS } from '../utils/constants';

// Centered status popup — used for "Order Cancelled" / payment failed states
// instead of the default OS Alert.
export default function StatusPopup({
  visible, icon = '❌', title, message, primaryLabel = 'Try Again', onPrimary, secondaryLabel = 'Go Back', onSecondary,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSecondary}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}

          <TouchableOpacity style={styles.primaryBtn} onPress={onPrimary} activeOpacity={0.9}>
            <Text style={styles.primaryText}>{primaryLabel}</Text>
          </TouchableOpacity>

          {!!secondaryLabel && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={onSecondary}>
              <Text style={styles.secondaryText}>{secondaryLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    width: '100%', backgroundColor: COLORS.darkCard, borderRadius: 20, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.darkCardAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  icon: { fontSize: 36 },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.white, marginBottom: 6, textAlign: 'center' },
  message: { fontSize: 14, color: COLORS.darkTextSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: { marginTop: 12, paddingVertical: 6 },
  secondaryText: { color: COLORS.darkTextSecondary, fontWeight: '600', fontSize: 14 },
});