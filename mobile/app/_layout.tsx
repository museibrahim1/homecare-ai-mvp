import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { getToken, getCachedUser } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { registerForPushNotifications } from '@/lib/notifications';
import LoadingScreen from '@/components/LoadingScreen';
import '../global.css';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const fetchUser = useStore((s) => s.fetchUser);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        try {
          await fetchUser();
        } catch {
          const cached = await getCachedUser();
          if (cached) {
            try {
              setUser(JSON.parse(cached));
            } catch {
              // corrupt cache
            }
          }
        }
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;

    const inAuth = segments[0] === '(auth)';

    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, segments, ready]);

  useEffect(() => {
    if (user) {
      registerForPushNotifications();
    }
  }, [user]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a1628' }}>
        <LoadingScreen message="Loading PalmCare AI..." />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a1628' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
