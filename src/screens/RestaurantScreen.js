import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, Animated, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../utils/constants';
import { getMenuByRestaurant } from '../services/api';
import { useCart } from '../context/CartContext';
import FoodItemCard from '../components/FoodItemCard';
import { AppLoader, LOADING_MESSAGES } from '../components/AppLoader';

const isImageUrl = (val) => typeof val === 'string' && /^https?:\/\//.test(val);

// Mock menu data
const MOCK_MENU = [
  {
    _id: 'm1', category: 'Bestsellers',
    items: [
      { _id: 'i1', name: 'Margherita Pizza', description: 'Classic tomato sauce, mozzarella, fresh basil', price: 249, isVeg: true, rating: 4.3, image: '🍕', inStock: true },
      { _id: 'i2', name: 'Chicken Tikka Pizza', description: 'Spicy chicken tikka, onions, capsicum', price: 349, isVeg: false, rating: 4.5, image: '🍕', inStock: true },
    ],
  },
  {
    _id: 'm2', category: 'Pasta',
    items: [
      { _id: 'i3', name: 'Penne Arrabbiata', description: 'Spicy tomato sauce, garlic, herbs', price: 199, isVeg: true, rating: 4.1, image: '🍝', inStock: true },
      { _id: 'i4', name: 'Chicken Alfredo', description: 'Creamy white sauce, grilled chicken, parmesan', price: 299, isVeg: false, rating: 4.4, image: '🍝', inStock: false },
    ],
  },
  {
    _id: 'm3', category: 'Sides & Drinks',
    items: [
      { _id: 'i5', name: 'Garlic Bread', description: '4 pieces with herb butter', price: 99, isVeg: true, rating: 4.6, image: '🥖', inStock: true },
      { _id: 'i6', name: 'Coke', description: '300ml chilled', price: 59, isVeg: true, rating: 4.0, image: '🥤', inStock: true },
    ],
  },
];

