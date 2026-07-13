import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  TextInput, ActivityIndicator, Modal, Animated, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS } from '../utils/constants';
import { getUserAddresses, addAddress, deleteAddress, setDefaultAddress } from '../services/api';
import { AppLoader, LOADING_MESSAGES, ButtonLoader } from '../components/AppLoader';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const EMPTY_FORM = { type: 'Home', flatNo: '', street: '', landmark: '', city: '', state: '', pincode: '', latitude: null, longitude: null };
const LABEL_OPTIONS = ['Home', 'Work', 'Other'];
const LABEL_ICONS = { Home: 'home', Work: 'briefcase', Other: 'location' };

export default function AddressScreen({ navigation, route }) {
  const onSelect = route?.params?.onSelect;

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => { loadAddresses(); }, []);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const res = await getUserAddresses();
      setAddresses(res.data.data || res.data);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const openSheet = (prefill = {}) => {
    setForm({ ...EMPTY_FORM, ...prefill });
    setShowSheet(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true })
      .start(() => setShowSheet(false));
  };

  const detectLocation = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed to auto-detect your address. You can still type it manually.');
        setGpsLoading(false);
        openSheet();
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geocode] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geocode) {
        openSheet({
          street: [geocode.streetNumber, geocode.street].filter(Boolean).join(' '),
          landmark: geocode.district || geocode.subregion || '',
          city: geocode.city || geocode.subregion || '',
          state: geocode.region || '',
          pincode: geocode.postalCode || '',
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } else {
        openSheet({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    } catch (err) {
      Alert.alert('Location Error', 'Could not fetch location. Please enter manually.');
      openSheet();
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.street.trim() || !form.city.trim()) {
      Alert.alert('Required', 'Street address and city are required.');
      return;
    }
    setSaving(true);
    try {
      let payload = form;

      if (form.latitude == null || form.longitude == null) {
        const coords = await geocodeTypedAddress(form);
        if (coords) {
          payload = { ...form, latitude: coords.latitude, longitude: coords.longitude };
        }
      }

      const res = await addAddress(payload);
      const saved = res.data.data || res.data;
      const updated = [...addresses, saved];
      setAddresses(updated);
      closeSheet();

      if (onSelect) {
        onSelect(saved);
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not save address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const geocodeTypedAddress = async (f) => {
    const query = [f.flatNo, f.street, f.landmark, f.city, f.state, f.pincode].filter(Boolean).join(', ');
    if (!query.trim()) return null;
    try {
      const results = await Location.geocodeAsync(query);
      if (results && results.length > 0) {
        return { latitude: results[0].latitude, longitude: results[0].longitude };
      }
    } catch {
      // Geocoding failed — save without coords.
    }
    return null;
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultAddress(id);
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a._id === id })));
      if (onSelect) {
        const selected = addresses.find((a) => a._id === id);
        if (selected) { onSelect({ ...selected, isDefault: true }); navigation.goBack(); }
      }
    } catch {
      Alert.alert('Error', 'Could not update default address.');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Address', 'Remove this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteAddress(id);
            setAddresses((prev) => prev.filter((a) => a._id !== id));
          } catch {
            setAddresses((prev) => prev.filter((a) => a._id !== id));
          }
        },
      },
    ]);
  };

  const updateForm = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{onSelect ? 'Select Address' : 'My Addresses'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <TouchableOpacity style={styles.gpsBanner} onPress={detectLocation} disabled={gpsLoading} activeOpacity={0.8}>
          {gpsLoading ? (
            <ActivityIndicator size={20} color={COLORS.primary} />
          ) : (
            <Ionicons name="navigate" size={22} color={COLORS.primary} />
          )}
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.gpsTitle}>Use current location</Text>
            <Text style={styles.gpsSub}>{gpsLoading ? 'Detecting your location…' : 'Auto-detect via GPS and add address'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.darkTextSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.manualBtn} onPress={() => openSheet()} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.manualBtnText}>Enter address manually</Text>
        </TouchableOpacity>

        {loading ? (
          <AppLoader messages={LOADING_MESSAGES.address} />
        ) : addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={48} color={COLORS.darkTextSecondary} />
            <Text style={styles.emptyTitle}>No saved addresses</Text>
            <Text style={styles.emptySub}>Add an address to get started</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>SAVED ADDRESSES</Text>
            {addresses.map((addr) => (
              <View key={addr._id} style={[styles.addressCard, addr.isDefault && styles.defaultCard]}>
                <View style={styles.addrTop}>
                  <View style={styles.addrTypeRow}>
                    <Ionicons
                      name={LABEL_ICONS[addr.type] || 'location'}
                      size={15}
                      color={addr.isDefault ? COLORS.primary : COLORS.darkTextSecondary}
                    />
                    <Text style={[styles.addrType, addr.isDefault && styles.addrTypeDefault]}>{addr.type}</Text>
                    {addr.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(addr._id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={17} color={COLORS.darkTextSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.addrText}>{[addr.flatNo, addr.street, addr.landmark].filter(Boolean).join(', ')}</Text>
                <Text style={styles.addrCity}>{[addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}</Text>

                {!addr.isDefault && (
                  <TouchableOpacity style={styles.setDefaultBtn} onPress={() => handleSetDefault(addr._id)}>
                    <Text style={styles.setDefaultText}>Set as default</Text>
                  </TouchableOpacity>
                )}

                {onSelect && (
                  <TouchableOpacity style={styles.selectBtn} onPress={() => { onSelect(addr); navigation.goBack(); }}>
                    <Text style={styles.selectBtnText}>Deliver here</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {showSheet && (
        <Modal transparent animationType="none" onRequestClose={closeSheet}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeSheet} />
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.sheetHandleRow}>
                  <View style={styles.sheetHandle} />
                </View>

                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Add Address</Text>
                  <TouchableOpacity onPress={closeSheet}>
                    <Ionicons name="close" size={22} color={COLORS.white} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>Address Type</Text>
                <View style={styles.typeRow}>
                  {LABEL_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.typeChip, form.type === opt && styles.typeChipActive]}
                      onPress={() => updateForm('type', opt)}
                    >
                      <Ionicons name={LABEL_ICONS[opt]} size={14} color={form.type === opt ? COLORS.primary : COLORS.darkTextSecondary} />
                      <Text style={[styles.typeChipText, form.type === opt && styles.typeChipTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {[
                  { key: 'flatNo', label: 'Flat / House No.', placeholder: 'e.g. 201, Tower B', icon: 'home-outline' },
                  { key: 'street', label: 'Street Address *', placeholder: 'Street, area, locality', icon: 'map-outline', multiline: true },
                  { key: 'landmark', label: 'Landmark', placeholder: 'Nearby landmark (optional)', icon: 'flag-outline' },
                  { key: 'city', label: 'City *', placeholder: 'City', icon: 'business-outline' },
                  { key: 'state', label: 'State', placeholder: 'State', icon: 'globe-outline' },
                  { key: 'pincode', label: 'Pincode', placeholder: '6-digit pincode', icon: 'mail-outline', keyboard: 'numeric' },
                ].map((f) => (
                  <View key={f.key} style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    <View style={[styles.fieldInputRow, f.multiline && { alignItems: 'flex-start', paddingVertical: 10 }]}>
                      <Ionicons name={f.icon} size={16} color={COLORS.darkTextSecondary} style={{ marginTop: f.multiline ? 2 : 0, marginRight: 10 }} />
                      <TextInput
                        style={[styles.fieldInput, f.multiline && { height: 70, textAlignVertical: 'top' }]}
                        placeholder={f.placeholder}
                        value={form[f.key]}
                        onChangeText={(v) => updateForm(f.key, v)}
                        keyboardType={f.keyboard || 'default'}
                        multiline={f.multiline}
                        placeholderTextColor={COLORS.darkTextSecondary}
                      />
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ButtonLoader label="Saving..." /> : <Text style={styles.saveBtnText}>Save Address</Text>}
                </TouchableOpacity>

                <View style={{ height: 32 }} />
              </ScrollView>
            </KeyboardAvoidingView>
          </Animated.View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.darkBg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.darkBg, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },

  gpsBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.darkCard, margin: 16,
    borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: 'rgba(226,55,68,0.25)',
  },
  gpsTitle: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  gpsSub: { fontSize: 12, color: COLORS.darkTextSecondary, marginTop: 2 },

  manualBtn: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, gap: 8 },
  manualBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.darkTextSecondary, letterSpacing: 0.8, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  addressCard: {
    backgroundColor: COLORS.darkCard, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, gap: 4,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  defaultCard: { borderWidth: 1.5, borderColor: 'rgba(226,55,68,0.4)' },
  addrTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  addrTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addrType: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  addrTypeDefault: { color: COLORS.primary },
  defaultBadge: { backgroundColor: 'rgba(226,55,68,0.15)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },
  addrText: { fontSize: 13, color: COLORS.darkTextSecondary, lineHeight: 20 },
  addrCity: { fontSize: 12, color: COLORS.darkTextSecondary, marginBottom: 8 },
  setDefaultBtn: { alignSelf: 'flex-start' },
  setDefaultText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  selectBtn: { marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  selectBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyState: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.white },
  emptySub: { fontSize: 14, color: COLORS.darkTextSecondary },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.darkCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, maxHeight: SCREEN_HEIGHT * 0.92, borderTopWidth: 1, borderColor: COLORS.darkBorder,
  },
  sheetHandleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.darkBorder },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder, marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.darkBorder,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: COLORS.darkCardAlt,
  },
  typeChipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(226,55,68,0.12)' },
  typeChipText: { fontSize: 13, fontWeight: '600', color: COLORS.darkTextSecondary },
  typeChipTextActive: { color: COLORS.primary },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.darkTextSecondary, marginBottom: 6, marginLeft: 2 },
  fieldInputRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.darkBorder,
    borderRadius: 12, paddingHorizontal: 12, height: 50, backgroundColor: COLORS.darkCardAlt,
  },
  fieldInput: { flex: 1, fontSize: 14, color: COLORS.white },

  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});