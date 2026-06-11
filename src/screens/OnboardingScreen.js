import React, { useState, useRef } from 'react';
import {
  View, Text, FlatList, Dimensions, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONTS } from '../utils/constants';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    emoji: '🍕',
    title: 'Order Food\nYou Love',
    subtitle: 'Discover the best food & drinks in your city, delivered to you.',
    bg: ['#E23744', '#FF6B6B'],
  },
  {
    id: '2',
    emoji: '⚡',
    title: 'Fast Delivery\nEvery Time',
    subtitle: 'Get your orders delivered in under 30 minutes with real-time tracking.',
    bg: ['#FC8019', '#FFAA5A'],
  },
  {
    id: '3',
    emoji: '💰',
    title: 'Best Deals\n& Offers',
    subtitle: 'Save more with exclusive deals, coupons, and cashback on every order.',
    bg: ['#48C479', '#7ED957'],
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
        onMomentumScrollEnd={(e) => {
          setCurrent(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => (
          <LinearGradient colors={item.bg} style={styles.slide}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </LinearGradient>
        )}
        keyExtractor={(item) => item.id}
      />

      {/* Dots */}
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
  container: { flex: 1 },
  slide: { width, height, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emoji: { fontSize: 100, marginBottom: 40 },
  title: { fontSize: 36, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 44, marginBottom: 16 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 24 },
  dotsContainer: { position: 'absolute', bottom: 120, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  activeDot: { width: 24, backgroundColor: '#fff' },
  footer: { position: 'absolute', bottom: 40, width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 32 },
  skipBtn: { padding: 16 },
  skipText: { fontSize: 16, color: '#fff', opacity: 0.8 },
  nextBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 30, paddingHorizontal: 24, paddingVertical: 14 },
  nextText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});