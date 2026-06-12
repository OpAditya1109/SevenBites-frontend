import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

const MENU_ITEMS = [
  { icon: 'location-outline', label: 'My Addresses', screen: 'Address' },
  { icon: 'receipt-outline', label: 'Order History', screen: 'Orders' },
  { icon: 'heart-outline', label: 'Favourites', screen: null },
  { icon: 'card-outline', label: 'Payment Methods', screen: null },
  { icon: 'gift-outline', label: 'Offers & Rewards', screen: null },
  { icon: 'help-circle-outline', label: 'Help & Support', screen: null },
  { icon: 'settings-outline', label: 'Settings', screen: null },
];

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
            {user?.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹2,340</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4.8 ⭐</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, index === MENU_ITEMS.length - 1 && styles.lastItem]}
              onPress={() => item.screen && navigation.navigate(item.screen)}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name={item.icon} size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.gray} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.primary} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Sevenbites v1.0.0</Text>
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.black },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, margin: 16, borderRadius: 16, padding: 16, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  userEmail: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  userPhone: { fontSize: 13, color: COLORS.gray },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff5f5', justifyContent: 'center', alignItems: 'center' },
  statsCard: { flexDirection: 'row', backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.black },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  menuCard: { backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  lastItem: { borderBottomWidth: 0 },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff5f5', justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.black },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 16, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 14, padding: 14 },
  logoutText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  version: { textAlign: 'center', fontSize: 12, color: COLORS.placeholder, marginBottom: 8 },
});