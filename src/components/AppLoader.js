import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../utils/constants';

// Zomato-style rotating messages, grouped by context so every screen
// shows something relevant instead of a bare spinner.
export const LOADING_MESSAGES = {
  default: [
    '🍕 Hunting down the best spots...',
    '🛵 Our riders are warming up...',
    '🧑‍🍳 Chefs are getting ready...',
    '🌶️ Spicing things up for you...',
    '🍔 Good food takes a second...',
  ],
  restaurant: [
    '🍽️ Getting the menu ready...',
    '🧑‍🍳 Checking what\'s fresh today...',
    '📋 Loading dishes just for you...',
  ],
  search: [
    '🔍 Looking for a match...',
    '🍜 Scanning the menu shelves...',
  ],
  address: [
    '📍 Fetching your saved places...',
    '🏠 Getting your addresses ready...',
  ],
  orders: [
    '🧾 Pulling up your order history...',
    '📦 Loading your past orders...',
  ],
  coupons: [
    '🎟️ Finding the best offers for you...',
    '💸 Checking what you can save...',
  ],
  payment: [
    '💳 Opening secure payment...',
    '🔒 Talking to the payment gateway...',
    '🤝 Almost there, hang tight...',
  ],
  order: [
    '📍 Locating your order...',
    '🛵 Checking on your rider...',
  ],
};

// Full-screen / section loader — spinner + a rotating message.
export function AppLoader({ messages = LOADING_MESSAGES.default, style }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % messages.length), 1800);
    return () => clearInterval(timer);
  }, [messages]);

  return (
    <View style={[styles.wrap, style]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.text}>{messages[index]}</Text>
    </View>
  );
}

// Compact inline loader for buttons — spinner + short label instead of
// a bare white ActivityIndicator.
export function ButtonLoader({ label = 'Please wait...', color = '#fff' }) {
  return (
    <View style={styles.buttonWrap}>
      <ActivityIndicator color={color} />
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 48, backgroundColor: COLORS.darkBg },
  text: { fontSize: 17, lineHeight: 24, color: COLORS.darkTextSecondary, fontWeight: '700', textAlign: 'center', paddingHorizontal: 28 },
  buttonWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { fontSize: 15, fontWeight: '700' },
});