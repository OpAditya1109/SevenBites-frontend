import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image,
  Modal, Animated, Dimensions, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RazorpayCheckout from 'react-native-razorpay';
import {
  COLORS, SPACING, PLATFORM_FEE, GST_RATE,
  FREE_DELIVERY_THRESHOLD, DEFAULT_DELIVERY_FEE, ACTIVE_ADDRESS_KEY,
  TESTING_ZERO_FEES,
} from '../utils/constants';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import {
  getRestaurantById, getDeliveryEstimate, getActiveCoupons, applyCoupon,
  createRazorpayOrder, verifyPaymentAndPlaceOrder,
} from '../services/api';
import { AppLoader, LOADING_MESSAGES, ButtonLoader } from '../components/AppLoader';
import StatusPopup from '../components/StatusPopup';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const isImageUrl = (val) => typeof val === 'string' && /^https?:\/\//.test(val);

const formatAddressString = (addr) => {
  if (!addr) return null;
  return [addr.flatNo, addr.street, addr.landmark, addr.city, addr.state, addr.pincode]
    .filter(Boolean)
    .join(', ');
};

export default function CartScreen({ navigation }) {
  const { items, totalItems, totalPrice, restaurantName, addItem, removeItem, clearCart, restaurantId } = useCart();
  const { user } = useAuth();

  const [restaurantMeta, setRestaurantMeta] = useState(null);
  const [activeAddress, setActiveAddress] = useState(null);
  const [eta, setEta] = useState(null);
  const [etaLoading, setEtaLoading] = useState(false);

  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [applyingCode, setApplyingCode] = useState(null);
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const [paying, setPaying] = useState(false);
  const [cancelledVisible, setCancelledVisible] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    getRestaurantById(restaurantId)
      .then((res) => setRestaurantMeta(res.data.data || res.data))
      .catch(() => setRestaurantMeta(null));
  }, [restaurantId]);

  const loadAddress = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(ACTIVE_ADDRESS_KEY);
      if (stored) setActiveAddress(JSON.parse(stored));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadAddress(); }, [loadAddress]);
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadAddress);
    return unsubscribe;
  }, [navigation, loadAddress]);

  useEffect(() => {
    if (!restaurantId || !activeAddress?.latitude || !activeAddress?.longitude) {
      setEta(null);
      return;
    }
    setEtaLoading(true);
    getDeliveryEstimate(restaurantId, activeAddress.latitude, activeAddress.longitude)
      .then((res) => setEta(res.data.data || res.data))
      .catch(() => setEta(null))
      .finally(() => setEtaLoading(false));
  }, [restaurantId, activeAddress?.latitude, activeAddress?.longitude]);

  useEffect(() => {
    if (!selectedCoupon) return;
    applyCoupon(selectedCoupon.code, restaurantId, totalPrice)
      .then((res) => {
        const data = res.data.data || res.data;
        setSelectedCoupon({ code: data.code, description: data.description, discountAmount: data.discountAmount });
      })
      .catch(() => setSelectedCoupon(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPrice]);

const baseDeliveryFee = TESTING_ZERO_FEES
    ? 0
    : (restaurantMeta?.deliveryFee > 0 ? restaurantMeta.deliveryFee : DEFAULT_DELIVERY_FEE);
  const isFreeDelivery = TESTING_ZERO_FEES || totalPrice >= FREE_DELIVERY_THRESHOLD;
  const deliveryFee = isFreeDelivery ? 0 : baseDeliveryFee;
  const platformFee = TESTING_ZERO_FEES ? 0 : PLATFORM_FEE;
  const gst = Math.round(totalPrice * GST_RATE);
  const discountAmount = selectedCoupon?.discountAmount || 0;
  const toPay = Math.max(0, totalPrice + deliveryFee + platformFee + gst - discountAmount);
  const totalSavings = discountAmount + (isFreeDelivery ? baseDeliveryFee : 0);

  const openCouponModal = () => {
    setCouponModalVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    fetchCoupons();
  };

  const closeCouponModal = () => {
    Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true })
      .start(() => setCouponModalVisible(false));
  };

  const fetchCoupons = async () => {
    setCouponsLoading(true);
    try {
      const res = await getActiveCoupons(restaurantId, totalPrice);
      setCoupons(res.data.data || res.data || []);
    } catch {
      setCoupons([]);
    } finally {
      setCouponsLoading(false);
    }
  };

  const handleApplyCoupon = async (code) => {
    setApplyingCode(code);
    try {
      const res = await applyCoupon(code, restaurantId, totalPrice);
      const data = res.data.data || res.data;
      setSelectedCoupon({ code: data.code, description: data.description, discountAmount: data.discountAmount });
      closeCouponModal();
    } catch (err) {
      Alert.alert('Coupon not applied', err?.message || 'This coupon cannot be applied right now.');
    } finally {
      setApplyingCode(null);
    }
  };

  const removeCoupon = () => setSelectedCoupon(null);

  const changeAddress = () => {
    navigation.navigate('Address', {
      onSelect: async (addr) => {
        setActiveAddress(addr);
        await AsyncStorage.setItem(ACTIVE_ADDRESS_KEY, JSON.stringify(addr));
      },
    });
  };

  // ── Place order → straight to Razorpay, no separate checkout page ──
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
      totalAmount: toPay,
      itemTotal: totalPrice,
      deliveryFee,
      platformFee,
      gst,
      couponCode: selectedCoupon?.code || '',
      discountAmount,
      deliveryAddress: formatAddressString(activeAddress),
      addressId: activeAddress._id,
      // Real distance-based ETA already fetched above for the on-screen "Delivery in X mins"
      // row — attach it here too so OrderTrackingScreen shows the same real number instead
      // of the backend's generic "30-45 min" default.
      estimatedDeliveryTime: eta?.etaText || restaurantMeta?.deliveryTime,
    };

    setPaying(true);
    try {
      const rpRes = await createRazorpayOrder(toPay);
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
      if (err?.code === 0 || err?.description || err?.error) {
        setCancelledVisible(true);
      } else {
        Alert.alert('Payment Failed', err?.message || 'Could not complete payment. Please try again.');
      }
    } finally {
      setPaying(false);
    }
  };

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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Items</Text>
          {items.map((item) => (
            <View key={item._id} style={styles.cartItem}>
              <View style={styles.cartItemLeft}>
                {isImageUrl(item.image) ? (
                  <Image source={{ uri: item.image }} style={styles.cartItemImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.cartItemEmoji}>{item.image || '🍽️'}</Text>
                )}
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

        {!isFreeDelivery && (
          <View style={styles.deliveryNote}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.secondary} />
            <Text style={styles.deliveryNoteText}>
              Add ₹{Math.max(0, FREE_DELIVERY_THRESHOLD - Math.round(totalPrice))} more for free delivery!
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.etaRow}>
            <View style={styles.etaIconWrap}>
              <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              {etaLoading ? (
                <Text style={[styles.etaTitle, { color: COLORS.gray }]}>Calculating delivery time...</Text>
              ) : (
                <Text style={styles.etaTitle}>
                  Delivery in {eta?.etaText || restaurantMeta?.deliveryTime || '30-45 min'}
                </Text>
              )}
              {eta?.prepMinutes != null && eta?.travelMinutes != null && (
                <Text style={styles.etaSubtitle}>
                  {restaurantName} preparing ~{eta.prepMinutes} min · {eta.travelMinutes} min delivery
                  {eta.distanceKm != null ? ` · ${eta.distanceKm} km away` : ''}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.deliverAtRow}>
            <Ionicons name="location-outline" size={18} color={COLORS.gray} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.deliverAtLabel}>Delivering to</Text>
              {activeAddress ? (
                <Text style={styles.deliverAtText} numberOfLines={2}>
                  {activeAddress.type ? `${activeAddress.type} · ` : ''}{formatAddressString(activeAddress)}
                </Text>
              ) : (
                <Text style={styles.deliverAtMissing}>No address selected</Text>
              )}
            </View>
            <TouchableOpacity onPress={changeAddress}>
              <Text style={styles.changeText}>{activeAddress ? 'Change' : 'Add'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.deliverAtRow}>
            <Ionicons name="person-outline" size={18} color={COLORS.gray} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.deliverAtLabel}>Contact</Text>
              <Text style={styles.deliverAtText}>
                {user?.name || 'Add your name'}{user?.phone ? `  ·  ${user.phone}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {selectedCoupon ? (
          <View style={styles.appliedCouponRow}>
            <Ionicons name="pricetag" size={18} color={COLORS.green} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.appliedCouponCode}>{selectedCoupon.code} applied</Text>
              {!!selectedCoupon.description && (
                <Text style={styles.appliedCouponDesc} numberOfLines={1}>{selectedCoupon.description}</Text>
              )}
            </View>
            <Text style={styles.appliedCouponAmount}>− ₹{selectedCoupon.discountAmount}</Text>
            <TouchableOpacity onPress={removeCoupon} style={{ marginLeft: 10 }}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.couponRow} onPress={openCouponModal} activeOpacity={0.8}>
            <Ionicons name="pricetag-outline" size={18} color={COLORS.primary} />
            <Text style={styles.couponText}>View all coupons</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
          </TouchableOpacity>
        )}
        {selectedCoupon && (
          <TouchableOpacity style={styles.viewAllUnderApplied} onPress={openCouponModal}>
            <Text style={styles.viewAllUnderAppliedText}>View all coupons</Text>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill Summary</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{totalPrice.toFixed(0)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Partner Fee</Text>
            <Text style={[styles.billValue, isFreeDelivery && { color: COLORS.green }]}>
              {isFreeDelivery ? 'FREE' : `₹${deliveryFee}`}
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
              <Text style={[styles.billLabel, { color: COLORS.green }]}>Coupon Discount ({selectedCoupon.code})</Text>
              <Text style={[styles.billValue, { color: COLORS.green }]}>− ₹{discountAmount}</Text>
            </View>
          )}
          <View style={[styles.billRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>To Pay</Text>
            <Text style={styles.totalValue}>₹{toPay}</Text>
          </View>

          {totalSavings > 0 && (
            <View style={styles.savedBanner}>
              <Ionicons name="happy-outline" size={16} color={COLORS.green} />
              <Text style={styles.savedText}>You saved ₹{Math.round(totalSavings)} on this order!</Text>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.checkoutContainer}>
        {!activeAddress && (
          <Text style={styles.addressWarning}>⚠️ Please add a delivery address</Text>
        )}
        <TouchableOpacity
          style={[styles.checkoutBtn, (!activeAddress || paying) && { opacity: 0.6 }]}
          onPress={handlePlaceOrder}
          disabled={!activeAddress || paying}
        >
          {paying ? (
            <ButtonLoader label="Opening payment..." />
          ) : (
            <>
              <Text style={styles.checkoutText}>Place Order</Text>
              <Text style={styles.checkoutPrice}>₹{toPay}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {couponModalVisible && (
        <Modal transparent animationType="none" onRequestClose={closeCouponModal}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeCouponModal} />
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.sheetHandleRow}>
              <View style={styles.sheetHandle} />
            </View>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>All Coupons</Text>
              <TouchableOpacity onPress={closeCouponModal}>
                <Ionicons name="close" size={22} color={COLORS.black} />
              </TouchableOpacity>
            </View>

            {couponsLoading ? (
              <AppLoader messages={LOADING_MESSAGES.coupons} />
            ) : coupons.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 40 }}>🏷️</Text>
                <Text style={{ marginTop: 8, color: COLORS.gray, fontWeight: '600' }}>No coupons available right now</Text>
              </View>
            ) : (
              <FlatList
                data={coupons}
                keyExtractor={(c) => c._id}
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: SCREEN_HEIGHT * 0.6 }}
                contentContainerStyle={{ paddingBottom: 24 }}
                renderItem={({ item: c }) => (
                  <View style={[styles.couponCard, !c.eligible && styles.couponCardDisabled]}>
                    <View style={styles.couponCardIconWrap}>
                      <Ionicons name="pricetag" size={18} color={c.eligible ? COLORS.primary : COLORS.gray} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.couponCode, !c.eligible && { color: COLORS.gray }]}>{c.code}</Text>
                      <Text style={styles.couponDesc}>
                        {c.discountType === 'flat' ? `Flat ₹${c.discountValue} off` : `${c.discountValue}% off${c.maxDiscount ? ` up to ₹${c.maxDiscount}` : ''}`}
                        {c.minOrderValue > 0 ? ` on orders above ₹${c.minOrderValue}` : ''}
                      </Text>
                      {!!c.description && <Text style={styles.couponDesc}>{c.description}</Text>}
                      {!c.eligible && !!c.reason && <Text style={styles.couponReason}>{c.reason}</Text>}
                    </View>
                    <TouchableOpacity
                      style={[styles.applyBtn, !c.eligible && styles.applyBtnDisabled]}
                      disabled={!c.eligible || applyingCode === c.code}
                      onPress={() => handleApplyCoupon(c.code)}
                    >
                      {applyingCode === c.code ? (
                        <ButtonLoader label="Applying..." color={c.eligible ? '#fff' : COLORS.gray} />
                      ) : (
                        <Text style={[styles.applyBtnText, !c.eligible && { color: COLORS.gray }]}>Apply</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
            <View style={{ height: 16 }} />
          </Animated.View>
        </Modal>
      )}

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
  cartItemImage: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#f5f5f5' },
  cartItemName: { fontSize: 14, fontWeight: '600', color: COLORS.black, marginBottom: 2 },
  cartItemPrice: { fontSize: 13, color: COLORS.gray },
  counterRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 8, overflow: 'hidden' },
  counterBtn: { width: 30, height: 32, justifyContent: 'center', alignItems: 'center' },
  counterText: { width: 28, textAlign: 'center', fontSize: 14, fontWeight: '700', color: COLORS.primary },
  deliveryNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF8F0', marginHorizontal: 16, padding: 12, borderRadius: 10, marginBottom: 4 },
  deliveryNoteText: { fontSize: 13, color: COLORS.secondary, fontWeight: '600' },

  etaRow: { flexDirection: 'row', alignItems: 'center' },
  etaIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff5f5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  etaTitle: { fontSize: 15, fontWeight: '700', color: COLORS.black },
  etaSubtitle: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  deliverAtRow: { flexDirection: 'row', alignItems: 'flex-start' },
  deliverAtLabel: { fontSize: 12, color: COLORS.gray, fontWeight: '600', marginBottom: 2 },
  deliverAtText: { fontSize: 14, color: COLORS.black, fontWeight: '600', lineHeight: 19 },
  deliverAtMissing: { fontSize: 14, color: COLORS.secondary, fontWeight: '600' },
  changeText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  couponRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: 16, padding: 16, borderRadius: 16, gap: 10 },
  couponText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.primary },
  appliedCouponRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3FBF6', marginHorizontal: 16, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: COLORS.green + '40' },
  appliedCouponCode: { fontSize: 14, fontWeight: '700', color: COLORS.black },
  appliedCouponDesc: { fontSize: 12, color: COLORS.gray, marginTop: 1 },
  appliedCouponAmount: { fontSize: 14, fontWeight: '700', color: COLORS.green },
  viewAllUnderApplied: { alignSelf: 'flex-start', marginHorizontal: 16, marginTop: 8 },
  viewAllUnderAppliedText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  billLabel: { fontSize: 14, color: COLORS.gray },
  billValue: { fontSize: 14, fontWeight: '600', color: COLORS.black },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 8, paddingTop: 12 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.black },
  totalValue: { fontSize: 16, fontWeight: '800', color: COLORS.black },
  savedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3FBF6', borderRadius: 10, padding: 10, marginTop: 12 },
  savedText: { fontSize: 13, fontWeight: '700', color: COLORS.green },

  checkoutContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  addressWarning: { fontSize: 13, color: COLORS.warning, marginBottom: 8, textAlign: 'center', fontWeight: '600' },
  checkoutBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, alignItems: 'center', minHeight: 56 },
  checkoutText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  checkoutPrice: { color: '#fff', fontWeight: '800', fontSize: 16 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, maxHeight: SCREEN_HEIGHT * 0.85 },
  sheetHandleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  couponCard: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, padding: 14, marginTop: 12, gap: 10 },
  couponCardDisabled: { backgroundColor: '#FAFAFA', opacity: 0.7 },
  couponCardIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff5f5', justifyContent: 'center', alignItems: 'center' },
  couponCode: { fontSize: 15, fontWeight: '800', color: COLORS.black, letterSpacing: 0.5 },
  couponDesc: { fontSize: 12, color: COLORS.gray, marginTop: 2, lineHeight: 16 },
  couponReason: { fontSize: 12, color: COLORS.secondary, marginTop: 4, fontWeight: '600' },
  applyBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'center' },
  applyBtnDisabled: { backgroundColor: COLORS.lightGray },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});