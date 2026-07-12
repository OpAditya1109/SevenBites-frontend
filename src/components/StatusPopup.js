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
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}

          <TouchableOpacity style={styles.primaryBtn} onPress={onPrimary}>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', backgroundColor: COLORS.white, borderRadius: 20, padding: 24, alignItems: 'center' },
  icon: { fontSize: 44, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.black, marginBottom: 6, textAlign: 'center' },
  message: { fontSize: 14, color: COLORS.gray, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: { marginTop: 12, paddingVertical: 6 },
  secondaryText: { color: COLORS.gray, fontWeight: '600', fontSize: 14 },
}); 