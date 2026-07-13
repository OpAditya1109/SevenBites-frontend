import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS } from '../utils/constants';

const LIVE_STATUS_LABEL = {
  placed: 'Order placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for pickup',
  out_for_delivery: 'Out for delivery',
};

// Single source of truth for card height so the order card and the cart
// card can NEVER drift apart in size, no matter how much text either has.
const CARD_HEIGHT = 72;

// "8 min ago" style label computed live from the order's real createdAt timestamp
function getElapsedLabel(dateStr) {
  if (!dateStr) return '';
  const mins = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000));
  if (mins < 1) return 'Just now';
  if (mins === 1) return '1 min ago';
  return `${mins} min ago`;
}

/**
 * HomeFloatingBar — single compact floating widget that replaces the old
 * stacked "Live Order" + "View Cart" bars. When both are active it becomes
 * a swipeable 2-page pager (with a labelled tab indicator instead of dots);
 * when only one is active it renders full-width with no swipe needed.
 *
 * Both cards share the exact same CARD_HEIGHT and are wrapped in a frosted
 * BlurView (glass effect) with a dark tint overlay on top so text stays
 * readable, and a thin brand-tinted border so "order" vs "cart" is still
 * visually distinguishable even though both are glass.
 *
 * Live-order data (restaurant name, status, item count, "x min ago") is all
 * pulled straight from the real `activeOrder` object passed in from
 * HomeScreen (which itself stays fresh via socket + polling) — nothing here
 * is hardcoded/fixed.
 */
export default function HomeFloatingBar({
  activeOrder,
  totalItems,
  totalPrice,
  restaurantName,
  onPressOrder,
  onPressCart,
}) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 48; // 24px horizontal margin on each side (see `wrap` style)
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [, forceTick] = useState(0);

  const pages = [];
  if (activeOrder) pages.push('order');
  if (totalItems > 0) pages.push('cart');

  // Re-render every 20s purely so the "x min ago" label stays live/accurate
  useEffect(() => {
    if (!activeOrder) return undefined;
    const id = setInterval(() => forceTick((t) => t + 1), 20000);
    return () => clearInterval(id);
  }, [activeOrder?._id]);

  // If a card is swiped away/removed (e.g. order gets delivered mid-swipe),
  // keep the visible index in range.
  useEffect(() => {
    if (activeIndex > pages.length - 1) setActiveIndex(0);
  }, [pages.length]);

  if (pages.length === 0) return null;

  const onMomentumEnd = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    setActiveIndex(idx);
  };

  // Tapping a tab jumps the pager straight to that page — clearer than a dot
  // since the customer can see exactly which page they're choosing.
  const goToPage = (idx) => {
    setActiveIndex(idx);
    scrollRef.current?.scrollTo({ x: idx * cardWidth, animated: true });
  };

  const itemCount = activeOrder?.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;

  const OrderCard = (
    <TouchableOpacity
      style={[styles.cardShadowWrap, { width: cardWidth }]}
      activeOpacity={0.9}
      onPress={onPressOrder}
    >
      <BlurView intensity={55} tint="dark" style={styles.blurFill}>
        <View style={[styles.cardInner, styles.orderTint]}>
          <View style={styles.iconWrap}>
            <Ionicons name="bicycle" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow} numberOfLines={1}>
              LIVE ORDER{itemCount ? ` · ${itemCount} ITEM${itemCount > 1 ? 'S' : ''}` : ''}
            </Text>
            <Text style={styles.title} numberOfLines={1}>{activeOrder?.restaurantName || 'Your order'}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {(LIVE_STATUS_LABEL[activeOrder?.status] || 'Tracking')} · {getElapsedLabel(activeOrder?.createdAt)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const CartCard = (
    <TouchableOpacity
      style={[styles.cardShadowWrap, { width: cardWidth }]}
      activeOpacity={0.9}
      onPress={onPressCart}
    >
      <BlurView intensity={55} tint="dark" style={styles.blurFill}>
        <View style={[styles.cardInner, styles.cartTint]}>
          <View style={styles.iconWrap}>
            <Text style={styles.cartBadgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow} numberOfLines={1}>VIEW CART</Text>
            <Text style={styles.title} numberOfLines={1}>
              {restaurantName || `${totalItems} item${totalItems > 1 ? 's' : ''}`}
            </Text>
          </View>
          <Text style={styles.price}>₹{totalPrice.toFixed(0)}</Text>
          <Ionicons name="chevron-forward" size={16} color="#fff" style={{ marginLeft: 2 }} />
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const cardFor = { order: OrderCard, cart: CartCard };
  const tabIcon = { order: 'bicycle', cart: 'cart' };
  const tabLabel = { order: 'Order', cart: 'Cart' };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {pages.length > 1 ? (
        <>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={cardWidth}
            onMomentumScrollEnd={onMomentumEnd}
            contentContainerStyle={{ width: cardWidth * pages.length }}
          >
            {pages.map((p) => (
              <View key={p} style={{ width: cardWidth, height: CARD_HEIGHT }}>
                {cardFor[p]}
              </View>
            ))}
          </ScrollView>

          {/* Labelled tab indicator (replaces plain dots) — shows which page
              you're on AND lets you tap straight to the other one. */}
          <View style={styles.tabRow} pointerEvents="box-none">
            <BlurView intensity={45} tint="dark" style={styles.tabBlur}>
              <View style={styles.tabInner}>
                {pages.map((p, i) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => goToPage(i)}
                    activeOpacity={0.8}
                    style={[styles.tabPill, i === activeIndex && styles.tabPillActive]}
                  >
                    <Ionicons
                      name={tabIcon[p]}
                      size={11}
                      color={i === activeIndex ? '#fff' : 'rgba(255,255,255,0.55)'}
                    />
                    <Text style={[styles.tabPillText, i === activeIndex && styles.tabPillTextActive]}>
                      {tabLabel[p]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </BlurView>
          </View>
        </>
      ) : (
        <View style={{ height: CARD_HEIGHT }}>{cardFor[pages[0]]}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // bottom:78 sits just 8px above the tab bar
  wrap: {
    position: 'absolute',
    bottom: 78,
    left: 24,
    right: 24,
  },

  // Outer wrapper carries the shadow (BlurView + overflow:hidden can't cast
  // one), inner blur carries the glass effect and rounded corners.
  cardShadowWrap: {
    height: CARD_HEIGHT,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 7,
  },

  blurFill: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },

  cardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },

  // Dark glass base on every card (kept "a little bit dark" per request),
  // then a faint brand-colour wash on top so order/cart are still
  // distinguishable from each other while both stay translucent.
  orderTint: {
    backgroundColor: Platform.select({ ios: 'rgba(20,10,4,0.55)', android: 'rgba(20,10,4,0.72)' }),
    borderColor: 'rgba(252,128,25,0.35)',
  },

  cartTint: {
    backgroundColor: Platform.select({ ios: 'rgba(20,4,6,0.55)', android: 'rgba(20,4,6,0.72)' }),
    borderColor: 'rgba(226,55,68,0.35)',
  },

  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cartBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },

  eyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  title: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13.5,
    marginTop: 1,
  },

  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },

  price: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },

  // --- Tab indicator (replaces the old dotsRow) ---
  tabRow: {
    alignItems: 'center',
    marginTop: 8,
  },

  tabBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },

  tabInner: {
    flexDirection: 'row',
    gap: 4,
    padding: 3,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },

  tabPillActive: {
    backgroundColor: COLORS.primary,
  },

  tabPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
  },

  tabPillTextActive: {
    color: '#fff',
  },
});