import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

const LIVE_STATUS_LABEL = {
  placed: 'Order placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for pickup',
  out_for_delivery: 'Out for delivery',
};

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
 * a swipeable 2-page pager (with dot indicators); when only one is active
 * it renders full-width with no swipe needed.
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

  const itemCount = activeOrder?.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;

  const OrderCard = (
    <TouchableOpacity
      style={[styles.card, styles.orderCard, { width: cardWidth }]}
      activeOpacity={0.9}
      onPress={onPressOrder}
    >
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
    </TouchableOpacity>
  );

  const CartCard = (
    <TouchableOpacity
      style={[styles.card, styles.cartCard, { width: cardWidth }]}
      activeOpacity={0.9}
      onPress={onPressCart}
    >
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
    </TouchableOpacity>
  );

  const cardFor = { order: OrderCard, cart: CartCard };

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
              <View key={p} style={{ width: cardWidth }}>
                {cardFor[p]}
              </View>
            ))}
          </ScrollView>
          <View style={styles.dotsRow}>
            {pages.map((p, i) => (
              <View key={p} style={[styles.dot, i === activeIndex && styles.dotActive]} />
            ))}
          </View>
        </>
      ) : (
        cardFor[pages[0]]
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // bottom:78 sits just 8px above the tab bar (bottom:18 + height:52 = 70px tall)
  // instead of the old bottom:96, closing up the dead gap.
  wrap: { position: 'absolute', bottom: 78, left: 24, right: 24 },

  card: {
    borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 7,
  },
  orderCard: { backgroundColor: COLORS.secondary, shadowColor: COLORS.secondary },
  cartCard: { backgroundColor: COLORS.primary, shadowColor: COLORS.primary },

  iconWrap: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  eyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 },
  title: { color: '#fff', fontWeight: '800', fontSize: 13.5, marginTop: 1 },
  subtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600', marginTop: 1 },
  price: { color: '#fff', fontWeight: '800', fontSize: 14 },

  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 6 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.darkBorder },
  dotActive: { backgroundColor: COLORS.primary, width: 14 },
});