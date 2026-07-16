import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/api';
import { ButtonLoader } from '../components/AppLoader';

export default function SettingsScreen({ navigation }) {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const hasChanges = name.trim() !== (user?.name || '') || phone.trim() !== (user?.phone || '');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const res = await updateProfile({ name: name.trim(), phone: phone.trim() });
      updateUser(res.data.data || res.data);
      Alert.alert('Saved', 'Your profile has been updated');
    } catch (err) {
      Alert.alert('Update Failed', err?.response?.data?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Account</Text>

        <Text style={styles.label}>Full Name</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={18} color={COLORS.darkTextSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={COLORS.darkTextSecondary}
          />
        </View>

        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="call-outline" size={18} color={COLORS.darkTextSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Your phone number"
            placeholderTextColor={COLORS.darkTextSecondary}
            keyboardType="phone-pad"
          />
        </View>

        <Text style={styles.label}>Email</Text>
        <View style={[styles.inputWrapper, styles.disabledWrapper]}>
          <Ionicons name="mail-outline" size={18} color={COLORS.darkTextSecondary} style={styles.inputIcon} />
          <Text style={styles.disabledText}>{user?.email || 'email@example.com'}</Text>
        </View>
        <Text style={styles.hint}>Email can't be changed here.</Text>

        <TouchableOpacity
          style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
          activeOpacity={0.9}
        >
          {saving ? <ButtonLoader label="Saving..." /> : <Text style={styles.saveText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
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
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.darkTextSecondary, textTransform: 'uppercase', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.darkTextSecondary, marginBottom: 6, marginTop: 14 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.darkBorder,
    borderRadius: 12, paddingHorizontal: 14, height: 50, backgroundColor: COLORS.darkCard,
  },
  disabledWrapper: { opacity: 0.6 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: COLORS.white },
  disabledText: { flex: 1, fontSize: 15, color: COLORS.darkTextSecondary },
  hint: { fontSize: 12, color: COLORS.darkTextSecondary, marginTop: 6 },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 28,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});