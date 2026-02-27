import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

export default function MfaScreen() {
  const router = useRouter();
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
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', paddingHorizontal: 28 }}>
      <StatusBar barStyle="dark-content" />

      {/* Back Button */}
      <Pressable
        onPress={() => router.back()}
        style={{
          position: 'absolute',
          top: 60,
          left: 28,
          width: 40,
          height: 40,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: GRAY_100,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="arrow-back" size={20} color={GRAY_700} />
      </Pressable>

      <View style={{ alignItems: 'center', marginBottom: 36 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: BLUE_LIGHT,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Ionicons name="shield-checkmark" size={30} color={BLUE} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '700', color: GRAY_900, marginBottom: 8, textAlign: 'center' }}>
          Two-Factor{'\n'}Authentication
        </Text>
        <Text style={{ fontSize: 14, color: GRAY_500, textAlign: 'center', lineHeight: 20 }}>
          Enter the 6-digit code from your{'\n'}authenticator app
        </Text>
      </View>

      <View style={{ marginBottom: 28 }}>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          placeholderTextColor={GRAY_400}
          keyboardType="number-pad"
          maxLength={6}
          style={{
            backgroundColor: GRAY_50,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: GRAY_100,
            paddingHorizontal: 24,
            paddingVertical: 16,
            fontSize: 28,
            color: GRAY_900,
            textAlign: 'center',
            letterSpacing: 12,
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          }}
        />
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={loading || code.length < 6}
        style={{
          backgroundColor: BLUE,
          borderRadius: 12,
          height: 52,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: loading || code.length < 6 ? 0.5 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Verify</Text>
        )}
      </Pressable>
    </View>
  );
}
