import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { getOrderById, connectOrderSocket, disconnectOrderSocket } from '../services/api';
import { AppLoader, LOADING_MESSAGES } from '../components/AppLoader';

// Matches the backend's real status machine (models/Order.js + restaurantOrderController.js)
const ORDER_STEPS = [
  { status: 'placed', label: 'Order Placed', icon: 'receipt-outline', description: 'Your order has been received' },
  { status: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline', description: 'Restaurant confirmed your order' },
  { status: 'preparing', label: 'Being Prepared', icon: 'restaurant-outline', description: 'Chef is preparing your food' },
  { status: 'out_for_delivery', label: 'Out for Delivery', icon: 'bicycle', description: 'Your order is on the way' },
  { status: 'delivered', label: 'Delivered', icon: 'checkmark-done-circle', description: 'Enjoy your meal!' },
];

// "ready" sits between preparing and out_for_delivery on the real backend enum —
// fold it into the "preparing" step visually so the 5-step UI still matches 1:1.
const stepIndexForStatus = (status) => {
  if (status === 'ready') return 2; // same visual slot as "preparing"
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

// Parses "20-35 min" style strings from the backend's delivery-estimate endpoint
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
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [now, setNow] = useState(Date.now());

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

  // Initial fetch + live socket updates for this exact order, instead of a fake setTimeout march
  useEffect(() => {
    fetchOrder();

    const socket = connectOrderSocket();
    socket.emit('join_order_room', orderId);
    const onUpdate = (updatedOrder) => {
      if (updatedOrder?._id === orderId) setOrder(updatedOrder);
    };
    socket.on('order_status_updated', onUpdate);

    // Light fallback poll in case the socket connection drops silently
    const poll = setInterval(fetchOrder, 20000);

    return () => {
      socket.off('order_status_updated', onUpdate);
      disconnectOrderSocket();
      clearInterval(poll);
    };
  }, [orderId, fetchOrder]);

  // Tick every 30s so the "time elapsed / remaining" text stays live
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

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  if (loading) {
    return <AppLoader messages={LOADING_MESSAGES?.order || ['Fetching your order...']} />;
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerFill}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.gray} />
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

  const restaurantName = order.restaurantId?.restaurantName || order.restaurantName || 'Restaurant';
  const restaurantAddress = order.restaurantId?.address || '';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Main')}>
          <Ionicons name="close" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ETA / status card — built from order.status + the real ETA saved at checkout */}
        <View style={[styles.etaCard, isCancelled && styles.etaCardCancelled]}>
          <Ionicons
            name={isCancelled ? 'close-circle' : ORDER_STEPS[currentStepIndex].icon}
            size={40}
            color="#fff"
          />
          <View style={styles.etaInfo}>
            {isCancelled ? (
              <>
                <Text style={styles.etaLabel}>
                  {order.status === 'rejected' ? 'Order Rejected' : 'Order Cancelled'}
                </Text>
                <Text style={styles.etaStatus}>
                  {order.rejectionReason || order.cancelReason || 'This order did not go through.'}
                </Text>
              </>
            ) : order.status === 'delivered' ? (
              <>
                <Text style={styles.etaLabel}>Delivered!</Text>
                {order.deliveredAt && (
                  <Text style={styles.etaStatus}>at {formatClock(order.deliveredAt)}</Text>
                )}
              </>
            ) : (
              <>
                <Text style={styles.etaLabel}>Arriving in</Text>
                <Text style={styles.etaTime}>
                  {minutesLeft !== null ? `${minutesLeft} mins` : (order.estimatedDeliveryTime || '30-45 min')}
                </Text>
                <Text style={styles.etaStatus}>{ORDER_STEPS[currentStepIndex].label}</Text>
              </>
            )}
          </View>
        </View>

        <Text style={styles.orderId}>Order #{order._id.toString().slice(-8).toUpperCase()}</Text>

        {/* Restaurant → address route, connected with a dotted line (Zomato-style), driven by real progress */}
        {!isCancelled && (
          <View style={styles.routeCard}>
            <View style={styles.routeRow}>
              <View style={styles.routeIconCol}>
                <View style={[styles.routeDot, styles.routeDotFilled]}>
                  <Ionicons name="restaurant" size={14} color="#fff" />
                </View>
                <DottedLine active={currentStepIndex >= 3} length={64} />
              </View>
              <View style={styles.routeTextCol}>
                <Text style={styles.routeLabel}>{restaurantName}</Text>
                {!!restaurantAddress && (
                  <Text style={styles.routeAddress} numberOfLines={2}>{restaurantAddress}</Text>
                )}
              </View>
            </View>

            {currentStepIndex >= 3 && (
              <View style={styles.routeRiderRow}>
                <View style={styles.routeIconCol}>
                  <View style={styles.riderMarker}>
                    <Ionicons name="bicycle" size={14} color="#fff" />
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
                  <Ionicons name="location" size={14} color="#fff" />
                </View>
              </View>
              <View style={styles.routeTextCol}>
                <Text style={styles.routeLabel}>Delivery Address</Text>
                <Text style={styles.routeAddress} numberOfLines={2}>{order.deliveryAddress}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Progress Steps */}
        {!isCancelled && (
          <View style={styles.stepsContainer}>
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
                    {isDone ? (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    ) : (
                      <Text style={[styles.stepNum, isActive && styles.activeStepNum]}>{index + 1}</Text>
                    )}
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

        {/* Real invoice — pulled straight from the order's own saved amounts, no placeholders */}
        <View style={styles.invoiceCard}>
          <View style={styles.invoiceHeader}>
            <Ionicons name="receipt-outline" size={18} color={COLORS.primary} />
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
          <InvoiceRow
            label="Delivery Fee"
            value={order.deliveryFee}
            free={order.deliveryFee === 0}
          />
          <InvoiceRow label="Platform Fee" value={order.platformFee} />
          <InvoiceRow label="GST" value={order.gst} />
          {order.discountAmount > 0 && (
            <InvoiceRow
              label={`Coupon Discount${order.couponCode ? ` (${order.couponCode})` : ''}`}
              value={-order.discountAmount}
              discount
            />
          )}

          <View style={[styles.invoiceItemRow, styles.invoiceTotalRow]}>
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

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InvoiceRow({ label, value, free, discount }) {
  return (
    <View style={styles.invoiceBillRow}>
      <Text style={styles.invoiceBillLabel}>{label}</Text>
      <Text style={[
        styles.invoiceBillValue,
        free && { color: COLORS.green },
        discount && { color: COLORS.green },
      ]}>
        {free ? 'FREE' : `${value < 0 ? '− ' : ''}₹${Math.abs(value).toFixed(0)}`}
      </Text>
    </View>
  );
}

// Small dashed connector built from plain Views — no maps SDK / extra native deps required.
function DottedLine({ length = 60, active }) {
  const dotCount = Math.max(3, Math.floor(length / 8));
  return (
    <View style={{ height: length, width: 2, alignItems: 'center', justifyContent: 'space-between' }}>
      {Array.from({ length: dotCount }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 3,
            height: 3,
            borderRadius: 1.5,
            backgroundColor: active ? COLORS.primary : COLORS.border,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errorText: { fontSize: 14, color: COLORS.gray, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  etaCard: { backgroundColor: COLORS.primary, margin: 16, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  etaCardCancelled: { backgroundColor: COLORS.gray },
  etaInfo: { flex: 1 },
  etaLabel: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  etaTime: { fontSize: 32, fontWeight: '800', color: '#fff' },
  etaStatus: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  orderId: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginBottom: 16 },

  routeCard: { backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 12 },
  routeRow: { flexDirection: 'row', gap: 12 },
  routeIconCol: { alignItems: 'center', width: 24 },
  routeDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  routeDotFilled: { backgroundColor: COLORS.primary },
  routeTextCol: { flex: 1, paddingBottom: 4 },
  routeLabel: { fontSize: 14, fontWeight: '700', color: COLORS.black },
  routeAddress: { fontSize: 12, color: COLORS.gray, marginTop: 2, lineHeight: 17 },
  routeRiderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  riderMarker: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  routeRiderText: { fontSize: 12, fontWeight: '600', color: COLORS.green },

  stepsContainer: { backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 16, padding: 20, gap: 16, marginBottom: 12 },
  progressTrack: { position: 'absolute', left: 36, top: 36, width: 3, height: '80%', backgroundColor: COLORS.border },
  progressFill: { backgroundColor: COLORS.primary, borderRadius: 2 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  doneCircle: { backgroundColor: COLORS.green },
  activeCircle: { backgroundColor: COLORS.primary },
  stepNum: { fontSize: 13, fontWeight: '700', color: COLORS.gray },
  activeStepNum: { color: '#fff' },
  stepInfo: { flex: 1, paddingTop: 5 },
  stepLabel: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  activeStepLabel: { color: COLORS.black },
  stepDesc: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  stepTime: { fontSize: 11, color: COLORS.gray, marginTop: 2 },

  invoiceCard: { backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 16, padding: 16 },
  invoiceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  invoiceTitle: { fontSize: 16, fontWeight: '700', color: COLORS.black },
  invoiceItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  invoiceItemQty: { fontSize: 13, fontWeight: '700', color: COLORS.gray, width: 24 },
  invoiceItemName: { flex: 1, fontSize: 14, color: COLORS.black },
  invoiceItemPrice: { fontSize: 14, fontWeight: '600', color: COLORS.black },
  invoiceDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  invoiceBillRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  invoiceBillLabel: { fontSize: 13, color: COLORS.gray },
  invoiceBillValue: { fontSize: 13, fontWeight: '600', color: COLORS.black },
  invoiceTotalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 6, paddingTop: 12 },
  invoiceTotalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.black },
  invoiceTotalValue: { fontSize: 15, fontWeight: '800', color: COLORS.black },
  invoiceMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  invoiceMetaText: { fontSize: 12, color: COLORS.gray, fontWeight: '600' },
  paidText: { color: COLORS.green },
  pendingText: { color: COLORS.warning },

  footer: { padding: 16 },
  rateBtn: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  rateBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});