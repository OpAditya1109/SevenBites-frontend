import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RazorpayCheckout from 'react-native-razorpay';
import { COLORS } from '../utils/constants';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { placeOrder, createRazorpayOrder, verifyPaymentAndPlaceOrder } from '../services/api';

const ACTIVE_ADDRESS_KEY = 'sevenbites_active_address';

const PAYMENT_METHODS = [
  { id: 'upi',    label: 'UPI / GPay / PhonePe',  icon: '📱' },
  { id: 'card',   label: 'Credit / Debit Card',    icon: '💳' },
  { id: 'cod',    label: 'Cash on Delivery',       icon: '💵' },
  { id: 'wallet', label: 'Sevenbites Wallet',          icon: '👝' },
];

export default function CheckoutScreen({ route, navigation }) {
  const { grandTotal, deliveryFee } = route.params;
  const { items, restaurantId, restaurantName, totalPrice, clearCart } = useCart();
  const { user } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [activeAddress, setActiveAddress] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Load active address from AsyncStorage on mount ────────────
  useEffect(() => {
    loadAddress();
  }, []);

  // ── Also reload when screen comes back into focus (user changed address) ──
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadAddress);
    return unsubscribe;
  }, [navigation]);

  const loadAddress = async () => {
    try {
      const stored = await AsyncStorage.getItem(ACTIVE_ADDRESS_KEY);
      if (stored) setActiveAddress(JSON.parse(stored));
    } catch { /* silent */ }
  };

  // ── Format address object → readable string for DB ───────────
  const formatAddressString = (addr) => {
    if (!addr) return null;
    return [addr.flatNo, addr.street, addr.landmark, addr.city, addr.state, addr.pincode]
      .filter(Boolean)
      .join(', ');
  };

  const addressLabel = formatAddressString(activeAddress);

  // ── Open address picker in selection mode ─────────────────────
  const changeAddress = () => {
    navigation.navigate('Address', {
      onSelect: async (addr) => {
        setActiveAddress(addr);
        await AsyncStorage.setItem(ACTIVE_ADDRESS_KEY, JSON.stringify(addr));
      },
    });
  };

  // ── Place order ───────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!activeAddress) {
      Alert.alert('No Address', 'Please select a delivery address before placing your order.');
      return;
    }

    const orderData = {
      restaurantId,
      items: items.map((i) => ({
        menuItemId: i._id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
      totalAmount: grandTotal,
      deliveryFee,
      paymentMethod,
      // Backend Order model stores deliveryAddress as a string
      deliveryAddress: addressLabel,
      // Also send addressId for reference (optional, doesn't break anything if backend ignores it)
      addressId: activeAddress._id,
    };

    if (paymentMethod === 'cod') {
      await placeCodOrder(orderData);
    } else {
      await payWithRazorpay(orderData);
    }
  };

  // ── Cash on Delivery — straight to order creation, no gateway ──
  const placeCodOrder = async (orderData) => {
    setLoading(true);
    try {
      const res = await placeOrder(orderData);
      const order = res.data.data || res.data;
      clearCart();
      navigation.replace('OrderTracking', { orderId: order._id });
    } catch (err) {
      Alert.alert('Order Failed', err?.message || 'Could not place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── UPI / Card / Wallet — real Razorpay checkout ────────────────
  const payWithRazorpay = async (orderData) => {
    setLoading(true);
    try {
      // Step 1: ask our backend to create a Razorpay order for this amount
      const rpRes = await createRazorpayOrder(grandTotal);
      const rpOrder = rpRes.data.data || rpRes.data;

      const options = {
        key: rpOrder.keyId,
        amount: rpOrder.amount, // paise, from backend
        currency: rpOrder.currency || 'INR',
        name: 'SevenBites',
        description: `Order from ${restaurantName}`,
        order_id: rpOrder.orderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: COLORS.primary },
      };

      // Step 2: open the actual Razorpay checkout widget
      const paymentResult = await RazorpayCheckout.open(options);

      // Step 3: verify the signature on our backend and only then save the order
      const verifyRes = await verifyPaymentAndPlaceOrder({
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
        orderData,
      });
      const order = verifyRes.data.data || verifyRes.data;

      clearCart();
      navigation.replace('OrderTracking', { orderId: order._id });
    } catch (err) {
      // RazorpayCheckout.open() rejects with { code, description } when the
      // user cancels or the payment fails — don't treat that as a server error.
      if (err?.code === 0 || err?.description || err?.error) {
        Alert.alert('Payment Cancelled', err?.description || 'Payment was not completed.');
      } else {
        Alert.alert('Payment Failed', err?.message || 'Could not complete payment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Delivery Address ──────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>

          {activeAddress ? (
            <View style={styles.addressBlock}>
              <View style={styles.addressTypeRow}>
                <Ionicons
                  name={activeAddress.type === 'Work' ? 'briefcase' : activeAddress.type === 'Other' ? 'location' : 'home'}
                  size={14}
                  color={COLORS.primary}
                />
                <Text style={styles.addressType}>{activeAddress.type || 'Home'}</Text>
              </View>
              <Text style={styles.addressText}>{addressLabel}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.noAddressBtn} onPress={changeAddress}>
              <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.noAddressText}>Add a delivery address</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.changeBtn} onPress={changeAddress}>
            <Text style={styles.changeBtnText}>{activeAddress ? 'Change' : 'Select Address'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Order Summary ─────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="restaurant" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{restaurantName}</Text>
          </View>
          {items.map((item) => (
            <View key={item._id} style={styles.orderItem}>
              <Text style={styles.orderItemQty}>{item.quantity}x</Text>
              <Text style={styles.orderItemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.orderItemPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
            </View>
          ))}
        </View>

        {/* ── Payment Method ────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>
          {PAYMENT_METHODS.map((pm) => (
            <TouchableOpacity
              key={pm.id}
              style={[styles.paymentOption, paymentMethod === pm.id && styles.selectedPayment]}
              onPress={() => setPaymentMethod(pm.id)}
            >
              <Text style={styles.paymentIcon}>{pm.icon}</Text>
              <Text style={styles.paymentLabel}>{pm.label}</Text>
              <View style={[styles.radio, paymentMethod === pm.id && styles.radioSelected]}>
                {paymentMethod === pm.id && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Bill Summary ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Bill Summary</Text>
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
            <Text style={styles.billLabel}>Taxes & Charges (5%)</Text>
            <Text style={styles.billValue}>₹{Math.round(totalPrice * 0.05)}</Text>
          </View>
          <View style={[styles.billRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{grandTotal}</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <View style={styles.footer}>
        {!activeAddress && (
          <Text style={styles.addressWarning}>⚠️ Please add a delivery address</Text>
        )}
        <TouchableOpacity
          style={[styles.placeOrderBtn, (!activeAddress || loading) && { opacity: 0.6 }]}
          onPress={handlePlaceOrder}
          disabled={loading || !activeAddress}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.placeOrderText}>Place Order</Text>
              <Text style={styles.placeOrderPrice}>₹{grandTotal}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  section: { backgroundColor: COLORS.white, margin: 16, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.black },
  addressBlock: { gap: 4, marginBottom: 8 },
  addressTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressType: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  addressText: { fontSize: 14, color: COLORS.darkGray, lineHeight: 22 },
  noAddressBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  noAddressText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  changeBtn: { alignSelf: 'flex-start', marginTop: 4 },
  changeBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  orderItemQty: { fontSize: 13, fontWeight: '700', color: COLORS.gray, width: 24 },
  orderItemName: { flex: 1, fontSize: 14, color: COLORS.black },
  orderItemPrice: { fontSize: 14, fontWeight: '600', color: COLORS.black },
  paymentOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, marginBottom: 8, gap: 12 },
  selectedPayment: { borderColor: COLORS.primary, backgroundColor: '#fff5f5' },
  paymentIcon: { fontSize: 20 },
  paymentLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.black },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  radioSelected: { borderColor: COLORS.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  billLabel: { fontSize: 14, color: COLORS.gray },
  billValue: { fontSize: 14, fontWeight: '600', color: COLORS.black },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 6, paddingTop: 12 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.black },
  totalValue: { fontSize: 16, fontWeight: '800', color: COLORS.black },
  footer: { padding: 16, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  addressWarning: { fontSize: 13, color: COLORS.warning, marginBottom: 8, textAlign: 'center', fontWeight: '600' },
  placeOrderBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, alignItems: 'center', minHeight: 56 },
  placeOrderText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  placeOrderPrice: { color: '#fff', fontWeight: '800', fontSize: 16 },
});