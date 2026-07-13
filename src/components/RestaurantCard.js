import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

const isImageUrl = (val) => typeof val === 'string' && /^https?:\/\//.test(val);

function VegBadge({ isVeg }) {
  if (isVeg === undefined || isVeg === null) return null;
  const color = isVeg ? COLORS.vegGreen : COLORS.nonVegRed;
  return (
    <View style={[styles.vegBox, { borderColor: color }]}>
      <View style={[styles.vegDot, { backgroundColor: color }]} />
    </View>
  );
}

export default function RestaurantCard({ restaurant, onPress, cardWidth }) {
  const [isFav, setIsFav] = useState(false);
  const {
    name, cuisine, rating, totalRatings, deliveryTime, distance,
    priceForTwo, image, offer, discount, deliveryFee, isOpen,
    popular, isVeg, offerText,
  } = restaurant;

  const offerLabel = discount || offer;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        cardWidth ? { width: cardWidth, marginRight: 14, marginLeft: 0 } : null,
        !isOpen && styles.closedCard,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        {isImageUrl(image) ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <Text style={styles.emoji}>{image || '🍽️'}</Text>
        )}

        {!isOpen && (
          <View style={styles.closedOverlay}>
            <Text style={styles.closedText}>CLOSED</Text>
          </View>
        )}

        {/* top-left badges */}
        <View style={styles.topLeftBadges}>
          {offerLabel ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{offerLabel}</Text>
            </View>
          ) : null}
          {popular ? (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>🔥 POPULAR</Text>
            </View>
          ) : null}
        </View>

        {/* favorite */}
        <TouchableOpacity
          style={styles.favBtn}
          onPress={() => setIsFav(!isFav)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={16} color={isFav ? COLORS.primary : '#444'} />
        </TouchableOpacity>

        {/* bottom row */}
        <View style={styles.bottomRow}>
          {rating ? (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={11} color="#fff" />
              <Text style={styles.ratingText}>{rating}</Text>
              {totalRatings ? <Text style={styles.ratingCount}>({totalRatings}+)</Text> : null}
            </View>
          ) : <View />}
          {deliveryFee === 0 && (
            <View style={styles.freeDelivery}>
              <Ionicons name="flash" size={11} color="#fff" />
              <Text style={styles.freeDeliveryText}>FREE DELIVERY</Text>
            </View>
          )}
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <VegBadge isVeg={isVeg} />
        </View>

        <Text style={styles.cuisine} numberOfLines={1}>{(cuisine || []).join(', ')}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={COLORS.darkTextSecondary} />
            <Text style={styles.metaText}>
              {typeof deliveryTime === 'number' ? `${deliveryTime} min` : deliveryTime || '30-45 min'}
            </Text>
          </View>
          {distance ? (
            <>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.metaText}>{distance}</Text>
            </>
          ) : null}
          {priceForTwo ? (
            <>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.metaText}>₹{priceForTwo} for one</Text>
            </>
          ) : null}
        </View>

        {offerText ? (
          <View style={styles.offerStrip}>
            <Ionicons name="pricetag" size={12} color={COLORS.primary} />
            <Text style={styles.offerStripText} numberOfLines={1}>{offerText}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.darkCard, marginHorizontal: 16, marginBottom: 16,
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  closedCard: { opacity: 0.6 },
  imageContainer: { height: 170, backgroundColor: '#111113', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  image: { width: '100%', height: '100%' },
  emoji: { fontSize: 64 },
  closedOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  closedText: { color: '#fff', fontWeight: '800', fontSize: 18, letterSpacing: 2 },

  topLeftBadges: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 },
  discountBadge: { backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  discountText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  popularBadge: { backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  popularText: { color: '#fff', fontWeight: '700', fontSize: 11 },

  favBtn: {
    position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
  },

  bottomRow: { position: 'absolute', bottom: 10, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.green, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, gap: 3 },
  ratingText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  ratingCount: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
  freeDelivery: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  freeDeliveryText: { color: '#fff', fontWeight: '700', fontSize: 10, letterSpacing: 0.3 },

  info: { padding: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 },
  name: { fontSize: 17, fontWeight: '700', color: COLORS.white, flex: 1 },
  vegBox: { width: 15, height: 15, borderRadius: 3, borderWidth: 1.3, alignItems: 'center', justifyContent: 'center' },
  vegDot: { width: 7, height: 7, borderRadius: 3.5 },
  cuisine: { fontSize: 13, color: COLORS.darkTextSecondary, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: COLORS.darkTextSecondary },
  dot: { fontSize: 10, color: COLORS.darkBorder },

  offerStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.darkCardAlt,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginTop: 4, alignSelf: 'flex-start', maxWidth: '100%',
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  offerStripText: { color: COLORS.secondary, fontSize: 12, fontWeight: '600', flexShrink: 1 },
});