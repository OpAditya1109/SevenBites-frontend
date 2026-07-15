import notifee, { AndroidStyle, AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const CHANNEL_ID = 'order_tracking';
const NOTIFICATION_ID = 'active-order';
const BRAND_COLOR = '#E23744';

const STATUS_MAP = {
  placed: { step: 0, emoji: '📝', title: 'Order Placed' },
  confirmed: { step: 1, emoji: '✅', title: 'Order Confirmed' },
  preparing: { step: 2, emoji: '👨\u200d🍳', title: 'Being Prepared' },
  ready: { step: 2, emoji: '👨\u200d🍳', title: 'Packed & Ready' },
  out_for_delivery: { step: 3, emoji: '🛵', title: 'Out for Delivery' },
  delivered: { step: 4, emoji: '🎉', title: 'Delivered!' },
  cancelled: { step: -1, emoji: '❌', title: 'Order Cancelled' },
  rejected: { step: -1, emoji: '❌', title: 'Order Rejected' },
};

// So expo-notifications doesn't suppress alerts while the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Call once at app root mount. Safe to call repeatedly — Notifee no-ops if
// the channel already exists.
export async function ensureNotificationChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Order Tracking',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
  });
}

export async function requestNotificationPermission() {
  return notifee.requestPermission();
}

// order: { status, restaurantName, estimatedDeliveryTime, deliveryAddress }
export async function showOrderTrackingNotification(order) {
  if (!order || !order.status) return;

  const meta = STATUS_MAP[order.status] || STATUS_MAP.placed;
  const isActive = !['delivered', 'cancelled', 'rejected'].includes(order.status);

  const bodyLines = [
    `${meta.emoji} ${meta.title}`,
    order.estimatedDeliveryTime ? `ETA: ${order.estimatedDeliveryTime}` : null,
    order.deliveryAddress ? `Delivering to: ${order.deliveryAddress}` : null,
  ].filter(Boolean);

  const androidConfig = {
    channelId: CHANNEL_ID,
    color: BRAND_COLOR,
    ongoing: isActive,
    onlyAlertOnce: true,
    smallIcon: 'notification_icon', // wired up via the expo-notifications plugin config in app.json
    style: { type: AndroidStyle.BIGTEXT, text: bodyLines.join('\n') },
    pressAction: { id: 'default' },
  };

  if (meta.step >= 0) {
    androidConfig.progress = { max: 4, current: meta.step, indeterminate: false };
  }

  await notifee.displayNotification({
    id: NOTIFICATION_ID, // fixed id — updates replace in place, never stack
    title: `${order.restaurantName || 'SevenBites'} — ${meta.title}`,
    body: bodyLines.join('\n'),
    android: androidConfig,
  });

  if (order.status === 'delivered') {
    setTimeout(() => {
      notifee.cancelNotification(NOTIFICATION_ID).catch(() => {});
    }, 15000);
  }
}

// Quick manual test — call this from a button anywhere (e.g. a debug row on
// the Profile screen) to confirm Notifee can actually display a notification
// on this device, independent of the real order/socket/push pipeline.
export async function sendTestNotification() {
  await ensureNotificationChannel();
  const granted = await requestNotificationPermission();
  console.log('Notification permission result:', granted);

  await notifee.displayNotification({
    id: 'test-notification',
    title: 'SevenBites — Test Notification',
    body: 'If you can see this, Notifee is working correctly on this device.',
    android: {
      channelId: CHANNEL_ID,
      color: BRAND_COLOR,
      pressAction: { id: 'default' },
    },
  });
}

export async function clearOrderTrackingNotification() {
  await notifee.cancelNotification(NOTIFICATION_ID).catch(() => {});
}

// ── Push token registration with the backend ──────────────────────────
// Call once the user is authenticated (see App.js's PushTokenSync).
// Pass in the api.js registerPushToken function so this file doesn't
// depend on api.js directly (avoids a require cycle).
export async function registerPushTokenWithBackend(registerPushTokenApiCall) {
  try {
    const Device = require('expo-device');
    if (!Device.isDevice) return; // push tokens don't work on simulators/emulators

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const expoPushToken = tokenResponse?.data;
    if (!expoPushToken) return;

    await registerPushTokenApiCall({ expoPushToken, platform: 'android' });
  } catch (err) {
    console.error('Push token registration failed:', err.message);
  }
}