import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

const ORDER_STEPS = [
  { id: 1, label: 'Order Placed', icon: '✅', description: 'Your order has been received' },
  { id: 2, label: 'Confirmed', icon: '👨‍🍳', description: 'Restaurant confirmed your order' },
  { id: 3, label: 'Being Prepared', icon: '🍳', description: 'Chef is preparing your food' },
  { id: 4, label: 'Out for Delivery', icon: '🛵', description: 'Rider is on the way' },
  { id: 5, label: 'Delivered', icon: '🎉', description: 'Enjoy your meal!' },
];

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [currentStep, setCurrentStep] = useState(1);
  const [eta, setEta] = useState(30);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Simulate order progress
    const steps = [2, 3, 4, 5];
    let delay = 2000;
    steps.forEach((step) => {
      setTimeout(() => {
        setCurrentStep(step);
        setEta((prev) => Math.max(5, prev - 6));
        Animated.timing(progressAnim, {
          toValue: (step - 1) / (ORDER_STEPS.length - 1),
          duration: 600,
          useNativeDriver: false,
        }).start();
      }, delay);
      delay += 3000;
    });
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Main')}>
          <Ionicons name="close" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ETA Card */}
      <View style={styles.etaCard}>
        <Text style={styles.etaEmoji}>
          {currentStep === 5 ? '🎉' : ORDER_STEPS[currentStep - 1]?.icon}
        </Text>
        <View style={styles.etaInfo}>
          <Text style={styles.etaLabel}>
            {currentStep === 5 ? 'Delivered!' : `Arriving in`}
          </Text>
          {currentStep < 5 && (
            <Text style={styles.etaTime}>{eta} mins</Text>
          )}
          <Text style={styles.etaStatus}>{ORDER_STEPS[currentStep - 1]?.label}</Text>
        </View>
      </View>

      <Text style={styles.orderId}>Order #{orderId.toString().slice(-8).toUpperCase()}</Text>

      {/* Progress Steps */}
      <View style={styles.stepsContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>

        {ORDER_STEPS.map((step, index) => {
          const isDone = currentStep > step.id;
          const isActive = currentStep === step.id;
          return (
            <View key={step.id} style={styles.step}>
              <View style={[styles.stepCircle, isDone && styles.donCircle, isActive && styles.activeCircle]}>
                {isDone ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Text style={[styles.stepNum, isActive && styles.activeStepNum]}>{step.id}</Text>
                )}
              </View>
              <View style={styles.stepInfo}>
                <Text style={[styles.stepLabel, (isDone || isActive) && styles.activeStepLabel]}>{step.label}</Text>
                {isActive && <Text style={styles.stepDesc}>{step.description}</Text>}
              </View>
            </View>
          );
        })}
      </View>

      {/* Rider Info */}
      {(currentStep === 4 || currentStep === 5) && (
        <View style={styles.riderCard}>
          <View style={styles.riderAvatar}>
            <Text style={styles.riderEmoji}>🏍️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.riderName}>Rahul Kumar</Text>
            <Text style={styles.riderInfo}>Your delivery partner</Text>
          </View>
          <TouchableOpacity style={styles.callBtn}>
            <Ionicons name="call" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {currentStep === 5 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.rateBtn} onPress={() => navigation.navigate('Main')}>
            <Text style={styles.rateBtnText}>⭐ Rate Your Experience</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  etaCard: { backgroundColor: COLORS.primary, margin: 16, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  etaEmoji: { fontSize: 48 },
  etaInfo: { flex: 1 },
  etaLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  etaTime: { fontSize: 32, fontWeight: '800', color: '#fff' },
  etaStatus: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  orderId: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginBottom: 16 },
  stepsContainer: { backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 16, padding: 20, gap: 16 },
  progressTrack: { position: 'absolute', left: 36, top: 36, width: 3, height: '80%', backgroundColor: COLORS.border },
  progressFill: { backgroundColor: COLORS.primary, borderRadius: 2 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  donCircle: { backgroundColor: COLORS.green },
  activeCircle: { backgroundColor: COLORS.primary },
  stepNum: { fontSize: 13, fontWeight: '700', color: COLORS.gray },
  activeStepNum: { color: '#fff' },
  stepInfo: { flex: 1, paddingTop: 5 },
  stepLabel: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  activeStepLabel: { color: COLORS.black },
  stepDesc: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  riderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, margin: 16, borderRadius: 16, padding: 16, gap: 12 },
  riderAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  riderEmoji: { fontSize: 24 },
  riderName: { fontSize: 16, fontWeight: '700', color: COLORS.black },
  riderInfo: { fontSize: 12, color: COLORS.gray },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.green, justifyContent: 'center', alignItems: 'center' },
  footer: { padding: 16, marginTop: 'auto' },
  rateBtn: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  rateBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});