import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { getActiveCoupons } from '../services/api';
import { AppLoader, LOADING_MESSAGES } from '../components/AppLoader';

export default function OffersScreen({ navigation }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCoupons(); }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await getActiveCoupons();
      setCoupons(res.data.data || res.data || []);
    } catch {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const showCode = (code) => {
    Alert.alert('Coupon Code', `Use "${code}" at checkout to apply this offer.`);
  };

  const discountLabel = (c) =>
    c.discountType === 'percentage'
      ? `${c.discountValue}% OFF${c.maxDiscount ? ` up to ₹${c.maxDiscount}` : ''}`
      : `₹${c.discountValue} OFF`;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offers & Rewards</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <AppLoader messages={LOADING_MESSAGES.default} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {coupons.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="gift-outline" size={48} color={COLORS.darkTextSecondary} />
              <Text style={styles.emptyText}>No offers available right now</Text>
              <Text style={styles.emptySubtext}>Check back soon for new coupons and deals</Text>
            </View>
          ) : (
            coupons.map((c) => (
              <View key={c._id || c.code} style={[styles.card, !c.eligible && styles.cardDisabled]}>
                <View style={styles.cardLeft}>
                  <View style={styles.iconBox}>
                    <Ionicons name="pricetag-outline" size={20} color={COLORS.primary} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.discountText}>{discountLabel(c)}</Text>
                  {!!c.description && <Text style={styles.descText}>{c.description}</Text>}
                  {!!c.minOrderValue && (
                    <Text style={styles.metaText}>Min. order ₹{c.minOrderValue}</Text>
                  )}
                  {!c.eligible && !!c.reason && <Text style={styles.reasonText}>{c.reason}</Text>}
                </View>
                <TouchableOpacity style={styles.codeBtn} onPress={() => showCode(c.code)}>
                  <Text style={styles.codeText}>{c.code}</Text>
                  <Ionicons name="information-circle-outline" size={14} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.darkBg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.darkBg, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  emptyWrap: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  emptySubtext: { fontSize: 13, color: COLORS.darkTextSecondary, textAlign: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.darkCard, borderRadius: 16,
    padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.darkBorder, gap: 12,
  },
  cardDisabled: { opacity: 0.5 },
  cardLeft: { justifyContent: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.darkCardAlt, justifyContent: 'center', alignItems: 'center' },
  discountText: { fontSize: 15, fontWeight: '800', color: COLORS.white },
  descText: { fontSize: 13, color: COLORS.darkTextSecondary, marginTop: 2 },
  metaText: { fontSize: 12, color: COLORS.darkTextSecondary, marginTop: 4 },
  reasonText: { fontSize: 12, color: COLORS.primary, marginTop: 4 },
  codeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.primary,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderStyle: 'dashed',
  },
  codeText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});