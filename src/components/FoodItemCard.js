import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

const isImageUrl = (val) => typeof val === 'string' && /^https?:\/\//.test(val);

export default function FoodItemCard({ item, quantity, onAdd, onRemove }) {
  return (
    <View style={[styles.card, !item.inStock && styles.outOfStock]}>
      <View style={styles.left}>
        {/* Veg/Non-veg badge */}
        <View style={[styles.vegBadge, !item.isVeg && styles.nonVegBadge]}>
          <View style={[styles.vegDot, !item.isVeg && styles.nonVegDot]} />
        </View>

        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>₹{item.price}</Text>
        {item.rating && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color={COLORS.rating} />
            <Text style={styles.rating}>{item.rating}</Text>
          </View>
        )}
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        )}
        {!item.inStock && <Text style={styles.outOfStockText}>Out of Stock</Text>}
      </View>

      <View style={styles.right}>
        <View style={styles.imageBox}>
          {isImageUrl(item.image) ? (
            <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
          ) : (
            <Text style={styles.emoji}>{item.image || '🍽️'}</Text>
          )}
        </View>
        {item.inStock && (
          quantity === 0 ? (
            <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
              <Text style={styles.addBtnText}>ADD</Text>
              <Ionicons name="add" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.counterRow}>
              <TouchableOpacity style={styles.counterBtn} onPress={onRemove}>
                <Ionicons name="remove" size={16} color={COLORS.primary} />
              </TouchableOpacity>
              <Text style={styles.counterText}>{quantity}</Text>
              <TouchableOpacity style={styles.counterBtn} onPress={onAdd}>
                <Ionicons name="add" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'flex-start' },
  outOfStock: { opacity: 0.6 },
  left: { flex: 1, marginRight: 16 },
  vegBadge: { width: 16, height: 16, borderWidth: 1.5, borderColor: COLORS.green, borderRadius: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  nonVegBadge: { borderColor: '#B91C1C' },
  vegDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green },
  nonVegDot: { backgroundColor: '#B91C1C' },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.black, marginBottom: 4 },
  price: { fontSize: 15, fontWeight: '700', color: COLORS.black, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  rating: { fontSize: 12, color: COLORS.gray, fontWeight: '600' },
  description: { fontSize: 12, color: COLORS.gray, lineHeight: 18 },
  outOfStockText: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 6 },
  right: { alignItems: 'center', gap: 8 },
  imageBox: { width: 100, height: 80, backgroundColor: '#f5f5f5', borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  itemImage: { width: '100%', height: '100%' },
  emoji: { fontSize: 36 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, gap: 2 },
  addBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  counterRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 8, overflow: 'hidden' },
  counterBtn: { width: 30, height: 32, justifyContent: 'center', alignItems: 'center' },
  counterText: { width: 28, textAlign: 'center', fontSize: 14, fontWeight: '700', color: COLORS.primary },
});