import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';

const ITEMS: { label: string; icon: keyof typeof Ionicons.glyphMap; route: string }[] = [
  { label: 'Team Chat', icon: 'chatbubbles', route: '/chat' },
  { label: 'Settings', icon: 'settings', route: '/settings' },
];

export default function MoreScreen() {
  const router = useRouter();
  const user = useStore((s) => s.user);

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      <View className="px-5 pt-4 pb-6">
        <Text className="text-white text-2xl font-bold">More</Text>
      </View>

      <Pressable
        onPress={() => router.push('/settings')}
        className="mx-5 bg-dark-800 rounded-2xl p-4 flex-row items-center mb-6 active:opacity-80"
      >
        <View className="w-11 h-11 rounded-full bg-palm-500/15 items-center justify-center mr-3">
          <Ionicons name="person" size={22} color="#0d9488" />
        </View>
        <View className="flex-1">
          <Text className="text-white font-semibold">{user?.full_name || 'User'}</Text>
          <Text className="text-dark-400 text-sm">{user?.email}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#4b5563" />
      </Pressable>

      <View className="mx-5 bg-dark-800 rounded-2xl overflow-hidden">
        {ITEMS.map((item, i) => (
          <Pressable
            key={item.label}
            onPress={() => router.push(item.route as never)}
            className="flex-row items-center px-4 py-3.5 active:bg-dark-700"
            style={i < ITEMS.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: '#1e3f7640' } : {}}
          >
            <Ionicons name={item.icon} size={20} color="#829bcd" />
            <Text className="text-white text-[15px] ml-3 flex-1">{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#4b5563" />
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
