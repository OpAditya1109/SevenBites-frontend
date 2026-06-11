import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const logoScale   = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity  = useRef(new Animated.Value(0)).current;
  const dotOpacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Logo pops in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // 2. Tagline fades in
      Animated.timing(tagOpacity, {
        toValue: 1,
        duration: 350,
        delay: 100,
        useNativeDriver: true,
      }),
      // 3. Dot indicator fades in
      Animated.timing(dotOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // 4. Hold for a moment
      Animated.delay(900),
      // 5. Fade everything out
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(tagOpacity,  { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(dotOpacity,  { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => {
      navigation.replace('Login');
    });
  }, []);

  return (
    <LinearGradient
      colors={['#E23744', '#c0202e']}
      style={styles.container}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
    >
      {/* Subtle radial glow in center */}
      <View style={styles.glow} />

      {/* Logo block */}
      <Animated.View
        style={[
          styles.logoBlock,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        {/* Icon mark — fork + flame */}
        <Text style={styles.icon}>🍽️</Text>

        {/* App name */}
        <Text style={styles.appName}>Seven Bites</Text>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
          Good food, fast.
        </Animated.Text>
      </Animated.View>

      {/* Bottom dot */}
      <Animated.View style={[styles.bottomDot, { opacity: dotOpacity }]} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  logoBlock: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginTop: 10,
    letterSpacing: 0.5,
  },
  bottomDot: {
    position: 'absolute',
    bottom: 48,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});