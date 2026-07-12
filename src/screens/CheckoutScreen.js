import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RazorpayCheckout from 'react-native-razorpay';
import { COLORS, ACTIVE_ADDRESS_KEY } from '../utils/constants';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createRazorpayOrder, verifyPaymentAndPlaceOrder } from '../services/api';
import { ButtonLoader } from '../components/AppLoader';
import StatusPopup from '../components/StatusPopup';

export default function CheckoutScreen({ route, navigation }) {
  const {
    grandTotal, deliveryFee, itemTotal, platformFee = 0, gst = 0,
    discountAmount = 0, couponCode = '', estimatedDeliveryTime,
  } = route.params;
  const { items, restaurantId, restaurantName, totalPrice, clearCart } = useCart();
  const { user } = useAuth();

  const billItemTotal = itemTotal ?? totalPrice;

  const [activeAddress, setActiveAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelledVisible, setCancelledVisible] = useState(false);

  useEffect(() => {
    loadAddress();
  }, []);

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

  const formatAddressString = (addr) => {
    if (!addr) return null;
    return [addr.flatNo, addr.street, addr.landmark, addr.city, addr.state, addr.pincode]
      .filter(Boolean)
      .join(', ');
  };

  const addressLabel = formatAddressString(activeAddress);

  const changeAddress = () => {
    navigation.navigate('Address', {
      onSelect: async (addr) => {
        setActiveAddress(addr);
        await AsyncStorage.setItem(ACTIVE_ADDRESS_KEY, JSON.stringify(addr));
      },
    });
  };

  // ── Place order → straight to Razorpay, no in-app method picker ──
  // Razorpay's own checkout already lists UPI / cards / wallets / netbanking,
  // so we don't ask the user to pick a method twice.
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
      itemTotal: billItemTotal,
      deliveryFee,
      platformFee,
      gst,
      couponCode,
      discountAmount,
      deliveryAddress: addressLabel,
      addressId: activeAddress._id,
      // NEW — needed so the order-tracking screen can render a real map
      deliveryLatitude: activeAddress.latitude ?? null,
      deliveryLongitude: activeAddress.longitude ?? null,
    };

    await payWithRazorpay(orderData);
  };

  const payWithRazorpay = async (orderData) => {
    setLoading(true);
    try {
      const rpRes = await createRazorpayOrder(grandTotal);
      const rpOrder = rpRes.data.data || rpRes.data;

      const options = {
        key: rpOrder.keyId,
        amount: rpOrder.amount,
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

      const paymentResult = await RazorpayCheckout.open(options);

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
      // Cancel/dismiss from Razorpay → popup instead of a generic error alert
      if (err?.code === 0 || err?.description || err?.error) {
        setCancelledVisible(true);
      } else {
        Alert.alert('Payment Failed', err?.message || 'Could not complete payment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="restaurant" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{restaurantName}</Text>
            {!!estimatedDeliveryTime && (
              <Text style={styles.etaBadge}>⏱ {estimatedDeliveryTime}</Text>
            )}
          </View>
          {items.map((item) => (
            <View key={item._id} style={styles.orderItem}>
              <Text style={styles.orderItemQty}>{item.quantity}x</Text>
              <Text style={styles.orderItemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.orderItemPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
            </View>
          ))}
        </View>

        {/* No in-app payment method picker — Razorpay's own checkout
            already lists UPI / cards / wallets / netbanking. */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Payment</Text>
          </View>
          <Text style={styles.paymentHint}>
            You'll choose UPI, card, or any other option on the next screen.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Bill Summary</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{billItemTotal.toFixed(0)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Partner Fee</Text>
            <Text style={[styles.billValue, deliveryFee === 0 && { color: COLORS.green }]}>
              {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
            </Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Platform Fee</Text>
            <Text style={styles.billValue}>₹{platformFee}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>GST</Text>
            <Text style={styles.billValue}>₹{gst}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: COLORS.green }]}>Coupon Discount ({couponCode})</Text>
              <Text style={[styles.billValue, { color: COLORS.green }]}>− ₹{discountAmount}</Text>
            </View>
          )}
          <View style={[styles.billRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>To Pay</Text>
            <Text style={styles.totalValue}>₹{grandTotal}</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

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
            <ButtonLoader label="Opening payment..." />
          ) : (
            <>
              <Text style={styles.placeOrderText}>Place Order</Text>
              <Text style={styles.placeOrderPrice}>₹{grandTotal}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <StatusPopup
        visible={cancelledVisible}
        icon="🛑"
        title="Order Cancelled"
        message="You closed the payment screen before it finished. Your cart is safe — try again whenever you're ready."
        primaryLabel="Try Again"
        onPrimary={() => { setCancelledVisible(false); handlePlaceOrder(); }}
        secondaryLabel="Go Back"
        onSecondary={() => setCancelledVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  section: { backgroundColor: COLORS.white, margin: 16, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.black, flexShrink: 1 },
  etaBadge: { marginLeft: 'auto', fontSize: 12, fontWeight: '700', color: COLORS.primary, backgroundColor: '#fff5f5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
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
  paymentHint: { fontSize: 13, color: COLORS.gray },
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