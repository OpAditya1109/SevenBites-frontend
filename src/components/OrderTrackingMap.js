import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Mapbox, { MapView, Camera, PointAnnotation, ShapeSource, LineLayer } from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN);

// Mapbox version of the restaurant → customer route.
// Note: Mapbox/GeoJSON uses [longitude, latitude] order (opposite of react-native-maps).
export default function OrderTrackingMap({
  restaurant,   // { latitude, longitude, name }
  destination,  // { latitude, longitude, address }
  rider,        // { latitude, longitude, name } | null — appears once out_for_delivery
  height = 220,
  rounded = true, // set false for a full-bleed hero usage (no radius/margin)
  style,
}) {
  const cameraRef = useRef(null);

  const hasRoute = !!(restaurant?.latitude && restaurant?.longitude && destination?.latitude && destination?.longitude);

  useEffect(() => {
    if (!hasRoute || !cameraRef.current) return;

    const lats = [restaurant.latitude, destination.latitude];
    const lngs = [restaurant.longitude, destination.longitude];
    if (rider?.latitude && rider?.longitude) {
      lats.push(rider.latitude);
      lngs.push(rider.longitude);
    }

    const ne = [Math.max(...lngs), Math.max(...lats)];
    const sw = [Math.min(...lngs), Math.min(...lats)];

    const t = setTimeout(() => {
      cameraRef.current?.fitBounds(ne, sw, 50, 500);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRoute, rider?.latitude, rider?.longitude]);

  if (!hasRoute) {
    return (
      <View style={[styles.fallback, !rounded && styles.flat, { height }, style]}>
        <Ionicons name="map-outline" size={22} color={COLORS.gray} />
        <Text style={styles.fallbackText}>Map preview isn't available for this order.</Text>
      </View>
    );
  }

  const restaurantCoord = [restaurant.longitude, restaurant.latitude];
  const destinationCoord = [destination.longitude, destination.latitude];
  const riderCoord = rider?.latitude && rider?.longitude
    ? [rider.longitude, rider.latitude]
    : null;

  const centerCoord = [
    (restaurantCoord[0] + destinationCoord[0]) / 2,
    (restaurantCoord[1] + destinationCoord[1]) / 2,
  ];

  const travelledLine = riderCoord
    ? { type: 'Feature', geometry: { type: 'LineString', coordinates: [restaurantCoord, riderCoord] } }
    : null;

  const remainingLine = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: riderCoord ? [riderCoord, destinationCoord] : [restaurantCoord, destinationCoord],
    },
  };

  return (
    <View style={[styles.wrap, !rounded && styles.flat, { height }, style]}>
      <MapView style={StyleSheet.absoluteFill} scaleBarEnabled={false} logoEnabled={true} attributionEnabled={true}>
        <Camera
          ref={cameraRef}
          defaultSettings={{ centerCoordinate: centerCoord, zoomLevel: 13 }}
          animationMode="none"
        />

        {travelledLine && (
          <ShapeSource id="travelledSource" shape={travelledLine}>
            <LineLayer id="travelledLayer" style={{ lineColor: COLORS.green, lineWidth: 4 }} />
          </ShapeSource>
        )}

        <ShapeSource id="remainingSource" shape={remainingLine}>
          <LineLayer
            id="remainingLayer"
            style={{ lineColor: COLORS.primary, lineWidth: 4, lineDasharray: [2, 2] }}
          />
        </ShapeSource>

        <PointAnnotation id="restaurantPin" coordinate={restaurantCoord}>
          <View style={[styles.pin, styles.pinPrimary]}>
            <Ionicons name="restaurant" size={14} color="#fff" />
          </View>
        </PointAnnotation>

        <PointAnnotation id="destinationPin" coordinate={destinationCoord}>
          <View style={[styles.pin, styles.pinDark]}>
            <Ionicons name="location" size={14} color="#fff" />
          </View>
        </PointAnnotation>

        {riderCoord && (
          <PointAnnotation id="riderPin" coordinate={riderCoord}>
            <View style={[styles.pin, styles.pinRider]}>
              <Ionicons name="bicycle" size={15} color="#fff" />
            </View>
          </PointAnnotation>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  fallback: {
    borderRadius: 16, marginBottom: 12, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20,
  },
  flat: { borderRadius: 0, marginBottom: 0 },
  fallbackText: { fontSize: 12, color: COLORS.gray, textAlign: 'center' },
  pin: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3,
  },
  pinPrimary: { backgroundColor: COLORS.primary },
  pinDark: { backgroundColor: COLORS.black },
  pinRider: { backgroundColor: COLORS.green },
});