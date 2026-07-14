import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import notifee, { EventType } from '@notifee/react-native';
import { showOrderTrackingNotification } from './orderNotifications';

const BACKGROUND_NOTIFICATION_TASK = 'SEVENBITES_BACKGROUND_NOTIFICATION_TASK';

// Fires when a push arrives while the app is backgrounded OR fully killed.
// The push's `data` payload carries the full order snapshot (see
// pushOrderUpdateToCustomer in the backend) so we can rebuild the exact same
// Notifee card here that showOrderTrackingNotification() renders in foreground.
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background notification task error:', error);
    return;
  }

  const pushData = data?.notification?.request?.content?.data || data?.data || data;
  if (pushData?.type === 'order_status') {
    await showOrderTrackingNotification({
      status: pushData.status,
      restaurantName: pushData.restaurantName,
      estimatedDeliveryTime: pushData.estimatedDeliveryTime,
      deliveryAddress: pushData.deliveryAddress,
    });
  }
});

export async function registerBackgroundNotificationTask() {
  try {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
  } catch (err) {
    console.error('Failed to register background notification task:', err.message);
  }
}

// Handles taps/dismissals on the notification while backgrounded/killed.
notifee.onBackgroundEvent(async ({ type }) => {
  if (type === EventType.PRESS || type === EventType.DISMISSED) {
    // No-op today — tapping opens the app to its default screen.
    // Hook navigation here later if you want a tap to deep-link to OrderTracking.
  }
});

export { BACKGROUND_NOTIFICATION_TASK };