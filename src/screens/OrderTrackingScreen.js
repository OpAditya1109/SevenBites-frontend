import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, ScrollView, Dimensions, PanResponder } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { getOrderById, connectOrderSocket, disconnectOrderSocket } from '../services/api';
import { AppLoader, LOADING_MESSAGES } from '../components/AppLoader';
import OrderTrackingMap from '../components/OrderTrackingMap';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PEEK_HEIGHT = 190;

const ORDER_STEPS = [
  { status: 'placed', label: 'Order Placed', icon: 'receipt-outline', description: 'Your order has been received' },
  { status: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline', description: 'Restaurant confirmed your order' },
  { status: 'preparing', label: 'Being Prepared', icon: 'restaurant-outline', description: 'Chef is preparing your food' },
  { status: 'out_for_delivery', label: 'Out for Delivery', icon: 'bicycle', description: 'Your order is on the way' },
  { status: 'delivered', label: 'Delivered', icon: 'checkmark-done-circle', description: 'Enjoy your meal!' },
];

const stepIndexForStatus = (status) => {
  if (status === 'ready') return 2;
  const i = ORDER_STEPS.findIndex((s) => s.status === status);
  return i === -1 ? 0 : i;
};

const TIMESTAMP_FIELD = {
  placed: 'createdAt',
  confirmed: 'confirmedAt',
  preparing: 'preparingAt',
  out_for_delivery: 'outForDeliveryAt',
  delivered: 'deliveredAt',
};

function formatClock(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function parseEtaMinutes(etaText) {
  if (!etaText) return null;
  const match = String(etaText).match(/(\d+)\D+(\d+)/);
  if (!match) return null;
  return { min: Number(match[1]), max: Number(match[2]) };
}

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [now, setNow] = useState(Date.now());
  const insets = useSafeAreaInsets();

  const SHEET_HEIGHT = SCREEN_HEIGHT - insets.top - 60;
  const EXPANDED_Y = 0;
  const COLLAPSED_Y = SHEET_HEIGHT - PEEK_HEIGHT;

  const translateY = useRef(new Animated.Value(EXPANDED_Y)).current;
  const lastOffset = useRef(EXPANDED_Y);

  const snapTo = useCallback((target, velocity = 0) => {
    lastOffset.current = target;
    setSheetExpanded(target === EXPANDED_Y);
    Animated.spring(translateY, {
      toValue: target,
      velocity,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
  }, [translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        translateY.setOffset(lastOffset.current);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        const next = lastOffset.current + g.dy;
        if (next >= EXPANDED_Y - 40 && next <= COLLAPSED_Y + 40) {
          translateY.setValue(g.dy);
        }
      },
      onPanResponderRelease: (_, g) => {
        translateY.flattenOffset();
        const current = lastOffset.current + g.dy;
        const midpoint = (EXPANDED_Y + COLLAPSED_Y) / 2;
        const shouldExpand = g.vy < -0.4 || (g.vy <= 0.4 && current < midpoint);
        snapTo(shouldExpand ? EXPANDED_Y : COLLAPSED_Y, g.vy);
      },
    })
  ).current;

  const toggleSheet = () => snapTo(sheetExpanded ? COLLAPSED_Y : EXPANDED_Y);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await getOrderById(orderId);
      setOrder(res.data.data || res.data);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Could not load this order.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();

    const socket = connectOrderSocket();
    socket.emit('join_order_room', orderId);
    const onUpdate = (updatedOrder) => {
      if (updatedOrder?._id === orderId) setOrder(updatedOrder);
    };
    socket.on('order_status_updated', onUpdate);

    const onLocationUpdate = (partial) => {
      if (partial?._id !== orderId) return;
      setOrder((prev) => (prev ? { ...prev, ...partial } : prev));
    };
    socket.on('order_location_updated', onLocationUpdate);

    const poll = setInterval(fetchOrder, 20000);

    return () => {
      socket.off('order_status_updated', onUpdate);
      socket.off('order_location_updated', onLocationUpdate);
      disconnectOrderSocket();
      clearInterval(poll);
    };
  }, [orderId, fetchOrder]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, []);

  const currentStepIndex = order ? stepIndexForStatus(order.status) : 0;
  const isCancelled = order?.status === 'cancelled' || order?.status === 'rejected';

  useEffect(() => {
    if (!order || isCancelled) return;
    Animated.timing(progressAnim, {
      toValue: currentStepIndex / (ORDER_STEPS.length - 1),
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentStepIndex, isCancelled, order]);

  // When the order first flips to "out_for_delivery" or "delivered", auto-expand
  // the sheet so the person actually sees the milestone instead of missing it
  // behind a collapsed peek.
  const prevStatusRef = useRef(order?.status);
  useEffect(() => {
    if (order && order.status !== prevStatusRef.current) {
      prevStatusRef.current = order.status;
      snapTo(EXPANDED_Y);
    }
  }, [order?.status]);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  if (loading) {
    return <AppLoader messages={LOADING_MESSAGES?.order || ['Fetching your order...']} />;
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Main')}>
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Order</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerFill}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.darkTextSecondary} />
          <Text style={styles.errorText}>{error || 'Order not found.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchOrder(); }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const etaRange = parseEtaMinutes(order.estimatedDeliveryTime);
  const placedAt = order.createdAt ? new Date(order.createdAt).getTime() : null;
  const minutesSincePlaced = placedAt ? Math.max(0, Math.round((now - placedAt) / 60000)) : null;
  const minutesLeft = etaRange && minutesSincePlaced !== null
    ? Math.max(0, etaRange.max - minutesSincePlaced)
    : null;
  const isOverdue = !!(etaRange && minutesSincePlaced !== null && minutesSincePlaced > etaRange.max);

  const restaurantName = order.restaurantId?.restaurantName || order.restaurantName || 'Restaurant';
  const restaurantAddress = order.restaurantId?.address || '';

  return (
    <View style={styles.safe}>
      {/* Full-bleed live map sits behind everything */}
      <View style={StyleSheet.absoluteFill}>
        {!isCancelled ? (
          <OrderTrackingMap
            rounded={false}
            height={SCREEN_HEIGHT}
            restaurant={{
              latitude: order.restaurantLatitude ?? order.restaurantId?.latitude ?? null,
              longitude: order.restaurantLongitude ?? order.restaurantId?.longitude ?? null,
              name: restaurantName,
            }}
            destination={{
              latitude: order.deliveryLatitude ?? null,
              longitude: order.deliveryLongitude ?? null,
              address: order.deliveryAddress,
            }}
            rider={
              currentStepIndex >= 3 && order.riderLatitude && order.riderLongitude
                ? { latitude: order.riderLatitude, longitude: order.riderLongitude, name: order.riderName }
                : null
            }
          />
        ) : (
          <View style={[styles.cancelledMapFallback, { height: SCREEN_HEIGHT }]}>
            <Ionicons name="close-circle-outline" size={30} color={COLORS.darkTextSecondary} />
          </View>
        )}
      </View>

      <SafeAreaView edges={['top']} style={styles.topBarSafe} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Main')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={20} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.orderIdChip}>
            <Text style={styles.orderIdChipText}>#{order._id.toString().slice(-8).toUpperCase()}</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Draggable bottom sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            height: SHEET_HEIGHT,
            transform: [{ translateY: translateY.interpolate({
              inputRange: [EXPANDED_Y, COLLAPSED_Y],
              outputRange: [EXPANDED_Y, COLLAPSED_Y],
              extrapolate: 'clamp',
            }) }],
          },
        ]}
      >
        {/* Peek header — always visible, drag or tap to toggle */}
        <View {...panResponder.panHandlers}>
          <TouchableOpacity activeOpacity={0.9} onPress={toggleSheet}>
            <View style={styles.dragHandleRow}>
              <View style={styles.dragHandle} />
            </View>

            <View style={styles.peekRow}>
              <View style={[styles.peekIconWrap, isCancelled && styles.peekIconWrapCancelled]}>
                <Ionicons
                  name={isCancelled ? 'close-circle' : ORDER_STEPS[currentStepIndex].icon}
                  size={22}
                  color="#fff"
                />
              </View>
              <View style={{ flex: 1 }}>
                {isCancelled ? (
                  <>
                    <Text style={styles.peekTitle}>{order.status === 'rejected' ? 'Order Rejected' : 'Order Cancelled'}</Text>
                    <Text style={styles.peekSub}>{order.rejectionReason || order.cancelReason || 'This order did not go through.'}</Text>
                  </>
                ) : order.status === 'delivered' ? (
                  <>
                    <Text style={styles.peekTitle}>Delivered!</Text>
                    {order.deliveredAt && <Text style={styles.peekSub}>Handed over at {formatClock(order.deliveredAt)}</Text>}
                  </>
                ) : (
                  <>
                    <Text style={styles.peekEyebrow}>{isOverdue ? 'Almost there' : 'Arriving in'}</Text>
                    <Text style={styles.peekTime}>
                      {isOverdue ? 'Any moment now' : minutesLeft !== null ? `${minutesLeft} mins` : (order.estimatedDeliveryTime || '30-45 min')}
                    </Text>
                  </>
                )}
              </View>
              <Ionicons name={sheetExpanded ? 'chevron-down' : 'chevron-up'} size={20} color={COLORS.darkTextSecondary} />
            </View>

            {!isCancelled && (
              <View style={styles.peekStatusRow}>
                <View style={styles.peekProgressTrack}>
                  <Animated.View style={[styles.peekProgressFill, { width: progressWidth }]} />
                </View>
                <Text style={styles.peekStatusText}>{ORDER_STEPS[currentStepIndex].label}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Full detail content — scrolls once expanded */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          scrollEnabled={sheetExpanded}
          contentContainerStyle={{ paddingBottom: 24 }}
          style={{ flex: 1 }}
        >
          {!isCancelled && (
            <View style={styles.routeBlock}>
              <View style={styles.routeRow}>
                <View style={styles.routeIconCol}>
                  <View style={[styles.routeDot, styles.routeDotFilled]}>
                    <Ionicons name="restaurant" size={13} color="#fff" />
                  </View>
                  <DottedLine active={currentStepIndex >= 3} length={36} />
                </View>
                <View style={styles.routeTextCol}>
                  <Text style={styles.routeLabel}>{restaurantName}</Text>
                  {!!restaurantAddress && <Text style={styles.routeAddress} numberOfLines={2}>{restaurantAddress}</Text>}
                </View>
              </View>

              {currentStepIndex >= 3 && (
                <View style={styles.routeRiderRow}>
                  <View style={styles.routeIconCol}>
                    <View style={styles.riderMarker}>
                      <Ionicons name="bicycle" size={13} color="#fff" />
                    </View>
                  </View>
                  <Text style={styles.routeRiderText}>
                    {order.status === 'delivered' ? 'Delivered to your address' : 'On the way to you'}
                  </Text>
                </View>
              )}

              <View style={styles.routeRow}>
                <View style={styles.routeIconCol}>
                  <View style={[styles.routeDot, currentStepIndex === 4 && styles.routeDotFilled]}>
                    <Ionicons name="location" size={13} color="#fff" />
                  </View>
                </View>
                <View style={styles.routeTextCol}>
                  <Text style={styles.routeLabel}>Delivery Address</Text>
                  <Text style={styles.routeAddress} numberOfLines={2}>{order.deliveryAddress}</Text>
                </View>
              </View>
            </View>
          )}

          {!isCancelled && (
            <View style={styles.stepsContainer}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="git-commit-outline" size={16} color={COLORS.secondary} />
                <Text style={styles.sectionTitle}>Order Status</Text>
              </View>

              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>

              {ORDER_STEPS.map((step, index) => {
                const isDone = currentStepIndex > index;
                const isActive = currentStepIndex === index;
                const ts = order[TIMESTAMP_FIELD[step.status]];
                return (
                  <View key={step.status} style={styles.step}>
                    <View style={[styles.stepCircle, isDone && styles.doneCircle, isActive && styles.activeCircle]}>
                      {isDone ? <Ionicons name="checkmark" size={16} color="#fff" /> : <Text style={[styles.stepNum, isActive && styles.activeStepNum]}>{index + 1}</Text>}
                    </View>
                    <View style={styles.stepInfo}>
                      <Text style={[styles.stepLabel, (isDone || isActive) && styles.activeStepLabel]}>{step.label}</Text>
                      {(isActive || isDone) && <Text style={styles.stepDesc}>{step.description}</Text>}
                      {ts && <Text style={styles.stepTime}>{formatClock(ts)}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.invoiceCard}>
            <View style={styles.invoiceHeader}>
              <Ionicons name="receipt-outline" size={18} color={COLORS.secondary} />
              <Text style={styles.invoiceTitle}>Invoice</Text>
            </View>

            {order.items.map((item, idx) => (
              <View key={idx} style={styles.invoiceItemRow}>
                <Text style={styles.invoiceItemQty}>{item.quantity}x</Text>
                <Text style={styles.invoiceItemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.invoiceItemPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
              </View>
            ))}

            <View style={styles.invoiceDivider} />

            <InvoiceRow label="Item Total" value={order.itemTotal} />
            <InvoiceRow label="Delivery Fee" value={order.deliveryFee} free={order.deliveryFee === 0} />
            <InvoiceRow label="Platform Fee" value={order.platformFee} />
            <InvoiceRow label="GST" value={order.gst} />
            {order.discountAmount > 0 && (
              <InvoiceRow label={`Coupon Discount${order.couponCode ? ` (${order.couponCode})` : ''}`} value={-order.discountAmount} discount />
            )}

            <View style={styles.invoiceTotalRow}>
              <Text style={styles.invoiceTotalLabel}>Total Paid</Text>
              <Text style={styles.invoiceTotalValue}>₹{order.totalAmount.toFixed(0)}</Text>
            </View>

            <View style={styles.invoiceMetaRow}>
              <Text style={styles.invoiceMetaText}>
                {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod?.toUpperCase()}
              </Text>
              <Text style={[styles.invoiceMetaText, order.paymentStatus === 'paid' ? styles.paidText : styles.pendingText]}>
                {order.paymentStatus === 'paid' ? 'Paid' : 'Payment Pending'}
              </Text>
            </View>
          </View>

          {order.status === 'delivered' && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.rateBtn} onPress={() => navigation.navigate('Main')}>
                <Text style={styles.rateBtnText}>⭐ Rate Your Experience</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function InvoiceRow({ label, value, free, discount }) {
  return (
    <View style={styles.invoiceBillRow}>
      <Text style={styles.invoiceBillLabel}>{label}</Text>
      <Text style={[styles.invoiceBillValue, free && { color: COLORS.green }, discount && { color: COLORS.green }]}>
        {free ? 'FREE' : `${value < 0 ? '− ' : ''}₹${Math.abs(value).toFixed(0)}`}
      </Text>
    </View>
  );
}

function DottedLine({ length = 60, active }) {
  const dotCount = Math.max(3, Math.floor(length / 8));
  return (
    <View style={{ height: length, width: 2, alignItems: 'center', justifyContent: 'space-between' }}>
      {Array.from({ length: dotCount }).map((_, i) => (
        <View key={i} style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: active ? COLORS.primary : COLORS.darkBorder }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.darkBg },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errorText: { fontSize: 14, color: COLORS.darkTextSecondary, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.darkBg, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },

  cancelledMapFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.darkCardAlt },

  topBarSafe: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 6 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  orderIdChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  orderIdChipText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },

  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.darkCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
    overflow: 'hidden',
  },
  dragHandleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.darkBorder },

  peekRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18 },
  peekIconWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  peekIconWrapCancelled: { backgroundColor: COLORS.darkTextSecondary },
  peekEyebrow: { fontSize: 11, fontWeight: '700', color: COLORS.darkTextSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  peekTime: { fontSize: 22, fontWeight: '800', color: COLORS.white, marginTop: 1 },
  peekTitle: { fontSize: 17, fontWeight: '800', color: COLORS.white },
  peekSub: { fontSize: 12, color: COLORS.darkTextSecondary, marginTop: 2, fontWeight: '600' },

  peekStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, marginTop: 14 },
  peekProgressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.darkBorder, overflow: 'hidden' },
  peekProgressFill: { height: '100%', borderRadius: 2, backgroundColor: COLORS.primary },
  peekStatusText: { fontSize: 12, fontWeight: '700', color: COLORS.darkTextSecondary },

  routeBlock: { marginTop: 20, paddingTop: 18, paddingHorizontal: 18, borderTopWidth: 1, borderTopColor: COLORS.darkBorder },
  routeRow: { flexDirection: 'row', gap: 12 },
  routeIconCol: { alignItems: 'center', width: 24 },
  routeDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.darkBorder, alignItems: 'center', justifyContent: 'center' },
  routeDotFilled: { backgroundColor: COLORS.primary },
  routeTextCol: { flex: 1, paddingBottom: 12 },
  routeLabel: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  routeAddress: { fontSize: 12, color: COLORS.darkTextSecondary, marginTop: 2, lineHeight: 17 },
  routeRiderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 2, paddingBottom: 8 },
  riderMarker: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  routeRiderText: { fontSize: 12, fontWeight: '700', color: COLORS.green },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.white },

  stepsContainer: { backgroundColor: COLORS.darkCardAlt, marginHorizontal: 18, borderRadius: 20, padding: 20, marginTop: 14 },
  progressTrack: { position: 'absolute', left: 40, top: 62, width: 3, height: '72%', backgroundColor: COLORS.darkBorder },
  progressFill: { backgroundColor: COLORS.primary, borderRadius: 2 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 16 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.darkBorder, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  doneCircle: { backgroundColor: COLORS.green },
  activeCircle: { backgroundColor: COLORS.primary },
  stepNum: { fontSize: 13, fontWeight: '700', color: COLORS.darkTextSecondary },
  activeStepNum: { color: '#fff' },
  stepInfo: { flex: 1, paddingTop: 5 },
  stepLabel: { fontSize: 14, fontWeight: '600', color: COLORS.darkTextSecondary },
  activeStepLabel: { color: COLORS.white },
  stepDesc: { fontSize: 12, color: COLORS.secondary, marginTop: 2 },
  stepTime: { fontSize: 11, color: COLORS.darkTextSecondary, marginTop: 2 },

  invoiceCard: { backgroundColor: COLORS.darkCardAlt, marginHorizontal: 18, borderRadius: 20, padding: 18, marginTop: 14 },
  invoiceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  invoiceTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  invoiceItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  invoiceItemQty: { fontSize: 13, fontWeight: '700', color: COLORS.darkTextSecondary, width: 24 },
  invoiceItemName: { flex: 1, fontSize: 14, color: COLORS.white },
  invoiceItemPrice: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  invoiceDivider: { height: 1, backgroundColor: COLORS.darkBorder, marginVertical: 10 },
  invoiceBillRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  invoiceBillLabel: { fontSize: 13, color: COLORS.darkTextSecondary },
  invoiceBillValue: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  invoiceTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: COLORS.darkCard },
  invoiceTotalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  invoiceTotalValue: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  invoiceMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  invoiceMetaText: { fontSize: 12, color: COLORS.darkTextSecondary, fontWeight: '600' },
  paidText: { color: COLORS.green },
  pendingText: { color: COLORS.warning },

  footer: { padding: 18, paddingTop: 20 },
  rateBtn: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  rateBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});