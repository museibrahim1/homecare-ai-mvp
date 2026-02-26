import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/lib/store';

export default function MfaScreen() {
  const { mfaToken } = useLocalSearchParams<{ mfaToken: string }>();
  const completeMfa = useStore((s) => s.completeMfa);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (code.length < 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code from your authenticator app.');
      return;
    }

    setLoading(true);
    try {
      await completeMfa(mfaToken || '', code);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid code. Please try again.';
      Alert.alert('Verification Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-dark-900 justify-center px-8">
      <View className="items-center mb-10">
        <View className="w-16 h-16 rounded-2xl bg-palm-500/20 items-center justify-center mb-4">
          <Ionicons name="shield-checkmark" size={32} color="#0d9488" />
        </View>
        <Text className="text-white text-2xl font-bold">Two-Factor Authentication</Text>
        <Text className="text-dark-400 text-sm mt-2 text-center leading-5">
          Enter the 6-digit code from your authenticator app
        </Text>
      </View>

      <View className="mb-6">
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          placeholderTextColor="#4b5563"
          keyboardType="number-pad"
          maxLength={6}
          className="bg-dark-800 rounded-xl border border-dark-700 px-6 py-4 text-white text-center text-2xl tracking-[12px] font-mono"
        />
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={loading || code.length < 6}
        className="bg-palm-500 rounded-xl py-4 items-center active:opacity-80"
        style={{ opacity: loading || code.length < 6 ? 0.5 : 1 }}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-white font-semibold text-base">Verify</Text>
        )}
      </Pressable>
    </View>
  );
}
