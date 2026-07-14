import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { ButtonLoader } from '../components/AppLoader';
import { signInWithGoogle, isErrorWithCode, statusCodes } from '../services/googleAuth';

export default function RegisterScreen({ navigation }) {
  const { register, loginWithGoogle } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const update = (key, val) => setForm({ ...form, [key]: val });

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.phone || !form.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await register(form);
    } catch (err) {
      Alert.alert('Registration Failed', err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();
      await loginWithGoogle(idToken); // same endpoint — creates the account if it doesn't exist yet
    } catch (err) {
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
        // user closed the picker — no need to show an error
      } else {
        Alert.alert('Google Sign-Up Failed', err?.message || 'Something went wrong');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const fields = [
    { key: 'name', icon: 'person-outline', placeholder: 'Full Name', type: 'default' },
    { key: 'email', icon: 'mail-outline', placeholder: 'Email Address', type: 'email-address' },
    { key: 'phone', icon: 'call-outline', placeholder: 'Phone Number', type: 'phone-pad' },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.darkBg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join us to order amazing food!</Text>
        </View>

        <View style={styles.form}>
          {fields.map((f) => (
            <View key={f.key} style={styles.inputWrapper}>
              <Ionicons name={f.icon} size={20} color={COLORS.darkTextSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChangeText={(val) => update(f.key, val)}
                keyboardType={f.type}
                autoCapitalize="none"
                placeholderTextColor={COLORS.darkTextSecondary}
              />
            </View>
          ))}

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.darkTextSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              value={form.password}
              onChangeText={(val) => update('password', val)}
              secureTextEntry={!showPassword}
              placeholderTextColor={COLORS.darkTextSecondary}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.darkTextSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading} activeOpacity={0.9}>
            {loading ? <ButtonLoader label="Creating account..." /> : <Text style={styles.registerText}>Create Account</Text>}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleRegister} disabled={googleLoading} activeOpacity={0.9}>
            {googleLoading ? <ButtonLoader label="Connecting to Google..." /> : <Text style={styles.socialText}>🔵  Continue with Google</Text>}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.darkBg },
  content: { padding: SPACING.xl },
  backBtn: { marginTop: 50, marginBottom: 24 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.white },
  subtitle: { fontSize: 15, color: COLORS.darkTextSecondary, marginTop: 6 },
  form: { gap: 16 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.darkBorder,
    borderRadius: 12, paddingHorizontal: 16, height: 54, backgroundColor: COLORS.darkCard,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: COLORS.white },
  registerBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12, height: 54, justifyContent: 'center', alignItems: 'center', marginTop: 8,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  registerText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: COLORS.darkBorder },
  orText: { fontSize: 12, color: COLORS.darkTextSecondary },
  socialBtn: {
    borderWidth: 1.5, borderColor: COLORS.darkBorder, borderRadius: 12, height: 54,
    justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.darkCard,
  },
  socialText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  loginText: { fontSize: 14, color: COLORS.darkTextSecondary },
  loginLink: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
});