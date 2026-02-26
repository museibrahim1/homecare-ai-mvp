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
      className="flex-row items-center bg-dark-800 rounded-xl px-4 py-3.5 mb-2.5 active:opacity-80"
    >
      <View className="w-11 h-11 rounded-full bg-palm-500/20 items-center justify-center mr-3">
        <Text className="text-palm-400 font-bold text-sm">{initials}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-white font-semibold text-[15px]">{client.full_name}</Text>
        <Text className="text-dark-400 text-xs mt-0.5">
          {client.phone || 'No phone'} {client.city ? `· ${client.city}, ${client.state}` : ''}
        </Text>
      </View>
      <View className="items-end">
        <View className="flex-row items-center">
          <View
            className="w-2 h-2 rounded-full mr-1.5"
            style={{ backgroundColor: STATUS_COLORS[client.status] || '#94a3b8' }}
          />
          <Text className="text-dark-400 text-xs capitalize">{client.status}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#829bcd" style={{ marginLeft: 8 }} />
    </Pressable>
  );
}
