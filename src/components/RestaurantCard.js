import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../utils/constants';

const isImageUrl = (val) => typeof val === 'string' && /^https?:\/\//.test(val);

export default function RestaurantCard({ restaurant, onPress }) {
  const { name, cuisine, rating, deliveryTime, minOrder, deliveryFee, image, offer, discount, priceForTwo, isOpen, totalRatings } = restaurant;
  const offerLabel = discount || offer;

  return (
    <TouchableOpacity style={[styles.card, !isOpen && styles.closedCard]} onPress={onPress} activeOpacity={0.85}>
      {/* Image placeholder */}
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
        {offerLabel && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{offerLabel}</Text>
          </View>
        )}
        {deliveryFee === 0 && (
          <View style={styles.freeDelivery}>
            <Text style={styles.freeDeliveryText}>Free Delivery</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#fff" />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        </View>

        <Text style={styles.cuisine} numberOfLines={1}>{(cuisine || []).join(', ')}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={COLORS.gray} />
            <Text style={styles.metaText}>
                {typeof deliveryTime === 'number' ? `${deliveryTime} mins` : deliveryTime || '30-45 min'}
              </Text>
          </View>
          <Text style={styles.dot}>•</Text>
          {priceForTwo ? <Text style={styles.metaText}>₹{priceForTwo} for two</Text> : null}
          {priceForTwo ? <Text style={styles.dot}>•</Text> : null}
          <Text style={styles.metaText}>
            {deliveryFee === 0 ? '🛵 Free' : `₹${deliveryFee} delivery`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  closedCard: { opacity: 0.7 },
  imageContainer: { height: 160, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  image: { width: '100%', height: '100%' },
  emoji: { fontSize: 64 },
  closedOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  closedText: { color: '#fff', fontWeight: '800', fontSize: 18, letterSpacing: 2 },
  discountBadge: { position: 'absolute', bottom: 10, left: 12, backgroundColor: COLORS.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  discountText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  freeDelivery: { position: 'absolute', bottom: 10, right: 12, backgroundColor: COLORS.green, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  freeDeliveryText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  info: { padding: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 17, fontWeight: '700', color: COLORS.black, flex: 1, marginRight: 8 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.green, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, gap: 3 },
  ratingText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cuisine: { fontSize: 13, color: COLORS.gray, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: COLORS.gray },
  dot: { fontSize: 10, color: COLORS.placeholder },
});