import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image,
  Modal, Animated, Dimensions, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RazorpayCheckout from 'react-native-razorpay';
import { COLORS, ACTIVE_ADDRESS_KEY } from '../utils/constants';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import {
  getRestaurantById, getDeliveryEstimate, getActiveCoupons, applyCoupon,
  createRazorpayOrder, verifyPaymentAndPlaceOrder, getUserAddresses,
  getActivePricingConfig, calculateCharges,
} from '../services/api';
import { useOrderTracking } from '../context/OrderTrackingProvider';
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
const { setActiveOrderId } = useOrderTracking();
  const [restaurantMeta, setRestaurantMeta] = useState(null);
  const [activeAddress, setActiveAddress] = useState(null);
  const [eta, setEta] = useState(null);
  const [etaLoading, setEtaLoading] = useState(false);

  // Admin-configurable thresholds, fetched once — used for the "add ₹X more"
  // progress banner. The actual fee breakdown comes from `charges` below.
  const [pricingConfig, setPricingConfig] = useState(null);

  // Live fee breakdown from the backend, recalculated whenever order value or
  // distance changes. This — not any local constant — is what gets charged.
  const [charges, setCharges] = useState(null);
  const [chargesLoading, setChargesLoading] = useState(false);

  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [applyingCode, setApplyingCode] = useState(null);
  const [bestCoupon, setBestCoupon] = useState(null);
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const [paying, setPaying] = useState(false);
  const [cancelledVisible, setCancelledVisible] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    getRestaurantById(restaurantId)
      .then((res) => setRestaurantMeta(res.data.data || res.data))
      .catch(() => setRestaurantMeta(null));
  }, [restaurantId]);

  useEffect(() => {
    getActivePricingConfig()
      .then((res) => setPricingConfig(res.data.data || res.data))
      .catch(() => setPricingConfig(null));
  }, []);

  const loadAddress = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(ACTIVE_ADDRESS_KEY);
      if (!stored) return;
      const cached = JSON.parse(stored);
      setActiveAddress(cached);

      if (cached?._id) {
        try {
          const res = await getUserAddresses();
          const fresh = (res.data.data || res.data || []).find((a) => a._id === cached._id);
          if (fresh && (fresh.latitude !== cached.latitude || fresh.longitude !== cached.longitude)) {
            setActiveAddress(fresh);
            await AsyncStorage.setItem(ACTIVE_ADDRESS_KEY, JSON.stringify(fresh));
          }
        } catch {
          // keep cached address if refresh fails
        }
      }
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

  // Recompute the fee breakdown from the backend whenever order value or
  // distance changes. This is the ONLY place fees get calculated — nothing
  // here is hardcoded, it all comes from PricingConfig via this call.
  useEffect(() => {
    if (!totalPrice || totalPrice <= 0) {
      setCharges(null);
      return;
    }
    setChargesLoading(true);
    calculateCharges(totalPrice, eta?.distanceKm ?? null)
      .then((res) => setCharges(res.data.data || res.data))
      .catch(() => setCharges(null))
      .finally(() => setChargesLoading(false));
  }, [totalPrice, eta?.distanceKm]);

  // Fetch the single best available coupon up-front so it can be surfaced
  // as an inline nudge, instead of making the person open a modal to discover it.
  useEffect(() => {
    if (!restaurantId || selectedCoupon) { setBestCoupon(null); return; }
    getActiveCoupons(restaurantId, totalPrice)
      .then((res) => {
        const list = res.data.data || res.data || [];
        const eligible = list.filter((c) => c.eligible);
        if (!eligible.length) { setBestCoupon(null); return; }
        const best = eligible.reduce((a, b) => {
          const av = a.discountType === 'flat' ? a.discountValue : Math.min(a.maxDiscount || Infinity, totalPrice * a.discountValue / 100);
          const bv = b.discountType === 'flat' ? b.discountValue : Math.min(b.maxDiscount || Infinity, totalPrice * b.discountValue / 100);
          return bv > av ? b : a;
        });
        setBestCoupon(best);
      })
      .catch(() => setBestCoupon(null));
  }, [restaurantId, totalPrice, selectedCoupon]);

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

  // Derived bill values — all sourced from `charges` (backend), never local constants.
  const deliveryFee = charges?.deliveryFee ?? 0;
  const platformFee = charges?.platformFee ?? 0;
  const gst = charges?.gst ?? 0;
  const gstRatePercent = charges?.gstRatePercent ?? null;
  const isFreeDelivery = charges?.isFreeDelivery ?? false;
  const deliveryFeeHint = eta?.distanceKm != null       // NEW
  ? `Based on ${eta.distanceKm} km distance`
  : 'Calculated at checkout';

  const discountAmount = selectedCoupon?.discountAmount || 0;
  const toPay = charges ? Math.max(0, charges.total - discountAmount) : 0;
  const totalSavings = discountAmount; // delivery-fee "savings" isn't a fixed baseline anymore under distance-based pricing
  const lowOrderThreshold = pricingConfig?.lowOrderValueThreshold ?? 99;
  const isAboveLowOrderThreshold = totalPrice >= lowOrderThreshold;
  const freeDeliveryProgress = Math.min(1, totalPrice / lowOrderThreshold);

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

  const handlePlaceOrder = async () => {
    if (!activeAddress) {
      Alert.alert('No Address', 'Please select a delivery address before placing your order.');
      return;
    }
    if (!charges) {
      Alert.alert('Please wait', 'Still calculating delivery charges — try again in a moment.');
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
      gstRatePercent,
      distanceKm: eta?.distanceKm ?? null,
      couponCode: selectedCoupon?.code || '',
      discountAmount,
      deliveryAddress: formatAddressString(activeAddress),
      addressId: activeAddress._id,
      deliveryLatitude: activeAddress.latitude ?? null,
      deliveryLongitude: activeAddress.longitude ?? null,
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
            await setActiveOrderId(order._id);

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
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cart</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cart-outline" size={44} color={COLORS.darkTextSecondary} />
          </View>
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
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
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
        {/* Free-delivery progress — visual nudge to add one more item */}
        {!isAboveLowOrderThreshold && (
          <View style={styles.progressBanner}>
            <View style={styles.progressBannerTop}>
              <Ionicons name="bicycle" size={15} color={COLORS.secondary} />
              <Text style={styles.progressBannerText}>
                Add ₹{Math.max(0, Math.round(lowOrderThreshold - totalPrice))} more for FREE delivery
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${freeDeliveryProgress * 100}%` }]} />
            </View>
          </View>
        )}

        {/* Delivery ETA + address — moved above items so intent to buy is confirmed early */}
        <View style={styles.section}>
          <View style={styles.etaRow}>
            <View style={styles.etaIconWrap}>
              <Ionicons name="time-outline" size={20} color={COLORS.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              {etaLoading ? (
                <Text style={[styles.etaTitle, { color: COLORS.darkTextSecondary }]}>Calculating delivery time...</Text>
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
            <Ionicons name="location-outline" size={18} color={COLORS.darkTextSecondary} style={{ marginTop: 2 }} />
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
            <Ionicons name="person-outline" size={18} color={COLORS.darkTextSecondary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.deliverAtLabel}>Contact</Text>
              <Text style={styles.deliverAtText}>
                {user?.name || 'Add your name'}{user?.phone ? `  ·  ${user.phone}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Items</Text>
          {items.map((item) => (
            <View key={item._id} style={styles.cartItem}>
              <View style={styles.cartItemLeft}>
                {isImageUrl(item.image) ? (
                  <Image source={{ uri: item.image }} style={styles.cartItemImage} resizeMode="cover" />
                ) : (
                  <View style={styles.cartItemEmojiWrap}>
                    <Text style={styles.cartItemEmoji}>{item.image || '🍽️'}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
                </View>
              </View>
              <View style={styles.counterRow}>
                <TouchableOpacity style={styles.counterBtn} onPress={() => removeItem(item._id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="remove" size={16} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.counterText}>{item.quantity}</Text>
                <TouchableOpacity style={styles.counterBtn} onPress={() => addItem(item, restaurantId, restaurantName)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="add" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addMoreBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="add-circle-outline" size={16} color={COLORS.secondary} />
            <Text style={styles.addMoreText}>Add more items</Text>
          </TouchableOpacity>
        </View>

        {/* Coupon */}
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
              <Ionicons name="close-circle" size={20} color={COLORS.darkTextSecondary} />
            </TouchableOpacity>
          </View>
        ) : bestCoupon ? (
          <TouchableOpacity style={styles.bestCouponRow} onPress={openCouponModal} activeOpacity={0.85}>
            <View style={styles.bestCouponIconWrap}>
              <Ionicons name="pricetag" size={16} color={COLORS.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bestCouponCode}>Use {bestCoupon.code}</Text>
              <Text style={styles.bestCouponDesc} numberOfLines={1}>
                {bestCoupon.discountType === 'flat'
                  ? `Flat ₹${bestCoupon.discountValue} off`
                  : `${bestCoupon.discountValue}% off${bestCoupon.maxDiscount ? ` up to ₹${bestCoupon.maxDiscount}` : ''}`}
              </Text>
            </View>
            <View style={styles.bestCouponApplyBtn}>
              <Text style={styles.bestCouponApplyText}>Apply</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.couponRow} onPress={openCouponModal} activeOpacity={0.8}>
            <Ionicons name="pricetag-outline" size={18} color={COLORS.primary} />
            <Text style={styles.couponText}>View all coupons</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.darkTextSecondary} />
          </TouchableOpacity>
        )}
        {selectedCoupon && (
          <TouchableOpacity style={styles.viewAllUnderApplied} onPress={openCouponModal}>
            <Text style={styles.viewAllUnderAppliedText}>View all coupons</Text>
          </TouchableOpacity>
        )}

        {/* Bill */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill Summary</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{totalPrice.toFixed(0)}</Text>
          </View>

          {chargesLoading && !charges ? (
            <Text style={styles.calculatingText}>Calculating delivery charges...</Text>
          ) : (
            <>
           <View style={styles.billRow}>
  <View style={{ flex: 1 }}>
    <Text style={styles.billLabel}>Delivery Partner Fee</Text>
    <Text style={styles.billHint}>{deliveryFeeHint}</Text>
  </View>
  <Text style={[styles.billValue, isFreeDelivery && { color: COLORS.green }]}>
    {isFreeDelivery ? 'FREE' : `₹${deliveryFee}`}
  </Text>
</View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Platform Fee</Text>
                <Text style={styles.billValue}>₹{platformFee}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>GST{gstRatePercent != null ? ` (${gstRatePercent}%)` : ''}</Text>
                <Text style={styles.billValue}>₹{gst}</Text>
              </View>
            </>
          )}

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
{/* Cancellation Policy */}
        <View style={styles.policyRow}>
          <Ionicons name="alert-circle-outline" size={16} color={COLORS.secondary} />
          <Text style={styles.policyText}>
            <Text style={styles.policyTextBold}>Cancellation Policy: </Text>
            100% cancellation charges will apply once the order is placed. This order cannot be cancelled after confirmation.
          </Text>
        </View>
        {/* Trust strip — reduces last-second payment-page abandonment */}
        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.darkTextSecondary} />
            <Text style={styles.trustText}>100% Secure</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Ionicons name="refresh-outline" size={16} color={COLORS.darkTextSecondary} />
            <Text style={styles.trustText}>Easy Refunds</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Ionicons name="card-outline" size={16} color={COLORS.darkTextSecondary} />
            <Text style={styles.trustText}>Razorpay</Text>
          </View>
        </View>

        <View style={{ height: 130 }} />
      </ScrollView>

      <View style={styles.checkoutContainer}>
        {!activeAddress && (
          <View style={styles.addressWarningRow}>
            <Ionicons name="alert-circle" size={14} color={COLORS.secondary} />
            <Text style={styles.addressWarning}>Please add a delivery address</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.checkoutBtn, (!activeAddress || paying || !charges) && { opacity: 0.6 }]}
          onPress={handlePlaceOrder}
          disabled={!activeAddress || paying || !charges}
          activeOpacity={0.9}
        >
          {paying ? (
            <ButtonLoader label="Opening payment..." />
          ) : (
            <>
              <View>
                <Text style={styles.checkoutText}>Place Order</Text>
                {totalSavings > 0 && (
                  <Text style={styles.checkoutSavedText}>Saved ₹{Math.round(totalSavings)}</Text>
                )}
              </View>
              <View style={styles.checkoutPriceRow}>
                <Text style={styles.checkoutPrice}>₹{toPay}</Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </View>
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
                <Ionicons name="close" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {couponsLoading ? (
              <AppLoader messages={LOADING_MESSAGES.coupons} />
            ) : coupons.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="pricetags-outline" size={40} color={COLORS.darkTextSecondary} />
                <Text style={{ marginTop: 8, color: COLORS.darkTextSecondary, fontWeight: '600' }}>No coupons available right now</Text>
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
                      <Ionicons name="pricetag" size={18} color={c.eligible ? COLORS.secondary : COLORS.darkTextSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.couponCode, !c.eligible && { color: COLORS.darkTextSecondary }]}>{c.code}</Text>
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
                        <ButtonLoader label="Applying..." color={c.eligible ? '#fff' : COLORS.darkTextSecondary} />
                      ) : (
                        <Text style={[styles.applyBtnText, !c.eligible && { color: COLORS.darkTextSecondary }]}>Apply</Text>
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
  safe: { flex: 1, backgroundColor: COLORS.darkBg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.darkBg, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  headerSubtitle: { fontSize: 12, color: COLORS.darkTextSecondary },
  clearText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.darkCard, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  emptySubtitle: { fontSize: 14, color: COLORS.darkTextSecondary, textAlign: 'center' },
  browseBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 },
  browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  progressBanner: { backgroundColor: COLORS.darkCard, marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.darkBorder },
  progressBannerTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  progressBannerText: { fontSize: 13, color: COLORS.secondary, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.darkBorder, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.secondary },

  section: { backgroundColor: COLORS.darkCard, marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.darkBorder },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white, marginBottom: 12 },

  cartItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  cartItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  cartItemEmojiWrap: { width: 44, height: 44, borderRadius: 8, backgroundColor: COLORS.darkCardAlt, justifyContent: 'center', alignItems: 'center' },
  cartItemEmoji: { fontSize: 24 },
  cartItemImage: { width: 44, height: 44, borderRadius: 8, backgroundColor: COLORS.darkCardAlt },
  cartItemName: { fontSize: 14, fontWeight: '600', color: COLORS.white, marginBottom: 2 },
  cartItemPrice: { fontSize: 13, color: COLORS.darkTextSecondary },
  counterRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 8, overflow: 'hidden' },
  counterBtn: { width: 30, height: 32, justifyContent: 'center', alignItems: 'center' },
  counterText: { width: 28, textAlign: 'center', fontSize: 14, fontWeight: '700', color: COLORS.primary },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12 },
  addMoreText: { fontSize: 13, color: COLORS.secondary, fontWeight: '700' },

  etaRow: { flexDirection: 'row', alignItems: 'center' },
  etaIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.darkCardAlt, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  etaTitle: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  etaSubtitle: { fontSize: 12, color: COLORS.darkTextSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.darkBorder, marginVertical: 12 },
  deliverAtRow: { flexDirection: 'row', alignItems: 'flex-start' },
  deliverAtLabel: { fontSize: 12, color: COLORS.darkTextSecondary, fontWeight: '600', marginBottom: 2 },
  deliverAtText: { fontSize: 14, color: COLORS.white, fontWeight: '600', lineHeight: 19 },
  deliverAtMissing: { fontSize: 14, color: COLORS.secondary, fontWeight: '600' },
  changeText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  couponRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.darkCard, marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 16, gap: 10, borderWidth: 1, borderColor: COLORS.darkBorder },
  couponText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.primary },

  bestCouponRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(252,128,25,0.1)',
    marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 16, gap: 12,
    borderWidth: 1, borderColor: 'rgba(252,128,25,0.35)', borderStyle: 'dashed',
  },
  bestCouponIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.darkCard, justifyContent: 'center', alignItems: 'center' },
  bestCouponCode: { fontSize: 14, fontWeight: '800', color: COLORS.white, letterSpacing: 0.3 },
  bestCouponDesc: { fontSize: 12, color: COLORS.darkTextSecondary, marginTop: 1 },
  bestCouponApplyBtn: { backgroundColor: COLORS.secondary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  bestCouponApplyText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  appliedCouponRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(72,196,121,0.1)', marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(72,196,121,0.35)' },
  appliedCouponCode: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  appliedCouponDesc: { fontSize: 12, color: COLORS.darkTextSecondary, marginTop: 1 },
  appliedCouponAmount: { fontSize: 14, fontWeight: '700', color: COLORS.green },
  viewAllUnderApplied: { alignSelf: 'flex-start', marginHorizontal: 16, marginTop: 8 },
  viewAllUnderAppliedText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  billLabel: { fontSize: 14, color: COLORS.darkTextSecondary },
  billValue: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  calculatingText: { fontSize: 13, color: COLORS.darkTextSecondary, fontStyle: 'italic', paddingVertical: 8 },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.darkBorder, marginTop: 8, paddingTop: 12 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  totalValue: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  savedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(72,196,121,0.1)', borderRadius: 10, padding: 10, marginTop: 12 },
  savedText: { fontSize: 13, fontWeight: '700', color: COLORS.green },

  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20, paddingHorizontal: 16 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustText: { fontSize: 11, color: COLORS.darkTextSecondary, fontWeight: '600' },
  trustDivider: { width: 1, height: 12, backgroundColor: COLORS.darkBorder },

  checkoutContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: COLORS.darkBg, borderTopWidth: 1, borderTopColor: COLORS.darkBorder },
  addressWarningRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 },
  addressWarning: { fontSize: 13, color: COLORS.secondary, fontWeight: '600' },
  checkoutBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6, alignItems: 'center', minHeight: 60 },
  checkoutText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  checkoutSavedText: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 11, marginTop: 1 },
  checkoutPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkoutPrice: { color: '#fff', fontWeight: '800', fontSize: 17 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.darkCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, maxHeight: SCREEN_HEIGHT * 0.85, borderTopWidth: 1, borderColor: COLORS.darkBorder },
  sheetHandleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.darkBorder },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder, marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  couponCard: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1.5, borderColor: COLORS.darkBorder, borderRadius: 14, padding: 14, marginTop: 12, gap: 10, backgroundColor: COLORS.darkCardAlt },
  couponCardDisabled: { opacity: 0.6 },
  couponCardIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.darkCard, justifyContent: 'center', alignItems: 'center' },
  couponCode: { fontSize: 15, fontWeight: '800', color: COLORS.white, letterSpacing: 0.5 },
  couponDesc: { fontSize: 12, color: COLORS.darkTextSecondary, marginTop: 2, lineHeight: 16 },
  couponReason: { fontSize: 12, color: COLORS.secondary, marginTop: 4, fontWeight: '600' },
  applyBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'center' },
  applyBtnDisabled: { backgroundColor: COLORS.darkBorder },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  policyRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 8,
  backgroundColor: 'rgba(252,128,25,0.08)',
  marginHorizontal: 16,
  marginTop: 14,
  padding: 12,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: 'rgba(252,128,25,0.25)',
},
policyText: {
  flex: 1,
  fontSize: 12,
  color: COLORS.darkTextSecondary,
  lineHeight: 17,
},
policyTextBold: {
  fontWeight: '700',
  color: COLORS.secondary,
},
billHint: { fontSize: 11, color: COLORS.darkTextSecondary, marginTop: 2 },
});