export default function RestaurantScreen({ route, navigation }) {
  const { restaurant } = route.params;
  const { addItem, removeItem, getItemQuantity, totalItems, totalPrice, restaurantId } = useCart();
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const sectionOffsets = useRef({});

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const res = await getMenuByRestaurant(restaurant._id);
      // API returns { data: MenuItem[], grouped: { [category]: MenuItem[] } }
      // Convert grouped object to array format matching MOCK_MENU shape
      const grouped = res.grouped || {};
      const sections = Object.keys(grouped).map((cat, idx) => ({
        _id: `cat-${idx}`,
        category: cat,
        items: grouped[cat].map((item) => ({ ...item, inStock: item.isAvailable !== false })),
      }));
      setMenu(sections.length > 0 ? sections : MOCK_MENU);
    } catch {
      setMenu(MOCK_MENU);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (item) => {
    if (restaurantId && restaurantId !== restaurant._id) {
      Alert.alert(
        'Start New Cart?',
        'Your cart has items from another restaurant. Starting a new cart will clear the existing items.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start New', style: 'destructive', onPress: () => addItem(item, restaurant._id, restaurant.name) },
        ]
      );
      return;
    }
    addItem(item, restaurant._id, restaurant.name);
  };

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 150], outputRange: [0, 1], extrapolate: 'clamp' });

  const scrollToCategory = (idx) => {
    setActiveCategory(idx);
    const y = sectionOffsets.current[idx];
    if (y !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: Math.max(y - 60, 0), animated: true });
    }
  };

  return (
    <View style={styles.container}>
      {/* Animated Header */}
      <Animated.View style={[styles.animatedHeader, { opacity: headerOpacity }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={22} color={COLORS.black} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{restaurant.name}</Text>
            <TouchableOpacity style={styles.headerBtn}>
              <Ionicons name="search-outline" size={22} color={COLORS.black} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* Back Button (always visible) */}
      <View style={styles.backBtnFixed}>
        <SafeAreaView edges={['top']}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
            <Ionicons name="arrow-back" size={22} color={COLORS.black} />
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* Restaurant Hero */}
        <View style={styles.hero}>
          <View style={styles.heroImageBg}>
            {isImageUrl(restaurant.image) ? (
              <Image source={{ uri: restaurant.image }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <Text style={styles.heroEmoji}>{restaurant.image || '🍽️'}</Text>
            )}
          </View>
        </View>

        {/* Restaurant Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.restName}>{restaurant.name}</Text>
              <Text style={styles.restCuisine}>{(restaurant.cuisine || []).join(', ')}</Text>
              <Text style={styles.restAddress}>
                {typeof restaurant.address === 'object'
                  ? [restaurant.address?.street, restaurant.address?.city].filter(Boolean).join(', ')
                  : restaurant.address || ''}
              </Text>
            </View>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color="#fff" />
              <Text style={styles.ratingText}>{restaurant.rating}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={18} color={COLORS.primary} />
              <Text style={styles.statValue}>{restaurant.deliveryTime} min</Text>
              <Text style={styles.statLabel}>Delivery</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>₹{restaurant.minOrder}</Text>
              <Text style={styles.statLabel}>Min. Order</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {restaurant.deliveryFee === 0 ? 'Free' : `₹${restaurant.deliveryFee}`}
              </Text>
              <Text style={styles.statLabel}>Delivery Fee</Text>
            </View>
          </View>

          {(restaurant.discount || restaurant.offer) && (
            <View style={styles.discountRow}>
              <Ionicons name="pricetag" size={14} color={COLORS.primary} />
              <Text style={styles.discountText}>{restaurant.discount || restaurant.offer}</Text>
            </View>
          )}
        </View>

        {/* Menu */}
        {loading ? (
<AppLoader messages={LOADING_MESSAGES.restaurant} />       
 ) : (
          <>
            {/* Category Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryTabs}
              style={styles.categoryTabsContainer}
            >
              {menu.map((section, idx) => (
                <TouchableOpacity
                  key={section._id}
                  style={[styles.categoryTab, activeCategory === idx && styles.activeCategoryTab]}
                  onPress={() => scrollToCategory(idx)}
                >
                  <Text style={[styles.categoryTabText, activeCategory === idx && styles.activeCategoryTabText]}>
                    {section.category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Menu Items */}
            {menu.map((section, idx) => (
              <View
                key={section._id}
                onLayout={(e) => { sectionOffsets.current[idx] = e.nativeEvent.layout.y; }}
              >
                <Text style={styles.menuCategory}>{section.category}</Text>
                {section.items.map((item) => (
                  <FoodItemCard
                    key={item._id}
                    item={item}
                    quantity={getItemQuantity(item._id)}
                    onAdd={() => handleAddItem(item)}
                    onRemove={() => removeItem(item._id)}
                  />
                ))}
              </View>
            ))}
          </>
        )}

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* Cart FAB */}
      {totalItems > 0 && restaurantId === restaurant._id && (
        <TouchableOpacity style={styles.cartFab} onPress={() => navigation.navigate('Cart')}>
          <View style={styles.cartFabLeft}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
            <Text style={styles.cartFabText}>View Cart</Text>
          </View>
          <Text style={styles.cartFabPrice}>₹{totalPrice.toFixed(0)}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  animatedHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.black },
  backBtnFixed: { position: 'absolute', top: 0, left: 16, zIndex: 101 },
  backCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3, marginTop: 50 },
  hero: { height: 200, backgroundColor: '#f0f0f0' },
  heroImageBg: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff5f5' },
  heroImage: { width: '100%', height: '100%' },
  heroEmoji: { fontSize: 80 },
  infoCard: { backgroundColor: COLORS.white, marginHorizontal: 0, padding: 16, borderBottomWidth: 8, borderBottomColor: COLORS.background },
  infoHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  restName: { fontSize: 22, fontWeight: '800', color: COLORS.black, marginBottom: 4 },
  restCuisine: { fontSize: 13, color: COLORS.gray, marginBottom: 2 },
  restAddress: { fontSize: 12, color: COLORS.gray },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.green, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  ratingText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.black },
  statLabel: { fontSize: 11, color: COLORS.gray },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff5f5', padding: 10, borderRadius: 8, marginTop: 10 },
  discountText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  categoryTabsContainer: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  categoryTabs: { paddingHorizontal: 16, gap: 4, paddingVertical: 8 },
  categoryTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border },
  activeCategoryTab: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryTabText: { fontSize: 13, fontWeight: '600', color: COLORS.gray },
  activeCategoryTabText: { color: '#fff' },
  menuCategory: { fontSize: 17, fontWeight: '800', color: COLORS.black, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  cartFab: { position: 'absolute', bottom: 24, left: 24, right: 24, backgroundColor: COLORS.primary, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  cartFabLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  cartBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cartFabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cartFabPrice: { color: '#fff', fontWeight: '700', fontSize: 16 },
});