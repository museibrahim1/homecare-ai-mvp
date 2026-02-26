import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Client } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  pending: '#eab308',
  inactive: '#94a3b8',
  discharged: '#ef4444',
};

export default function ClientCard({ client }: { client: Client }) {
  const router = useRouter();
  const initials = client.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Pressable
      onPress={() => router.push(`/client/${client.id}`)}
      className="flex-row items-center bg-dark-800 rounded-2xl px-4 py-3.5 mb-2 active:opacity-80"
    >
      <View className="w-10 h-10 rounded-full bg-palm-500/15 items-center justify-center mr-3">
        <Text className="text-palm-400 font-bold text-sm">{initials}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-white font-medium text-[15px]">{client.full_name}</Text>
        <Text className="text-dark-500 text-xs mt-0.5">
          {client.phone || 'No phone'}
        </Text>
      </View>
      <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: STATUS_COLORS[client.status] || '#94a3b8' }} />
      <Ionicons name="chevron-forward" size={14} color="#4b5563" />
    </Pressable>
  );
}
