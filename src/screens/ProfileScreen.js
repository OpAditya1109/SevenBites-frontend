import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { getUserOrders, getMyReviews } from '../services/api';

const MENU_ITEMS = [
  { icon: 'location-outline', label: 'My Addresses', screen: 'Address' },
  { icon: 'receipt-outline', label: 'Order History', screen: 'Orders' },
  { icon: 'heart-outline', label: 'Favourites', screen: null },
  { icon: 'card-outline', label: 'Payment Methods', screen: null },
  { icon: 'gift-outline', label: 'Offers & Rewards', screen: null },
  { icon: 'help-circle-outline', label: 'Help & Support', screen: null },
  { icon: 'settings-outline', label: 'Settings', screen: null },
];

const VOID_STATUSES = ['cancelled', 'rejected'];

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const [statsLoading, setStatsLoading] = useState(true);
  const [ordersCount, setOrdersCount] = useState(0);
  const [totalSaved, setTotalSaved] = useState(0);
  const [avgRating, setAvgRating] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);

  const fetchStats = useCallback(async () => {
    try {
      const [ordersRes, reviewsRes] = await Promise.all([getUserOrders(), getMyReviews()]);
      const orders = ordersRes?.data?.data || [];
      const reviews = reviewsRes?.data?.data || [];

      setOrdersCount(orders.length);

      const saved = orders
        .filter((o) => !VOID_STATUSES.includes(o.status))
        .reduce((sum, o) => sum + (o.discountAmount || 0), 0);
      setTotalSaved(saved);

      if (reviews.length > 0) {
        const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        setAvgRating(Math.round(avg * 10) / 10);
      } else {
        setAvgRating(null);
      }
      setReviewCount(reviews.length);
    } catch {
      setOrdersCount(0);
      setTotalSaved(0);
      setAvgRating(null);
      setReviewCount(0);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchStats);
    return unsubscribe;
  }, [navigation, fetchStats]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const ratingDisplay = statsLoading ? '—' : avgRating !== null ? `${avgRating} ⭐` : 'New';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
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

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statsLoading ? '—' : ordersCount}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statsLoading ? '—' : `₹${totalSaved.toLocaleString('en-IN')}`}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{ratingDisplay}</Text>
            <Text style={styles.statLabel}>{statsLoading || avgRating !== null ? 'Rating' : 'No reviews yet'}</Text>
          </View>
        </View>

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
              <Ionicons name="chevron-forward" size={16} color={COLORS.darkTextSecondary} />
            </TouchableOpacity>
          ))}
        </View>

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
  safe: { flex: 1, backgroundColor: COLORS.darkBg },
  header: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.darkBg, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.white },
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.darkCard, margin: 16,
    borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  userEmail: { fontSize: 13, color: COLORS.darkTextSecondary, marginTop: 2 },
  userPhone: { fontSize: 13, color: COLORS.darkTextSecondary },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.darkCardAlt, justifyContent: 'center', alignItems: 'center' },
  statsCard: {
    flexDirection: 'row', backgroundColor: COLORS.darkCard, marginHorizontal: 16, borderRadius: 16,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  statLabel: { fontSize: 12, color: COLORS.darkTextSecondary, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: COLORS.darkBorder },
  menuCard: { backgroundColor: COLORS.darkCard, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  lastItem: { borderBottomWidth: 0 },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.darkCardAlt, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.white },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 16,
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 14, padding: 14,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  version: { textAlign: 'center', fontSize: 12, color: COLORS.darkTextSecondary, marginBottom: 8 },
});