import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Alert, Image, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../utils/constants';
import { getMenuByRestaurant } from '../services/api';
import { useCart } from '../context/CartContext';
import FoodItemCard from '../components/FoodItemCard';
import { AppLoader, LOADING_MESSAGES } from '../components/AppLoader';

const HERO_HEIGHT = 260;
const isImageUrl = (val) => typeof val === 'string' && /^https?:\/\//.test(val);

const MOCK_MENU = [
  {
    _id: 'm1', category: 'Bestsellers',
    items: [
      { _id: 'i1', name: 'Margherita Pizza', description: 'Classic tomato sauce, mozzarella, fresh basil, drizzled with olive oil and oregano', price: 249, isVeg: true, rating: 4.3, image: '🍕', inStock: true, isBestseller: true },
      { _id: 'i2', name: 'Chicken Tikka Pizza', description: 'Spicy chicken tikka, onions, capsicum', price: 349, isVeg: false, rating: 4.5, image: '🍕', inStock: true, isBestseller: true, isCustomizable: true },
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
  const [isFav, setIsFav] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const sectionOffsets = useRef({});
  const cartFabAnim = useRef(new Animated.Value(0)).current;

  // Menu / filter bar toggle state
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState(null); // e.g. 'priceLowHigh'
  const [vegFilter, setVegFilter] = useState(null); // 'veg' | 'nonveg' | null
  const [topPicks, setTopPicks] = useState(false);
  const [dietary, setDietary] = useState(null);
  const [offersOnly, setOffersOnly] = useState(false);

  useEffect(() => { fetchMenu(); }, []);

  useEffect(() => {
    Animated.spring(cartFabAnim, {
      toValue: totalItems > 0 && restaurantId === restaurant._id ? 1 : 0,
      friction: 7, tension: 80, useNativeDriver: true,
    }).start();
  }, [totalItems, restaurantId]);

  const fetchMenu = async () => {
    try {
      const res = await getMenuByRestaurant(restaurant._id);
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

  const handleShare = () => {
    Share.share({ message: `Check out ${restaurant.name} on SevenBites!` }).catch(() => {});
  };

  const headerOpacity = scrollY.interpolate({ inputRange: [0, HERO_HEIGHT - 90, HERO_HEIGHT - 40], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  const heroScale = scrollY.interpolate({ inputRange: [-150, 0], outputRange: [1.5, 1], extrapolateRight: 'clamp' });
  const heroTranslate = scrollY.interpolate({ inputRange: [0, HERO_HEIGHT], outputRange: [0, -HERO_HEIGHT / 2.5], extrapolate: 'clamp' });

  const scrollToCategory = (idx) => {
    setActiveCategory(idx);
    const y = sectionOffsets.current[idx];
    if (y !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: Math.max(y - 60, 0), animated: true });
    }
  };

  return (
    <View style={styles.container}>
      {/* Collapsing Header (appears on scroll) */}
      <Animated.View style={[styles.animatedHeader, { opacity: headerOpacity }]} pointerEvents="box-none">
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{restaurant.name}</Text>
            <TouchableOpacity onPress={() => setIsFav(!isFav)} style={styles.headerBtn}>
              <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? COLORS.primary : COLORS.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* Floating controls, always visible over hero */}
      <View style={styles.floatingControls} pointerEvents="box-none">
        <SafeAreaView edges={['top']} style={styles.floatingRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.circleBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.floatingRight}>
            <TouchableOpacity onPress={handleShare} style={styles.circleBtn}>
              <Ionicons name="share-social-outline" size={18} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsFav(!isFav)} style={styles.circleBtn}>
              <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={19} color={isFav ? COLORS.primary : COLORS.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* Hero */}
        <View style={styles.heroWrap}>
          <Animated.View style={[styles.hero, { transform: [{ scale: heroScale }, { translateY: heroTranslate }] }]}>
            {isImageUrl(restaurant.image) ? (
              <Image source={{ uri: restaurant.image }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={styles.heroEmojiBg}>
                <Text style={styles.heroEmoji}>{restaurant.image || '🍽️'}</Text>
              </View>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(11,11,13,0.4)', COLORS.darkBg]}
              style={styles.heroGradient}
            />
            {!restaurant.isOpen && (
              <View style={styles.closedOverlay}>
                <Text style={styles.closedText}>CURRENTLY CLOSED</Text>
              </View>
            )}
          </Animated.View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.restName}>{restaurant.name}</Text>
              <Text style={styles.restCuisine}>{(restaurant.cuisine || []).join(', ')}</Text>
              <Text style={styles.restAddress} numberOfLines={1}>
                {typeof restaurant.address === 'object'
                  ? [restaurant.address?.street, restaurant.address?.city].filter(Boolean).join(', ')
                  : restaurant.address || ''}
              </Text>
            </View>
            {restaurant.rating ? (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={13} color="#fff" />
                <Text style={styles.ratingText}>{restaurant.rating}</Text>
                {restaurant.totalRatings ? (
                  <Text style={styles.ratingCount}>({restaurant.totalRatings}+)</Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={18} color={COLORS.secondary} />
              <Text style={styles.statValue}>{restaurant.deliveryTime} min</Text>
              <Text style={styles.statLabel}>Delivery</Text>
            </View>
          </View>

          {(restaurant.discount || restaurant.offer) && (
            <View style={styles.discountRow}>
              <Ionicons name="pricetag" size={14} color={COLORS.secondary} />
              <Text style={styles.discountText}>{restaurant.discount || restaurant.offer}</Text>
            </View>
          )}
        </View>

        {/* Menu */}
        {loading ? (
          <AppLoader messages={LOADING_MESSAGES.restaurant} />
        ) : (
          <>
            <View style={styles.categoryTabsWrap}>
              {!showFilters ? (
                <View style={styles.categoryBarRow}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryTabs}
                    style={{ flex: 1 }}
                  >
                    {menu.map((section, idx) => (
                      <TouchableOpacity
                        key={section._id}
                        style={[styles.categoryTab, activeCategory === idx && styles.activeCategoryTab]}
                        onPress={() => scrollToCategory(idx)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.categoryTabText, activeCategory === idx && styles.activeCategoryTabText]}>
                          {section.category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.menuBtn}
                    onPress={() => setShowFilters(true)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="restaurant-outline" size={14} color="#fff" />
                    <Text style={styles.menuBtnText}>Menu</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryTabs}
                >
                  <TouchableOpacity
                    style={styles.filterChip}
                    onPress={() => setShowFilters(false)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="chevron-back" size={14} color={COLORS.white} />
                    <Text style={styles.filterChipText}>Categories</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, sortBy && styles.activeFilterChip]}
                    onPress={() => setSortBy(sortBy ? null : 'priceLowHigh')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="swap-vertical" size={14} color={sortBy ? '#fff' : COLORS.darkTextSecondary} />
                    <Text style={[styles.filterChipText, sortBy && styles.activeFilterChipText]}>Sort By</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, vegFilter && styles.activeFilterChip]}
                    onPress={() => setVegFilter(vegFilter === 'veg' ? 'nonveg' : vegFilter === 'nonveg' ? null : 'veg')}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.vegDotSmall, { backgroundColor: vegFilter === 'nonveg' ? COLORS.nonVegRed : COLORS.vegGreen }]} />
                    <Text style={[styles.filterChipText, vegFilter && styles.activeFilterChipText]}>
                      {vegFilter === 'veg' ? 'Veg' : vegFilter === 'nonveg' ? 'Non-Veg' : 'Veg / Non-Veg'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, topPicks && styles.activeFilterChip]}
                    onPress={() => setTopPicks(!topPicks)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="flame" size={14} color={topPicks ? '#fff' : COLORS.darkTextSecondary} />
                    <Text style={[styles.filterChipText, topPicks && styles.activeFilterChipText]}>Top Picks</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, dietary && styles.activeFilterChip]}
                    onPress={() => setDietary(dietary ? null : 'jain')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="leaf-outline" size={14} color={dietary ? '#fff' : COLORS.darkTextSecondary} />
                    <Text style={[styles.filterChipText, dietary && styles.activeFilterChipText]}>Dietary Preference</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, offersOnly && styles.activeFilterChip]}
                    onPress={() => setOffersOnly(!offersOnly)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="pricetag-outline" size={14} color={offersOnly ? '#fff' : COLORS.darkTextSecondary} />
                    <Text style={[styles.filterChipText, offersOnly && styles.activeFilterChipText]}>Offers</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>

            {menu.map((section, idx) => (
              <View
                key={section._id}
                onLayout={(e) => { sectionOffsets.current[idx] = e.nativeEvent.layout.y; }}
              >
                <View style={styles.menuCategoryRow}>
                  <Text style={styles.menuCategory}>{section.category}</Text>
                  <Text style={styles.menuCategoryCount}>{section.items.length} items</Text>
                </View>
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

        <View style={{ height: 130 }} />
      </Animated.ScrollView>

      {/* Cart FAB */}
      <Animated.View
        pointerEvents={totalItems > 0 && restaurantId === restaurant._id ? 'auto' : 'none'}
        style={[
          styles.cartFab,
          {
            opacity: cartFabAnim,
            transform: [{
              translateY: cartFabAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }),
            }],
          },
        ]}
      >
        <TouchableOpacity style={styles.cartFabInner} onPress={() => navigation.navigate('Cart')} activeOpacity={0.9}>
          <View style={styles.cartFabLeft}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
            <Text style={styles.cartFabText}>View Cart</Text>
          </View>
          <View style={styles.cartFabRight}>
            <Text style={styles.cartFabPrice}>₹{totalPrice.toFixed(0)}</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.darkBg },
  animatedHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    backgroundColor: COLORS.darkBg, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.white },

  floatingControls: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 101 },
  floatingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 8 },
  floatingRight: { flexDirection: 'row', gap: 10 },
  circleBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },

  heroWrap: { height: HERO_HEIGHT, overflow: 'hidden', backgroundColor: '#111113' },
  hero: { width: '100%', height: HERO_HEIGHT * 1.3 },
  heroImage: { width: '100%', height: '100%' },
  heroEmojiBg: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.darkCardAlt },
  heroEmoji: { fontSize: 90 },
  heroGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '65%' },
  closedOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  closedText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 2 },

  infoCard: {
    backgroundColor: COLORS.darkCard, marginTop: -28, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 18, borderBottomWidth: 8, borderBottomColor: COLORS.darkBg,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 10 },
  restName: { fontSize: 22, fontWeight: '800', color: COLORS.white, marginBottom: 4 },
  restCuisine: { fontSize: 13, color: COLORS.darkTextSecondary, marginBottom: 2 },
  restAddress: { fontSize: 12, color: COLORS.darkTextSecondary },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.green, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  ratingText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  ratingCount: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.darkBorder },
  statItem: { alignItems: 'center', gap: 3 },
  statValue: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  statLabel: { fontSize: 11, color: COLORS.darkTextSecondary },
  statDivider: { width: 1, backgroundColor: COLORS.darkBorder },
  discountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.darkCardAlt,
    padding: 11, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  discountText: { fontSize: 13, color: COLORS.secondary, fontWeight: '700' },

  categoryTabsWrap: { backgroundColor: COLORS.darkBg, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  categoryBarRow: { flexDirection: 'row', alignItems: 'center' },
  categoryTabs: { paddingHorizontal: 16, gap: 8, paddingVertical: 12 },
  categoryTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.darkBorder, backgroundColor: COLORS.darkCard },
  activeCategoryTab: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryTabText: { fontSize: 13, fontWeight: '600', color: COLORS.darkTextSecondary },
  activeCategoryTabText: { color: '#fff' },

  menuBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 16,
  },
  menuBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.darkBorder, backgroundColor: COLORS.darkCard,
  },
  activeFilterChip: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: COLORS.darkTextSecondary },
  activeFilterChipText: { color: '#fff' },
  vegDotSmall: { width: 8, height: 8, borderRadius: 4 },

  menuCategoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 16, paddingTop: 22, paddingBottom: 8 },
  menuCategory: { fontSize: 17, fontWeight: '800', color: COLORS.white },
  menuCategoryCount: { fontSize: 12, color: COLORS.darkTextSecondary },

  cartFab: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  cartFabInner: {
    backgroundColor: COLORS.primary, borderRadius: 16, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  cartFabLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  cartBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cartFabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cartFabRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cartFabPrice: { color: '#fff', fontWeight: '700', fontSize: 16 },
});