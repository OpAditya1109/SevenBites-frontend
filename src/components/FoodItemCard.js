import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../utils/constants';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const isImageUrl = (val) => typeof val === 'string' && /^https?:\/\//.test(val);

export default function FoodItemCard({ item, quantity, onAdd, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const addBtnAnim = useRef(new Animated.Value(1)).current;

  const bumpScale = (val) => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.94, duration: 90, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  };

  const handleAdd = () => {
    bumpScale();
    // subtle "pop" on the button itself the first time it appears
    if (quantity === 0) {
      addBtnAnim.setValue(0.7);
      Animated.spring(addBtnAnim, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
    }
    onAdd();
  };

  const toggleExpand = () => {
    if (!item.description || item.description.length <= 60) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  const long = item.description && item.description.length > 60;

  return (
    <View style={[styles.card, !item.inStock && styles.outOfStock]}>
      <View style={styles.left}>
        <View style={styles.badgeRow}>
          <View style={[styles.vegBadge, { borderColor: item.isVeg ? COLORS.vegGreen : COLORS.nonVegRed }]}>
            <View style={[styles.vegDot, { backgroundColor: item.isVeg ? COLORS.vegGreen : COLORS.nonVegRed }]} />
          </View>
          {item.isBestseller && (
            <View style={styles.bestsellerBadge}>
              <Ionicons name="flame" size={10} color={COLORS.secondary} />
              <Text style={styles.bestsellerText}>Bestseller</Text>
            </View>
          )}
        </View>

        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>

        <View style={styles.priceRatingRow}>
          <Text style={styles.price}>₹{item.price}</Text>
          {item.rating ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={11} color={COLORS.rating} />
              <Text style={styles.rating}>{item.rating}</Text>
            </View>
          ) : null}
        </View>

        {item.description ? (
          <TouchableOpacity activeOpacity={long ? 0.6 : 1} onPress={toggleExpand}>
            <Text style={styles.description} numberOfLines={expanded ? undefined : 2}>
              {item.description}
            </Text>
            {long && (
              <Text style={styles.moreText}>{expanded ? 'Show less' : 'Read more'}</Text>
            )}
          </TouchableOpacity>
        ) : null}

        {!item.inStock && (
          <View style={styles.outOfStockPill}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
      </View>

      <View style={styles.right}>
        <View style={styles.imageBox}>
          {isImageUrl(item.image) ? (
            <>
              <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.35)']}
                style={styles.imageGradient}
              />
            </>
          ) : (
            <Text style={styles.emoji}>{item.image || '🍽️'}</Text>
          )}
          {!item.inStock && (
            <View style={styles.imageOverlay}>
              <Text style={styles.imageOverlayText}>Sold Out</Text>
            </View>
          )}
        </View>

        {item.inStock && (
          <Animated.View style={{ transform: [{ scale }] }}>
            {quantity === 0 ? (
              <Animated.View style={{ transform: [{ scale: addBtnAnim }] }}>
                <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.85}>
                  <Text style={styles.addBtnText}>ADD</Text>
                  <Ionicons name="add" size={14} color={COLORS.primary} />
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <View style={styles.counterRow}>
                <TouchableOpacity style={styles.counterBtn} onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="remove" size={16} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.counterText}>{quantity}</Text>
                <TouchableOpacity style={styles.counterBtn} onPress={handleAdd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="add" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        )}

        {item.isCustomizable && item.inStock && (
          <Text style={styles.customizableText}>Customizable</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.darkCard,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkBorder,
    alignItems: 'flex-start',
  },
  outOfStock: { opacity: 0.55 },
  left: { flex: 1, marginRight: 16 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  vegBadge: { width: 16, height: 16, borderWidth: 1.5, borderRadius: 3, justifyContent: 'center', alignItems: 'center' },
  vegDot: { width: 8, height: 8, borderRadius: 4 },
  bestsellerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(252,128,25,0.12)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  bestsellerText: { fontSize: 10, fontWeight: '700', color: COLORS.secondary },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.white, marginBottom: 6, lineHeight: 20 },
  priceRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  price: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontSize: 12, color: COLORS.darkTextSecondary, fontWeight: '600' },
  description: { fontSize: 12, color: COLORS.darkTextSecondary, lineHeight: 18 },
  moreText: { fontSize: 12, color: COLORS.secondary, fontWeight: '700', marginTop: 4 },
  outOfStockPill: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(226,55,68,0.12)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8,
  },
  outOfStockText: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  right: { alignItems: 'center', gap: 8, width: 108 },
  imageBox: {
    width: 108, height: 88, backgroundColor: COLORS.darkCardAlt, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.darkBorder, position: 'relative',
  },
  itemImage: { width: '100%', height: '100%' },
  imageGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  imageOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  imageOverlayText: { color: '#fff', fontWeight: '700', fontSize: 11, letterSpacing: 0.5 },
  emoji: { fontSize: 36 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.darkCard, borderWidth: 1.5, borderColor: COLORS.primary,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, gap: 2,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 2,
  },
  addBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  counterRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.darkCard,
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10, overflow: 'hidden',
  },
  counterBtn: { width: 32, height: 34, justifyContent: 'center', alignItems: 'center' },
  counterText: { width: 28, textAlign: 'center', fontSize: 14, fontWeight: '700', color: COLORS.primary },
  customizableText: { fontSize: 10, color: COLORS.darkTextSecondary, fontWeight: '600' },
});