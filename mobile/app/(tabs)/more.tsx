import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';

const MENU_ITEMS: {
  section: string;
  items: { label: string; icon: keyof typeof Ionicons.glyphMap; route: string; color?: string }[];
}[] = [
  {
    section: 'Communication',
    items: [
      { label: 'Team Chat', icon: 'chatbubbles', route: '/chat', color: '#3b82f6' },
    ],
  },
  {
    section: 'Management',
    items: [
      { label: 'All Contracts', icon: 'briefcase', route: '/(tabs)/clients', color: '#f59e0b' },
      { label: 'Pipeline Activity', icon: 'git-branch', route: '/(tabs)/index', color: '#8b5cf6' },
    ],
  },
  {
    section: 'Account',
    items: [
      { label: 'Settings', icon: 'settings', route: '/settings', color: '#829bcd' },
    ],
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const user = useStore((s) => s.user);

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      <View className="px-5 pt-4 pb-6">
        <Text className="text-white text-2xl font-bold">More</Text>
      </View>

      {/* User card */}
      <Pressable
        onPress={() => router.push('/settings')}
        className="mx-5 bg-dark-800 rounded-xl p-4 flex-row items-center mb-6 active:opacity-80"
      >
        <View className="w-12 h-12 rounded-full bg-palm-500/20 items-center justify-center mr-4">
          <Ionicons name="person" size={24} color="#0d9488" />
        </View>
        <View className="flex-1">
          <Text className="text-white font-semibold text-base">{user?.full_name || 'User'}</Text>
          <Text className="text-dark-400 text-sm">{user?.email}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#829bcd" />
      </Pressable>

      {/* Menu sections */}
      {MENU_ITEMS.map((section) => (
        <View key={section.section} className="mb-4">
          <Text className="text-dark-400 text-xs font-medium uppercase tracking-wider px-5 mb-2">
            {section.section}
          </Text>
          <View className="mx-5 bg-dark-800 rounded-xl overflow-hidden">
            {section.items.map((item, i) => (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.route as never)}
                className="flex-row items-center px-4 py-3.5 active:bg-dark-700"
                style={i < section.items.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: '#1e3f76' } : {}}
              >
                <View className="w-8 h-8 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: (item.color || '#829bcd') + '20' }}>
                  <Ionicons name={item.icon} size={18} color={item.color || '#829bcd'} />
                </View>
                <Text className="text-white text-[15px] flex-1">{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#829bcd" />
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </SafeAreaView>
  );
}
