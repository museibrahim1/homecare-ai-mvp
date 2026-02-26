import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { getToken, getCachedUser } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { registerForPushNotifications } from '@/lib/notifications';
import LoadingScreen from '@/components/LoadingScreen';
import '../global.css';

const DARK_BG = '#0a1628';

const stackHeaderOptions = {
  headerStyle: { backgroundColor: DARK_BG },
  headerTintColor: '#ffffff',
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

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
      <View style={{ flex: 1, backgroundColor: DARK_BG }}>
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
          contentStyle: { backgroundColor: DARK_BG },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />

        <Stack.Screen
          name="client/[id]"
          options={{ headerShown: true, title: 'Client', ...stackHeaderOptions }}
        />
        <Stack.Screen
          name="client/[id]/care-plan"
          options={{ headerShown: true, title: 'Care Plan', ...stackHeaderOptions }}
        />
        <Stack.Screen
          name="client/[id]/contracts"
          options={{ headerShown: true, title: 'Contracts', ...stackHeaderOptions }}
        />
        <Stack.Screen
          name="contract/[id]"
          options={{ headerShown: true, title: 'Contract', ...stackHeaderOptions }}
        />
        <Stack.Screen
          name="pipeline/[visitId]"
          options={{ headerShown: true, title: 'Pipeline', ...stackHeaderOptions }}
        />
        <Stack.Screen
          name="chat"
          options={{ headerShown: true, title: 'Team Chat', ...stackHeaderOptions }}
        />
        <Stack.Screen
          name="settings"
          options={{ headerShown: true, title: 'Settings', ...stackHeaderOptions }}
        />
      </Stack>
    </>
  );
}
