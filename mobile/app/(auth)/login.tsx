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
import { useStore } from '@/lib/store';

const BLUE = '#2563EB';
const BLUE_LIGHT = '#EFF6FF';
const GRAY_50 = '#F9FAFB';
const GRAY_100 = '#F3F4F6';
const GRAY_400 = '#9CA3AF';
const GRAY_500 = '#6B7280';
const GRAY_700 = '#374151';
const GRAY_900 = '#111827';

export default function LoginScreen() {
  const router = useRouter();
  const login = useStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.requiresMfa) {
        router.push({ pathname: '/(auth)/mfa', params: { mfaToken: result.mfaToken } });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      Alert.alert('Login Failed', message);
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
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      >
        <View style={{ paddingHorizontal: 28, paddingBottom: 40 }}>
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 36 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: BLUE,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <Ionicons name="shield-checkmark" size={30} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 26, fontWeight: '700', color: GRAY_900, marginBottom: 8 }}>
              Sign in to your{'\n'}Account
            </Text>
            <Text style={{ fontSize: 14, color: GRAY_500, textAlign: 'center' }}>
              Enter your email and password to log in
            </Text>
          </View>

          {/* Email Field */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: GRAY_700, marginBottom: 8 }}>
              Email
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
                value={email}
                onChangeText={setEmail}
                placeholder="Loisbecket@gmail.com"
                placeholderTextColor={GRAY_400}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={{ flex: 1, fontSize: 15, color: GRAY_900 }}
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: GRAY_700, marginBottom: 8 }}>
              Password
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
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={GRAY_400}
                secureTextEntry={!showPassword}
                autoComplete="password"
                style={{ flex: 1, fontSize: 15, color: GRAY_900 }}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={GRAY_400}
                />
              </Pressable>
            </View>
          </View>

          {/* Remember Me + Forgot */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 28,
            }}
          >
            <Pressable
              onPress={() => setRememberMe(!rememberMe)}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 1.5,
                  borderColor: rememberMe ? BLUE : GRAY_400,
                  backgroundColor: rememberMe ? BLUE : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 8,
                }}
              >
                {rememberMe && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <Text style={{ fontSize: 13, color: GRAY_500 }}>Remember me</Text>
            </Pressable>
            <Pressable>
              <Text style={{ fontSize: 13, color: BLUE, fontWeight: '600' }}>Forgot Password?</Text>
            </Pressable>
          </View>

          {/* Login Button */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: BLUE,
              borderRadius: 12,
              height: 52,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: loading ? 0.7 : 1,
              marginBottom: 24,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Log In</Text>
            )}
          </Pressable>

          {/* Divider */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: GRAY_100 }} />
            <Text style={{ marginHorizontal: 16, fontSize: 13, color: GRAY_400 }}>Or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: GRAY_100 }} />
          </View>

          {/* Social Buttons */}
          <Pressable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              height: 52,
              borderWidth: 1,
              borderColor: GRAY_100,
              backgroundColor: '#FFFFFF',
              marginBottom: 12,
            }}
          >
            <Ionicons name="logo-google" size={20} color="#DB4437" />
            <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: '500', color: GRAY_700 }}>
              Continue with Google
            </Text>
          </Pressable>

          <Pressable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              height: 52,
              borderWidth: 1,
              borderColor: GRAY_100,
              backgroundColor: '#FFFFFF',
              marginBottom: 28,
            }}
          >
            <Ionicons name="logo-apple" size={22} color={GRAY_900} />
            <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: '500', color: GRAY_700 }}>
              Continue with Apple
            </Text>
          </Pressable>

          {/* Sign Up Link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <Text style={{ fontSize: 14, color: GRAY_500 }}>Don't have an account? </Text>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={{ fontSize: 14, color: BLUE, fontWeight: '600' }}>Sign Up</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
