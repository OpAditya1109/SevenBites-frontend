import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../utils/constants';
import { useCart } from '../context/CartContext';

export default function CartScreen({ navigation }) {
  const { items, totalItems, totalPrice, restaurantName, addItem, removeItem, clearCart, restaurantId } = useCart();

  const deliveryFee = totalPrice >= 299 ? 0 : 49;
  const taxes = Math.round(totalPrice * 0.05);
  const grandTotal = totalPrice + deliveryFee + taxes;

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cart</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add items from a restaurant to get started</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.browseBtnText}>Browse Restaurants</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Cart</Text>
          <Text style={styles.headerSubtitle}>{restaurantName}</Text>
        </View>
        <TouchableOpacity onPress={() => Alert.alert('Clear Cart', 'Remove all items?', [{ text: 'Cancel' }, { text: 'Clear', style: 'destructive', onPress: clearCart }])}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Items</Text>
          {items.map((item) => (
            <View key={item._id} style={styles.cartItem}>
              <View style={styles.cartItemLeft}>
                <Text style={styles.cartItemEmoji}>{item.image}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
                </View>
              </View>
              <View style={styles.counterRow}>
                <TouchableOpacity style={styles.counterBtn} onPress={() => removeItem(item._id)}>
                  <Ionicons name="remove" size={16} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.counterText}>{item.quantity}</Text>
                <TouchableOpacity style={styles.counterBtn} onPress={() => addItem(item, restaurantId, restaurantName)}>
                  <Ionicons name="add" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Delivery note */}
        {totalPrice < 299 && (
          <View style={styles.deliveryNote}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.secondary} />
            <Text style={styles.deliveryNoteText}>
              Add ₹{299 - Math.round(totalPrice)} more for free delivery!
            </Text>
          </View>
        )}

        {/* Bill Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill Summary</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{totalPrice.toFixed(0)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={[styles.billValue, deliveryFee === 0 && { color: COLORS.green }]}>
              {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
            </Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Taxes & Charges</Text>
            <Text style={styles.billValue}>₹{taxes}</Text>
          </View>
          <View style={[styles.billRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalValue}>₹{grandTotal}</Text>
          </View>
        </View>

        {/* Coupon */}
        <View style={styles.couponRow}>
          <Ionicons name="pricetag-outline" size={18} color={COLORS.primary} />
          <Text style={styles.couponText}>Apply Coupon</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Checkout Button */}
      <View style={styles.checkoutContainer}>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => navigation.navigate('Checkout', { grandTotal, deliveryFee })}
        >
          <Text style={styles.checkoutText}>Proceed to Checkout</Text>
          <Text style={styles.checkoutPrice}>₹{grandTotal}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  headerSubtitle: { fontSize: 12, color: COLORS.gray },
  clearText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: COLORS.black },
  emptySubtitle: { fontSize: 14, color: COLORS.gray, textAlign: 'center' },
  browseBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 },
  browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  section: { backgroundColor: COLORS.white, margin: 16, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.black, marginBottom: 12 },
  cartItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cartItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  cartItemEmoji: { fontSize: 28 },
  cartItemName: { fontSize: 14, fontWeight: '600', color: COLORS.black, marginBottom: 2 },
  cartItemPrice: { fontSize: 13, color: COLORS.gray },
  counterRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 8, overflow: 'hidden' },
  counterBtn: { width: 30, height: 32, justifyContent: 'center', alignItems: 'center' },
  counterText: { width: 28, textAlign: 'center', fontSize: 14, fontWeight: '700', color: COLORS.primary },
  deliveryNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF8F0', marginHorizontal: 16, padding: 12, borderRadius: 10, marginBottom: 4 },
  deliveryNoteText: { fontSize: 13, color: COLORS.secondary, fontWeight: '600' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  billLabel: { fontSize: 14, color: COLORS.gray },
  billValue: { fontSize: 14, fontWeight: '600', color: COLORS.black },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 8, paddingTop: 12 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.black },
  totalValue: { fontSize: 16, fontWeight: '800', color: COLORS.black },
  couponRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: 16, padding: 16, borderRadius: 16, gap: 10 },
  couponText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.primary },
  checkoutContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  checkoutBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  checkoutText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  checkoutPrice: { color: '#fff', fontWeight: '800', fontSize: 16 },
});