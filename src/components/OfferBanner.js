import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function OfferBanner({ offer }) {
  return (
    <LinearGradient
      colors={[offer.bg, offer.bg + 'CC']}
      style={styles.banner}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.textContainer}>
        <Text style={styles.title}>{offer.title}</Text>
        <Text style={styles.subtitle}>{offer.subtitle}</Text>
      </View>
      <Text style={styles.image}>{offer.image}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: { width: 220, height: 100, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  textContainer: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  image: { fontSize: 36 },
});