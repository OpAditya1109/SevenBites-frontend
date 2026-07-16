import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

// TODO: update with your real support contact details
const SUPPORT_EMAIL = 'info@adityaxinnovations.com';

const FAQS = [
  {
    q: 'How do I track my order?',
    a: 'Go to the Orders tab and tap on an active order to see live status and rider location once it\'s out for delivery.',
  },
  {
    q: 'How do I cancel an order?',
    a: 'You can cancel an order from the order tracking screen before the restaurant accepts it. Once accepted, please contact support for help.',
  },
  {
    q: 'How do I apply a coupon code?',
    a: 'At checkout, tap "Apply Coupon" and enter your code, or pick one from the Offers & Rewards section in your Profile.',
  },
  {
    q: 'What if my order arrives incorrect or damaged?',
    a: 'Please reach out to support within 24 hours with your order ID and details, and we\'ll help resolve it.',
  },
  {
    q: 'How do I update my profile details?',
    a: 'Go to Profile > Settings to update your name and phone number.',
  },
];

export default function HelpSupportScreen({ navigation }) {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.sectionTitle}>Contact Us</Text>
        <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
          <View style={styles.contactIconBox}>
            <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactLabel}>Email us</Text>
            <Text style={styles.contactValue}>{SUPPORT_EMAIL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.darkTextSecondary} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Frequently Asked Questions</Text>
        {FAQS.map((item, i) => (
          <TouchableOpacity key={i} style={styles.faqCard} onPress={() => toggle(i)} activeOpacity={0.8}>
            <View style={styles.faqQuestionRow}>
              <Text style={styles.faqQuestion}>{item.q}</Text>
              <Ionicons name={openIndex === i ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.darkTextSecondary} />
            </View>
            {openIndex === i && <Text style={styles.faqAnswer}>{item.a}</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.darkTextSecondary, textTransform: 'uppercase', marginBottom: 12 },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.darkCard, borderRadius: 14,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.darkBorder, gap: 12,
  },
  contactIconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.darkCardAlt, justifyContent: 'center', alignItems: 'center' },
  contactLabel: { fontSize: 13, color: COLORS.darkTextSecondary },
  contactValue: { fontSize: 15, fontWeight: '600', color: COLORS.white, marginTop: 2 },
  faqCard: {
    backgroundColor: COLORS.darkCard, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  faqQuestionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.white },
  faqAnswer: { fontSize: 13, color: COLORS.darkTextSecondary, marginTop: 10, lineHeight: 19 },
});