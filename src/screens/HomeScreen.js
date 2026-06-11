import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FOOD_CATEGORIES } from '../utils/constants';
import { getRestaurants } from '../services/api';
import RestaurantCard from '../components/RestaurantCard';
import CategoryChip from '../components/CategoryChip';
import HeroBanner from '../components/Herobanner';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const ACTIVE_ADDRESS_KEY = 'sevenbites_active_address';

const LOADING_MESSAGES = [
  '🍕 Hunting down the best spots...',
  '🛵 Our riders are warming up...',
  '🧑‍🍳 Chefs are getting ready...',
  '🌶️ Spicing things up for you...',
  '🍔 Good food takes a second...',
];
const loadingMsg = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { totalItems, totalPrice } = useCart();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeAddress, setActiveAddress] = useState(null);

  // ── Load active address ───────────────────────────────────────
  useEffect(() => { loadActiveAddress(); }, []);

  const loadActiveAddress = async () => {
    try {
      const stored = await AsyncStorage.getItem(ACTIVE_ADDRESS_KEY);
      if (stored) setActiveAddress(JSON.parse(stored));
    } catch { /* silent */ }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadActiveAddress);
    return unsubscribe;
  }, [navigation]);

  const addressLabel = activeAddress
    ? [activeAddress.flatNo, activeAddress.street, activeAddress.city].filter(Boolean).join(', ')
    : 'Set delivery location';

  const openAddressPicker = () => {
    navigation.navigate('Address', {
      onSelect: async (addr) => {
        setActiveAddress(addr);
        await AsyncStorage.setItem(ACTIVE_ADDRESS_KEY, JSON.stringify(addr));
      },
    });
  };

  // ── Fetch restaurants ─────────────────────────────────────────
  const fetchRestaurants = useCallback(async () => {
    try {
      const params = selectedCategory ? { category: selectedCategory } : {};
      const res = await getRestaurants(params);
      setRestaurants(res.data.data || res.data);
    } catch {
      setRestaurants([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);
  const onRefresh = () => { setRefreshing(true); fetchRestaurants(); };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* ── Hero Banner (owns address + search bar inside) ─────── */}
        <HeroBanner
          addressLabel={addressLabel}
          onAddressPress={openAddressPicker}
          onSearchPress={() => navigation.navigate('Search')}
          onBannerPress={(banner) => console.log('Banner tapped:', banner.id)}
        />

        {/* ── Categories ───────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>What's on your mind?</Text>
        <FlatList
          data={FOOD_CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          renderItem={({ item }) => (
            <CategoryChip
              category={item}
              selected={selectedCategory === item.name}
              onPress={() => setSelectedCategory(selectedCategory === item.name ? null : item.name)}
            />
          )}
          keyExtractor={(item) => item.id}
          style={{ marginBottom: 20 }}
        />

        {/* ── Restaurant list ───────────────────────────────────── */}
        <View style={styles.restHeader}>
          <Text style={styles.sectionTitle}>
            {selectedCategory ? `${selectedCategory} Restaurants` : 'All Restaurants'}
          </Text>
          <Text style={styles.count}>{restaurants.length} places</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>{loadingMsg}</Text>
          </View>
        ) : restaurants.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>No restaurants yet</Text>
            <Text style={styles.emptySub}>Check back soon — we're adding more!</Text>
          </View>
        ) : (
          restaurants.map((r) => (
            <RestaurantCard
              key={r._id}
              restaurant={r}
              onPress={() => navigation.navigate('Restaurant', { restaurant: r })}
            />
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Cart FAB ──────────────────────────────────────────── */}
      {totalItems > 0 && (
        <TouchableOpacity style={styles.cartFab} onPress={() => navigation.navigate('Cart')}>
          <View style={styles.cartFabBadge}>
            <Text style={styles.cartFabBadgeText}>{totalItems}</Text>
          </View>
          <Text style={styles.cartFabText}>View Cart</Text>
          <Text style={styles.cartFabPrice}>₹{totalPrice.toFixed(0)}</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.black, paddingHorizontal: 16, marginBottom: 12, marginTop: 16 },
  restHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 16, marginTop: 4 },
  count: { fontSize: 13, color: COLORS.gray },

  loadingContainer: { marginTop: 60, alignItems: 'center', gap: 14 },
  loadingText: { fontSize: 15, color: COLORS.gray, fontWeight: '500', textAlign: 'center', paddingHorizontal: 32 },

  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.black, marginBottom: 6 },
  emptySub: { fontSize: 13, color: COLORS.gray, textAlign: 'center' },

  cartFab: {
    position: 'absolute', bottom: 24, left: 24, right: 24,
    backgroundColor: COLORS.primary, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  cartFabBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  cartFabBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cartFabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cartFabPrice: { color: '#fff', fontWeight: '700', fontSize: 16 },
});