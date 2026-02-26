import { View, Text, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/lib/store';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Settings',
          headerStyle: { backgroundColor: '#0a1628' },
          headerTintColor: '#ffffff',
          headerShadowVisible: false,
        }}
      />
      <ScrollView className="flex-1 bg-dark-900 px-5" contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}>
        {/* Profile */}
        <View className="bg-dark-800 rounded-xl p-5 items-center mb-6">
          <View className="w-16 h-16 rounded-full bg-palm-500/20 items-center justify-center mb-3">
            <Ionicons name="person" size={28} color="#0d9488" />
          </View>
          <Text className="text-white text-lg font-bold">{user?.full_name || 'User'}</Text>
          <Text className="text-dark-400 text-sm mt-0.5">{user?.email}</Text>
          {user?.role && (
            <View className="bg-palm-500/20 rounded-full px-3 py-1 mt-2">
              <Text className="text-palm-400 text-xs font-medium capitalize">{user.role}</Text>
            </View>
          )}
          {user?.company_name && (
            <Text className="text-dark-400 text-xs mt-1.5">{user.company_name}</Text>
          )}
        </View>

        {/* Info items */}
        <View className="bg-dark-800 rounded-xl overflow-hidden mb-6">
          {[
            { label: 'App Version', value: Constants.expoConfig?.version || '1.0.0', icon: 'information-circle' as const },
            { label: 'Environment', value: 'Production', icon: 'server' as const },
          ].map((item, i, arr) => (
            <View
              key={item.label}
              className="flex-row items-center px-4 py-3.5"
              style={i < arr.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: '#1e3f76' } : {}}
            >
              <Ionicons name={item.icon} size={18} color="#829bcd" />
              <Text className="text-white text-[15px] ml-3 flex-1">{item.label}</Text>
              <Text className="text-dark-400 text-sm">{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Security */}
        <View className="bg-dark-800 rounded-xl p-4 mb-6 flex-row items-center">
          <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
          <View className="ml-3 flex-1">
            <Text className="text-white text-sm font-medium">HIPAA Compliant</Text>
            <Text className="text-dark-400 text-xs mt-0.5">256-bit encrypted · SOC 2 compliant</Text>
          </View>
        </View>

        {/* Sign Out */}
        <Pressable
          onPress={handleLogout}
          className="bg-red-500/10 rounded-xl py-4 items-center active:opacity-80"
        >
          <Text className="text-red-400 font-semibold text-base">Sign Out</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}
