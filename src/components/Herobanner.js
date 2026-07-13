import React, { useRef, useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../utils/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_BANNER_HEIGHT = 300;

const BANNERS = [
  { id: '1', headline: 'ITEMS AT', highlight: '50% OFF', sub: 'Use code BITE50 • Min order ₹199', cta: 'Order now', colors: ['#E23744', '#c0202e'], emoji: '🍕' },
  { id: '2', headline: 'FREE', highlight: 'DELIVERY', sub: 'On all orders above ₹299 today', cta: 'Grab the deal', colors: ['#FC8019', '#e06b10'], emoji: '🛵' },
  { id: '3', headline: 'NEW USER?', highlight: '₹125 OFF', sub: 'Your first order is on us!', cta: 'Claim now', colors: ['#48C479', '#2fa35e'], emoji: '🎉' },
  { id: '4', headline: 'MIDNIGHT', highlight: 'CRAVINGS?', sub: 'We deliver till 2 AM every night', cta: "See what's open", colors: ['#6C5CE7', '#4834d4'], emoji: '🌙' },
];

export default function HeroBanner({ addressLabel, onAddressPress, onSearchPress, onBannerPress }) {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef(null);
  const timerRef = useRef(null);

  const BANNER_HEIGHT = BASE_BANNER_HEIGHT + insets.top;
  const OVERLAY_TOP = insets.top + 10;
  const OFFER_BOTTOM = 32;

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % BANNERS.length;
        flatRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3500);
  };

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  const onScrollEnd = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(idx);
  };

  return (
    <View>
      <FlatList
        ref={flatRef}
        data={BANNERS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        onScrollBeginDrag={() => clearInterval(timerRef.current)}
        onMomentumScrollBegin={() => { clearInterval(timerRef.current); startTimer(); }}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <LinearGradient colors={item.colors} style={[styles.slide, { height: BANNER_HEIGHT }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.burstContainer} pointerEvents="none">
              {[...Array(8)].map((_, i) => (
                <View key={i} style={[styles.burstLine, { transform: [{ rotate: `${i * 45}deg` }] }]} />
              ))}
            </View>

            <Text style={[styles.emoji, { bottom: OFFER_BOTTOM + 20 }]}>{item.emoji}</Text>

            <View style={[styles.offerBlock, { bottom: OFFER_BOTTOM }]}>
              <Text style={styles.headline}>{item.headline}</Text>
              <Text style={styles.highlight}>{item.highlight}</Text>
              <Text style={styles.sub}>{item.sub}</Text>
              <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.85} onPress={() => onBannerPress && onBannerPress(item)}>
                <Text style={styles.ctaText}>{item.cta}  →</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        )}
      />

      <View style={[styles.overlay, { top: OVERLAY_TOP }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.addressRow} onPress={onAddressPress} activeOpacity={0.8}>
          <Ionicons name="location" size={16} color="#fff" style={styles.locationIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.deliveringTo}>Delivering to</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.addressText} numberOfLines={1}>{addressLabel || 'Set delivery location'}</Text>
              <Ionicons name="chevron-down" size={15} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.searchBar} onPress={onSearchPress} activeOpacity={0.9}>
          <Ionicons name="search" size={17} color={COLORS.darkTextSecondary} />
          <Text style={styles.searchPlaceholder}>Search for restaurants, dishes...</Text>
          <Ionicons name="mic-outline" size={17} color={COLORS.darkTextSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.dots}>
        {BANNERS.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { width: SCREEN_WIDTH, overflow: 'hidden' },
  burstContainer: { position: 'absolute', top: -60, right: -60, width: 280, height: 280, alignItems: 'center', justifyContent: 'center' },
  burstLine: { position: 'absolute', width: 2, height: 280, backgroundColor: 'rgba(255,255,255,0.07)' },
  emoji: { position: 'absolute', right: 16, fontSize: 82, opacity: 0.88 },
  offerBlock: { position: 'absolute', left: 20 },
  headline: { fontSize: 20, fontWeight: '900', color: 'rgba(255,255,255,0.88)', letterSpacing: 1.5, textTransform: 'uppercase' },
  highlight: {
    fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: -0.5, lineHeight: 44,
    textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 4,
  },
  sub: { fontSize: 11, color: 'rgba(255,255,255,0.78)', marginTop: 4, fontWeight: '500' },
  ctaBtn: { alignSelf: 'flex-start', backgroundColor: '#000', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 22, marginTop: 10 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  overlay: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, gap: 10 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  locationIcon: { textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  deliveringTo: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  addressText: {
    fontSize: 15, fontWeight: '800', color: '#fff', maxWidth: 230,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.darkCard, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderWidth: 1, borderColor: COLORS.darkBorder,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: COLORS.darkTextSecondary },

  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8, gap: 5, backgroundColor: COLORS.darkBg },
  dot: { height: 5, borderRadius: 3 },
  dotActive: { width: 18, backgroundColor: COLORS.primary },
  dotInactive: { width: 5, backgroundColor: COLORS.darkBorder },
});