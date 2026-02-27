import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';

const BLUE = '#2563EB';
const GRAY_50 = '#F9FAFB';
const GRAY_100 = '#F3F4F6';
const GRAY_400 = '#9CA3AF';
const GRAY_500 = '#6B7280';
const GRAY_700 = '#374151';
const GRAY_900 = '#111827';
const RED = '#EF4444';

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words';
  secureTextEntry?: boolean;
  showToggle?: boolean;
  onToggle?: () => void;
  toggleState?: boolean;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none',
  secureTextEntry,
  showToggle,
  onToggle,
  toggleState,
}: FieldProps) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: GRAY_700, marginBottom: 8 }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: GRAY_50,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: GRAY_100,
          paddingHorizontal: 16,
          height: 52,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={GRAY_400}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          style={{ flex: 1, fontSize: 15, color: GRAY_900 }}
        />
        {showToggle && (
          <Pressable onPress={onToggle} hitSlop={8}>
            <Ionicons
              name={toggleState ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={GRAY_400}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const login = useStore((s) => s.login);

  const [businessName, setBusinessName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.');
      return;
    }

    setLoading(true);
    try {
      await api.post(
        '/business/register',
        {
          name: businessName.trim() || `${fullName.trim()}'s Practice`,
          entity_type: 'llc',
          state_of_incorporation: 'CA',
          address: '',
          city: '',
          state: 'CA',
          zip_code: '00000',
          phone: phone.trim() || '0000000000',
          email: email.trim(),
          owner_name: fullName.trim(),
          owner_email: email.trim(),
          owner_password: password,
        },
        { noAuth: true },
      );

      await login(email.trim(), password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: 60, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      >
        <View style={{ paddingHorizontal: 28 }}>
          {/* Back Button */}
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: GRAY_100,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
            }}
          >
            <Ionicons name="arrow-back" size={20} color={GRAY_700} />
          </Pressable>

          {/* Header */}
          <Text style={{ fontSize: 26, fontWeight: '700', color: GRAY_900, marginBottom: 8 }}>
            Create account
          </Text>
          <Text style={{ fontSize: 14, color: GRAY_500, marginBottom: 32 }}>
            Fill in your details to get started
          </Text>

          {/* Form Fields */}
          <Field
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Lois Becket"
            autoCapitalize="words"
          />

          <Field
            label="Business Name (optional)"
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Becket Home Care LLC"
            autoCapitalize="words"
          />

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="loisbecket@gmail.com"
            keyboardType="email-address"
          />

          <Field
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="(454) 726-0592"
            keyboardType="phone-pad"
          />

          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            showToggle
            onToggle={() => setShowPassword(!showPassword)}
            toggleState={showPassword}
          />

          <Field
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            secureTextEntry={!showConfirm}
            showToggle
            onToggle={() => setShowConfirm(!showConfirm)}
            toggleState={showConfirm}
          />

          {/* Register Button */}
          <Pressable
            onPress={handleRegister}
            disabled={loading}
            style={{
              backgroundColor: BLUE,
              borderRadius: 12,
              height: 52,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: loading ? 0.7 : 1,
              marginTop: 8,
              marginBottom: 24,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Register</Text>
            )}
          </Pressable>

          {/* Login Link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <Text style={{ fontSize: 14, color: GRAY_500 }}>Already have an account? </Text>
            <Pressable onPress={() => router.back()}>
              <Text style={{ fontSize: 14, color: BLUE, fontWeight: '600' }}>Login</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
