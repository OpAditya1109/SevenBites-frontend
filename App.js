import './src/services/backgroundNotificationTask'; // MUST be first import — registers the headless background task at module scope

import React, { useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { OrderTrackingProvider } from './src/context/OrderTrackingProvider';
import {
  ensureNotificationChannel,
  requestNotificationPermission,
  registerPushTokenWithBackend,
} from './src/services/orderNotifications';
import { registerBackgroundNotificationTask } from './src/services/backgroundNotificationTask';
import { registerPushToken } from './src/services/api';

SplashScreen.preventAutoHideAsync();

// Registers the Expo push token with the backend once the user is logged in.
// Lives inside AuthProvider so it can read isAuthenticated via useAuth().
function PushTokenSync() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      registerPushTokenWithBackend(registerPushToken);
    }
  }, [isAuthenticated]);

  return null;
}

export default function App() {
  useEffect(() => {
    ensureNotificationChannel();
    requestNotificationPermission();
    registerBackgroundNotificationTask();
  }, []);

  // PART 5 — splash-screen timing fix: hide once the root view has actually
  // laid out, instead of hiding immediately on mount.
  const onLayoutRootView = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <AuthProvider>
          <PushTokenSync />
          <CartProvider>
            <OrderTrackingProvider>
              <StatusBar style="dark" />
              <AppNavigator />
            </OrderTrackingProvider>
          </CartProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}