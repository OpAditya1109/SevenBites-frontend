import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { getUserOrders } from '../services/api';
import { AppLoader, LOADING_MESSAGES } from '../components/AppLoader';

const STATUS_CONFIG = {
  placed:           { color: COLORS.secondary, icon: 'time-outline',      label: 'Order Placed' },
  confirmed:        { color: COLORS.secondary, icon: 'checkmark-circle-outline', label: 'Confirmed' },
  preparing:        { color: COLORS.secondary, icon: 'restaurant-outline', label: 'Preparing' },
  out_for_delivery: { color: COLORS.secondary, icon: 'bicycle',            label: 'Out for Delivery' },
  delivered:        { color: COLORS.green,     icon: 'checkmark-circle',   label: 'Delivered' },
  cancelled:        { color: COLORS.primary,   icon: 'close-circle',       label: 'Cancelled' },
};

export default function OrderHistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await getUserOrders();
      setOrders(res.data.data || res.data);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Could not load your orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, []);

  const formatTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      {loading ? (
       <AppLoader messages={LOADING_MESSAGES.orders} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} colors={[COLORS.primary]} />}
        >
          {error ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>⚠️</Text>
              <Text style={styles.emptyTitle}>Couldn't load orders</Text>
              <Text style={styles.emptySubtitle}>{error}</Text>
              <TouchableOpacity style={styles.orderBtn} onPress={() => { setLoading(true); fetchOrders(); }}>
                <Text style={styles.orderBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : orders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>No Orders Yet</Text>
              <Text style={styles.emptySubtitle}>Your order history will appear here</Text>
              <TouchableOpacity style={styles.orderBtn} onPress={() => navigation.navigate('Home')}>
                <Text style={styles.orderBtnText}>Order Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            orders.map((order) => {
              const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.delivered;
              return (
                <TouchableOpacity
                  key={order._id}
                  style={styles.orderCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('OrderTracking', { orderId: order._id })}
                >
                  <View style={styles.orderHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.restName}>{order.restaurantName}</Text>
                      <Text style={styles.orderTime}>{formatTime(order.createdAt)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
                      <Ionicons name={status.icon} size={14} color={status.color} />
                      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.itemList} numberOfLines={2}>
                    {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                  </Text>

                  <View style={styles.orderFooter}>
                    <Text style={styles.totalText}>₹{order.totalAmount}</Text>
                    <View style={styles.footerActions}>
                      {order.status === 'delivered' && (
                        <TouchableOpacity
                          style={styles.reorderBtn}
                          onPress={(e) => { e.stopPropagation(); navigation.navigate('RestaurantScreen', { restaurantId: order.restaurantId?._id || order.restaurantId }); }}
                        >
                          <Text style={styles.reorderText}>Reorder</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.detailBtn}
                        onPress={(e) => { e.stopPropagation(); navigation.navigate('OrderTracking', { orderId: order._id }); }}
                      >
                        <Text style={styles.detailText}>Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.black },
  emptyContainer: { alignItems: 'center', padding: 40, gap: 12, marginTop: 40 },
  emptyEmoji: { fontSize: 60 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: COLORS.black },
  emptySubtitle: { fontSize: 14, color: COLORS.gray, textAlign: 'center' },
  orderBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  orderBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  orderCard: { backgroundColor: COLORS.white, margin: 12, marginBottom: 0, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  orderHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  restName: { fontSize: 16, fontWeight: '700', color: COLORS.black },
  orderTime: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  itemList: { fontSize: 13, color: COLORS.gray, marginBottom: 12, lineHeight: 20 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  totalText: { fontSize: 16, fontWeight: '800', color: COLORS.black },
  footerActions: { flexDirection: 'row', gap: 8 },
  reorderBtn: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  reorderText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  detailBtn: { backgroundColor: COLORS.background, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  detailText: { fontSize: 13, fontWeight: '600', color: COLORS.gray },
});