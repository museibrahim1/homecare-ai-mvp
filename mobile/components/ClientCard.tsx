import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Client } from '@/lib/types';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  active: { color: '#22c55e', bg: '#22c55e15', label: 'Active' },
  pending: { color: '#eab308', bg: '#eab30815', label: 'Pending' },
  inactive: { color: '#94a3b8', bg: '#94a3b815', label: 'Inactive' },
  discharged: { color: '#ef4444', bg: '#ef444415', label: 'Discharged' },
};

export default function ClientCard({ client }: { client: Client }) {
  const router = useRouter();
  const initials = client.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const status = STATUS_CONFIG[client.status] || STATUS_CONFIG.pending;

  return (
    <Pressable
      onPress={() => router.push(`/client/${client.id}`)}
      className="bg-dark-800 rounded-2xl px-4 py-4 mb-3 active:opacity-80"
    >
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-2xl bg-palm-500/15 items-center justify-center mr-3">
          <Text className="text-palm-400 font-bold text-base">{initials}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-white font-semibold text-[15px]">{client.full_name}</Text>
          <View className="flex-row items-center mt-1">
            {client.phone && (
              <View className="flex-row items-center mr-3">
                <Ionicons name="call-outline" size={11} color="#4b5563" />
                <Text className="text-dark-500 text-xs ml-1">{client.phone}</Text>
              </View>
            )}
            {client.primary_diagnosis && (
              <View className="flex-row items-center">
                <Ionicons name="medkit-outline" size={11} color="#4b5563" />
                <Text className="text-dark-500 text-xs ml-1" numberOfLines={1}>{client.primary_diagnosis}</Text>
              </View>
            )}
          </View>
        </View>
        <View className="items-end">
          <View className="rounded-lg px-2 py-0.5" style={{ backgroundColor: status.bg }}>
            <Text className="text-[10px] font-semibold" style={{ color: status.color }}>{status.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#4b5563" style={{ marginTop: 6 }} />
        </View>
      </View>
    </Pressable>
  );
}
