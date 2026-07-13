import React, { useState, useRef } from 'react';
import { View, Text, FlatList, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../utils/constants';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1', emoji: '🍕', title: 'Order Food\nYou Love',
    subtitle: 'Discover the best food & drinks in your city, delivered to you.',
    bg: ['#3A1418', '#1A0E10'],
  },
  {
    id: '2', emoji: '⚡', title: 'Fast Delivery\nEvery Time',
    subtitle: 'Get your orders delivered in under 30 minutes with real-time tracking.',
    bg: ['#3A2412', '#1A0E10'],
  },
  {
    id: '3', emoji: '💰', title: 'Best Deals\n& Offers',
    subtitle: 'Save more with exclusive deals, coupons, and cashback on every order.',
    bg: ['#123A22', '#0B0B0D'],
  },
];

export default function OnboardingScreen({ navigation }) {
  const [current, setCurrent] = useState(0);
  const flatRef = useRef(null);

  const handleNext = () => {
    if (current < slides.length - 1) {
      flatRef.current.scrollToIndex({ index: current + 1 });
      setCurrent(current + 1);
    } else {
      navigation.replace('Login');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <LinearGradient colors={item.bg} style={styles.slide}>
            <View style={styles.emojiWrap}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </LinearGradient>
        )}
        keyExtractor={(item) => item.id}
      />

      <View style={styles.dotsContainer}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, current === i && styles.activeDot]} />
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.replace('Login')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNext} style={styles.nextBtn}>
          <Text style={styles.nextText}>
            {current === slides.length - 1 ? "Let's Eat 🍔" : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.darkBg },
  slide: { width, height, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emojiWrap: {
    width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 40,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  emoji: { fontSize: 72 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 40, marginBottom: 16 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22 },
  dotsContainer: { position: 'absolute', bottom: 120, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  activeDot: { width: 24, backgroundColor: COLORS.primary },
  footer: { position: 'absolute', bottom: 40, width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 32 },
  skipBtn: { padding: 16 },
  skipText: { fontSize: 16, color: '#fff', opacity: 0.6 },
  nextBtn: { backgroundColor: COLORS.primary, borderRadius: 30, paddingHorizontal: 24, paddingVertical: 14 },
  nextText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});