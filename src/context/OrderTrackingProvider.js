import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectOrderSocket } from '../services/api';
import { showOrderTrackingNotification, clearOrderTrackingNotification } from '../services/orderNotifications';

const STORAGE_KEY = 'sevenbites_active_order_id';
const TERMINAL_STATUSES = ['delivered', 'cancelled', 'rejected'];

const OrderTrackingContext = createContext();

export function OrderTrackingProvider({ children }) {
  const [activeOrderId, setActiveOrderIdState] = useState(null);
  const joinedRoomRef = useRef(null);

  // Restore any in-flight order on cold start
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setActiveOrderIdState(stored);
    })();
  }, []);

  const setActiveOrderId = useCallback(async (orderId) => {
    setActiveOrderIdState(orderId);
    if (orderId) {
      await AsyncStorage.setItem(STORAGE_KEY, orderId);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!activeOrderId) return;

    const socket = connectOrderSocket();

    if (joinedRoomRef.current !== activeOrderId) {
      socket.emit('join_order_room', activeOrderId);
      joinedRoomRef.current = activeOrderId;
    }

    const onUpdate = (order) => {
      const orderId = order?._id || order?.id;
      if (String(orderId) !== String(activeOrderId)) return;

      showOrderTrackingNotification(order);

      if (TERMINAL_STATUSES.includes(order.status)) {
        setActiveOrderId(null);
      }
    };

    socket.on('order_status_updated', onUpdate);

    return () => {
      socket.off('order_status_updated', onUpdate);
    };
  }, [activeOrderId, setActiveOrderId]);

  return (
    <OrderTrackingContext.Provider value={{ activeOrderId, setActiveOrderId }}>
      {children}
    </OrderTrackingContext.Provider>
  );
}

export const useOrderTracking = () => useContext(OrderTrackingContext);