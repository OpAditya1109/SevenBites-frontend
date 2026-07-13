import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, HOME_CATEGORIES } from '../utils/constants';
import { getRestaurants } from '../services/api';
import RestaurantCard from '../components/RestaurantCard';
import CategoryChip from '../components/CategoryChip';
import OfferBanner from '../components/OfferBanner';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { AppLoader, LOADING_MESSAGES } from '../components/AppLoader';

const ACTIVE_ADDRESS_KEY = 'sevenbites_active_address';

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
      const res = await getRestaurants({});
      setRestaurants(res.data.data || res.data);
    } catch {
      setRestaurants([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);
  const onRefresh = () => { setRefreshing(true); fetchRestaurants(); };

  const trendingList = restaurants.slice(0, 6);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* ── Address + notifications ─────────────────────────── */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.addressRow} onPress={openAddressPicker} activeOpacity={0.8}>
            <View style={styles.pinCircle}>
              <Ionicons name="location" size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliverTo}>DELIVER TO</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.addressText} numberOfLines={1}>{addressLabel}</Text>
                <Ionicons name="chevron-down" size={15} color={COLORS.black} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.black} />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        {/* ── Greeting removed — subtitle kept ─────────────────── */}
        <Text style={styles.craving}>What are you craving today?</Text>

        {/* ── Search bar ───────────────────────────────────────── */}
        <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate('Search')} activeOpacity={0.9}>
          <Ionicons name="search" size={18} color="#999" />
          <Text style={styles.searchPlaceholder}>Search 'butter chicken' or 'biryani'</Text>
          <View style={styles.searchDivider} />
          <Text style={styles.voiceText}>Voice</Text>
        </TouchableOpacity>

        {/* ── Live offer banner ────────────────────────────────── */}
        <OfferBanner onPress={() => console.log('Banner tapped')} />

        {/* ── Category icons ───────────────────────────────────── */}
        <FlatList
          data={HOME_CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
          renderItem={({ item }) => (
            <CategoryChip
              category={item}
              selected={selectedCategory === item.id}
              onPress={() => setSelectedCategory(selectedCategory === item.id ? null : item.id)}
            />
          )}
          keyExtractor={(item) => item.id}
          style={{ marginTop: 22, marginBottom: 8 }}
        />

        {loading ? (
          <AppLoader messages={LOADING_MESSAGES.default} />
        ) : restaurants.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>No restaurants yet</Text>
            <Text style={styles.emptySub}>Check back soon — we're adding more!</Text>
          </View>
        ) : (
          <>
            {/* ── Trending near you ─────────────────────────────── */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Trending near you</Text>
                <Text style={styles.sectionSub}>Loved this week</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={trendingList}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 16, paddingRight: 2 }}
              keyExtractor={(item) => `t-${item._id}`}
              renderItem={({ item }) => (
                <RestaurantCard
                  restaurant={item}
                  cardWidth={260}
                  onPress={() => navigation.navigate('Restaurant', { restaurant: item })}
                />
              )}
            />

            {/* ── Recommended for you ───────────────────────────── */}
            <View style={[styles.sectionHeader, { marginTop: 26 }]}>
              <View>
                <Text style={styles.sectionTitle}>Recommended for you</Text>
                <Text style={styles.sectionSub}>Based on your taste</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 14 }}>
              {restaurants.map((r) => (
                <RestaurantCard
                  key={r._id}
                  restaurant={r}
                  onPress={() => navigation.navigate('Restaurant', { restaurant: r })}
                />
              ))}
            </View>
          </>
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
  safe: { flex: 1, backgroundColor: COLORS.cream },

  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 12 },
  pinCircle: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  deliverTo: { fontSize: 10, color: COLORS.gray, fontWeight: '700', letterSpacing: 0.5 },
  addressText: { fontSize: 15, fontWeight: '800', color: COLORS.black, maxWidth: 220 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  bellDot: {
    position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary, borderWidth: 1.5, borderColor: COLORS.white,
  },

  craving: { fontSize: 15, color: COLORS.gray, fontWeight: '500', paddingHorizontal: 16, marginTop: 14, marginBottom: 14 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    marginHorizontal: 16, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: '#999' },
  searchDivider: { width: 1, height: 16, backgroundColor: COLORS.border },
  voiceText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, marginTop: 22 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.black },
  sectionSub: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  seeAll: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginTop: 3 },

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