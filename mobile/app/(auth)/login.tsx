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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/lib/store';

export default function LoginScreen() {
  const router = useRouter();
  const login = useStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        className="flex-1 bg-dark-900"
      >
        <View className="px-8">
          <View className="items-center mb-10">
            <View className="w-16 h-16 rounded-2xl bg-palm-500 items-center justify-center mb-4">
              <Ionicons name="hand-left" size={32} color="#ffffff" />
            </View>
            <Text className="text-white text-2xl font-bold">PalmCare AI</Text>
            <Text className="text-dark-400 text-sm mt-1">Sign in to your account</Text>
          </View>

          <View className="mb-4">
            <Text className="text-dark-300 text-sm font-medium mb-1.5">Email</Text>
            <View className="flex-row items-center bg-dark-800 rounded-xl border border-dark-700 px-4">
              <Ionicons name="mail-outline" size={18} color="#829bcd" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@company.com"
                placeholderTextColor="#4b5563"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                className="flex-1 text-white py-3.5 ml-3 text-[15px]"
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-dark-300 text-sm font-medium mb-1.5">Password</Text>
            <View className="flex-row items-center bg-dark-800 rounded-xl border border-dark-700 px-4">
              <Ionicons name="lock-closed-outline" size={18} color="#829bcd" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#4b5563"
                secureTextEntry={!showPassword}
                autoComplete="password"
                className="flex-1 text-white py-3.5 ml-3 text-[15px]"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#829bcd"
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className="bg-palm-500 rounded-xl py-4 items-center active:opacity-80"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-semibold text-base">Sign In</Text>
            )}
          </Pressable>

          <View className="flex-row items-center justify-center mt-6">
            <Ionicons name="shield-checkmark" size={14} color="#22c55e" />
            <Text className="text-dark-500 text-xs ml-1.5">HIPAA Compliant · 256-bit Encrypted</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
