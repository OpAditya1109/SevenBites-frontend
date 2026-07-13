import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

const BANNER_IMAGE = 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=900&q=80';

export default function OfferBanner({
  title = 'Flat 50% off on your first order',
  code = 'SEVEN50',
  note = 'Ends tonight',
  onPress,
}) {
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.wrap} onPress={onPress}>
      <ImageBackground source={{ uri: BANNER_IMAGE }} style={styles.bg} imageStyle={styles.bgImage}>
        <LinearGradient
          colors={['rgba(20,14,16,0.95)', 'rgba(20,14,16,0.6)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <View style={styles.liveTag}>
            <Text style={styles.liveTagText}>LIVE OFFER</Text>
          </View>
          <Text style={styles.headline}>{title}</Text>
          <Text style={styles.note}>Use code {code} · {note}</Text>
          <View style={styles.ctaBtn}>
            <Text style={styles.ctaText}>Order now</Text>
            <Ionicons name="arrow-forward" size={14} color={COLORS.black} />
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 18, borderRadius: 20, overflow: 'hidden', height: 168 },
  bg: { flex: 1, justifyContent: 'flex-end' },
  bgImage: { borderRadius: 20 },
  content: { padding: 18, maxWidth: '78%' },
  liveTag: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  liveTagText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  headline: { color: '#fff', fontSize: 19, fontWeight: '800', lineHeight: 24, marginBottom: 6 },
  note: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 12 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff',
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 9, alignSelf: 'flex-start',
  },
  ctaText: { color: COLORS.black, fontWeight: '700', fontSize: 13 },
}); 