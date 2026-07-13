import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Alert, Image, Share, Modal,
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

  // Filter chip state (permanent row, Zomato-style)
  const [vegFilter, setVegFilter] = useState(null); // 'veg' | 'egg' | 'nonveg' | null
  const [topRated, setTopRated] = useState(false);
  const [filtersModalVisible, setFiltersModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState(null);
  const [dietary, setDietary] = useState(null);
  const [offersOnly, setOffersOnly] = useState(false);

  // Floating "Menu" button -> quick category-jump sheet
  const [menuSheetVisible, setMenuSheetVisible] = useState(false);

  const isCartActive = totalItems > 0 && restaurantId === restaurant._id;

  useEffect(() => { fetchMenu(); }, []);

  useEffect(() => {
    Animated.spring(cartFabAnim, {
      toValue: isCartActive ? 1 : 0,
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
    setMenuSheetVisible(false);
  };

  // Apply the permanent filter chips to the menu list for rendering
  const filteredMenu = menu
    .map((section) => {
      let items = section.items;
      if (vegFilter === 'veg') items = items.filter((i) => i.isVeg);
      if (vegFilter === 'nonveg') items = items.filter((i) => !i.isVeg);
      if (vegFilter === 'egg') items = items.filter((i) => i.isEgg);
      if (topRated) items = items.filter((i) => (i.rating || 0) >= 4.3);
      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);

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
              <View style={styles.timingRow}>
                <Ionicons name="time-outline" size={13} color={COLORS.secondary} />
                <Text style={styles.timingText}>{restaurant.deliveryTime} min delivery</Text>
              </View>
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
            {/* Permanent filter chips row — always visible, sits right below info card */}
            <View style={styles.filterBarWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterBar}
              >
                <TouchableOpacity
                  style={styles.filterChip}
                  onPress={() => setFiltersModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="options-outline" size={14} color={COLORS.darkTextSecondary} />
                  <Text style={styles.filterChipText}>Filters</Text>
                  <Ionicons name="chevron-down" size={13} color={COLORS.darkTextSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterChip, vegFilter === 'veg' && styles.activeFilterChipVeg]}
                  onPress={() => setVegFilter(vegFilter === 'veg' ? null : 'veg')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.vegIconBox, { borderColor: COLORS.vegGreen }]}>
                    <View style={[styles.vegDotSmall, { backgroundColor: COLORS.vegGreen }]} />
                  </View>
                  <Text style={[styles.filterChipText, vegFilter === 'veg' && styles.activeFilterChipTextVeg]}>Veg</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterChip, vegFilter === 'egg' && styles.activeFilterChip]}
                  onPress={() => setVegFilter(vegFilter === 'egg' ? null : 'egg')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.filterChipEmoji}>🥚</Text>
                  <Text style={[styles.filterChipText, vegFilter === 'egg' && styles.activeFilterChipText]}>Egg</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterChip, vegFilter === 'nonveg' && styles.activeFilterChipNonVeg]}
                  onPress={() => setVegFilter(vegFilter === 'nonveg' ? null : 'nonveg')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.vegIconBox, { borderColor: COLORS.nonVegRed }]}>
                    <View style={[styles.nonVegTriangle, { borderBottomColor: COLORS.nonVegRed }]} />
                  </View>
                  <Text style={[styles.filterChipText, vegFilter === 'nonveg' && styles.activeFilterChipTextNonVeg]}>Non-veg</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterChip, topRated && styles.activeFilterChip]}
                  onPress={() => setTopRated(!topRated)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="sync" size={14} color={topRated ? '#fff' : COLORS.darkTextSecondary} />
                  <Text style={[styles.filterChipText, topRated && styles.activeFilterChipText]}>Highly Rated</Text>
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
            </View>

            {filteredMenu.length === 0 ? (
              <View style={styles.noResultsWrap}>
                <Ionicons name="fast-food-outline" size={32} color={COLORS.darkTextSecondary} />
                <Text style={styles.noResultsText}>No items match your filters</Text>
                <TouchableOpacity
                  style={styles.noResultsResetBtn}
                  onPress={() => { setVegFilter(null); setTopRated(false); setOffersOnly(false); }}
                >
                  <Text style={styles.noResultsResetText}>Reset Filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredMenu.map((section, idx) => (
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
              ))
            )}
          </>
        )}

        <View style={{ height: 130 }} />
      </Animated.ScrollView>

      {/* Floating "Menu" button — bottom right, opens quick category-jump sheet */}
      {!loading && menu.length > 0 && (
        <TouchableOpacity
          style={[styles.menuFab, isCartActive && styles.menuFabRaised]}
          onPress={() => setMenuSheetVisible(true)}
          activeOpacity={0.88}
        >
          <Ionicons name="restaurant" size={16} color="#fff" />
          <Text style={styles.menuFabText}>Menu</Text>
        </TouchableOpacity>
      )}

      {/* Category quick-jump bottom sheet, triggered by the Menu FAB */}
      <Modal
        visible={menuSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setMenuSheetVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.jumpSheet} onPress={() => {}}>
            <View style={styles.sheetHandleRow}>
              <View style={styles.sheetHandle} />
            </View>
            <Text style={styles.jumpSheetTitle}>Menu</Text>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {menu.map((section, idx) => (
                <TouchableOpacity
                  key={section._id}
                  style={[styles.jumpRow, activeCategory === idx && styles.jumpRowActive]}
                  onPress={() => scrollToCategory(idx)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.jumpRowText, activeCategory === idx && styles.jumpRowTextActive]}>
                    {section.category}
                  </Text>
                  <Text style={styles.jumpRowCount}>{section.items.length}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Filters modal — full option set (Sort By, Dietary Preference, etc.) */}
      <Modal
        visible={filtersModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFiltersModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setFiltersModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.jumpSheet} onPress={() => {}}>
            <View style={styles.sheetHandleRow}>
              <View style={styles.sheetHandle} />
            </View>
            <Text style={styles.jumpSheetTitle}>Filters</Text>

            <Text style={styles.filterGroupLabel}>Sort By</Text>
            <View style={styles.filterOptionsWrap}>
              {['Relevance', 'Price: Low to High', 'Price: High to Low', 'Rating'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.filterOptionChip, sortBy === opt && styles.activeFilterChip]}
                  onPress={() => setSortBy(sortBy === opt ? null : opt)}
                >
                  <Text style={[styles.filterOptionText, sortBy === opt && styles.activeFilterChipText]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterGroupLabel}>Dietary Preference</Text>
            <View style={styles.filterOptionsWrap}>
              {['Jain', 'Gluten Free', 'Low Calorie'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.filterOptionChip, dietary === opt && styles.activeFilterChip]}
                  onPress={() => setDietary(dietary === opt ? null : opt)}
                >
                  <Text style={[styles.filterOptionText, dietary === opt && styles.activeFilterChipText]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.filterApplyBtn}
              onPress={() => setFiltersModalVisible(false)}
              activeOpacity={0.88}
            >
              <Text style={styles.filterApplyBtnText}>Apply</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Cart FAB */}
      <Animated.View
        pointerEvents={isCartActive ? 'auto' : 'none'}
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
            <View>
              <Text style={styles.cartFabText} numberOfLines={1}>View Cart</Text>
              {!!restaurant?.name && (
                <Text style={styles.cartFabRestName} numberOfLines={1}>{restaurant.name}</Text>
              )}
            </View>
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
  infoHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, gap: 10 },
  restName: { fontSize: 22, fontWeight: '800', color: COLORS.white, marginBottom: 4 },
  restCuisine: { fontSize: 13, color: COLORS.darkTextSecondary, marginBottom: 2 },
  restAddress: { fontSize: 12, color: COLORS.darkTextSecondary },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.green, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  ratingText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  ratingCount: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
  timingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  timingText: { fontSize: 12, color: COLORS.darkTextSecondary, fontWeight: '600' },

  discountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.darkCardAlt,
    padding: 11, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  discountText: { fontSize: 13, color: COLORS.secondary, fontWeight: '700' },

  filterBarWrap: { backgroundColor: COLORS.darkBg, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  filterBar: { paddingHorizontal: 16, gap: 8, paddingVertical: 12 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.darkBorder, backgroundColor: COLORS.darkCard,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: COLORS.darkTextSecondary },
  filterChipEmoji: { fontSize: 13 },
  activeFilterChip: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  activeFilterChipText: { color: '#fff' },
  activeFilterChipVeg: { backgroundColor: 'rgba(46,125,50,0.18)', borderColor: COLORS.vegGreen },
  activeFilterChipTextVeg: { color: COLORS.vegGreen, fontWeight: '700' },
  activeFilterChipNonVeg: { backgroundColor: 'rgba(192,57,43,0.18)', borderColor: COLORS.nonVegRed },
  activeFilterChipTextNonVeg: { color: COLORS.nonVegRed, fontWeight: '700' },
  vegIconBox: { width: 13, height: 13, borderWidth: 1.5, borderRadius: 3, justifyContent: 'center', alignItems: 'center' },
  vegDotSmall: { width: 6, height: 6, borderRadius: 3 },
  nonVegTriangle: {
    width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 6,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },

  noResultsWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  noResultsText: { fontSize: 14, color: COLORS.darkTextSecondary, fontWeight: '600' },
  noResultsResetBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, marginTop: 4 },
  noResultsResetText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  menuCategoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 16, paddingTop: 22, paddingBottom: 8 },
  menuCategory: { fontSize: 17, fontWeight: '800', color: COLORS.white },
  menuCategoryCount: { fontSize: 12, color: COLORS.darkTextSecondary },

  menuFab: {
    position: 'absolute', right: 20, bottom: 20, zIndex: 90,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: 24,
    paddingHorizontal: 18, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 8,
  },
  menuFabRaised: { bottom: 96 },
  menuFabText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  jumpSheet: {
    backgroundColor: COLORS.darkCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 28, borderTopWidth: 1, borderColor: COLORS.darkBorder,
  },
  sheetHandleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.darkBorder },
  jumpSheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white, paddingVertical: 14 },

  jumpRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder,
  },
  jumpRowActive: { borderBottomColor: COLORS.primary },
  jumpRowText: { fontSize: 15, fontWeight: '600', color: COLORS.darkTextSecondary },
  jumpRowTextActive: { color: COLORS.primary, fontWeight: '800' },
  jumpRowCount: { fontSize: 12, color: COLORS.darkTextSecondary },

  filterGroupLabel: { fontSize: 13, fontWeight: '700', color: COLORS.white, marginTop: 10, marginBottom: 10 },
  filterOptionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  filterOptionChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.darkBorder, backgroundColor: COLORS.darkCardAlt,
  },
  filterOptionText: { fontSize: 13, fontWeight: '600', color: COLORS.darkTextSecondary },
  filterApplyBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  filterApplyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  cartFab: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  cartFabInner: {
    backgroundColor: COLORS.primary, borderRadius: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  cartFabLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  cartBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cartFabText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cartFabRestName: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 11, marginTop: 1, maxWidth: 160 },
  cartFabRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cartFabPrice: { color: '#fff', fontWeight: '700', fontSize: 16 },
});