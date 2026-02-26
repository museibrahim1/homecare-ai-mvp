import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Contract } from '@/lib/types';

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: '#1e3f76', text: '#829bcd', label: 'Draft' },
  pending_signature: { bg: '#854d0e33', text: '#eab308', label: 'Pending' },
  active: { bg: '#14532d33', text: '#22c55e', label: 'Active' },
  expired: { bg: '#7f1d1d33', text: '#ef4444', label: 'Expired' },
  cancelled: { bg: '#44403c33', text: '#a8a29e', label: 'Cancelled' },
};

export default function ContractCard({ contract }: { contract: Contract }) {
  const router = useRouter();
  const badge = STATUS_BADGE[contract.status] || STATUS_BADGE.draft;

  return (
    <Pressable
      onPress={() => router.push(`/contract/${contract.id}`)}
      className="bg-dark-800 rounded-xl px-4 py-3.5 mb-2.5 active:opacity-80"
    >
      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-white font-semibold text-[15px] flex-1" numberOfLines={1}>
          {contract.title || `Contract #${contract.contract_number || contract.id.slice(0, 8)}`}
        </Text>
        <View className="rounded-full px-2.5 py-1 ml-2" style={{ backgroundColor: badge.bg }}>
          <Text className="text-xs font-medium" style={{ color: badge.text }}>
            {badge.label}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center">
        {contract.hourly_rate != null && (
          <Text className="text-palm-400 text-sm font-medium mr-3">
            ${contract.hourly_rate}/hr
          </Text>
        )}
        {contract.weekly_hours != null && (
          <Text className="text-dark-400 text-sm">{contract.weekly_hours} hrs/week</Text>
        )}
      </View>
      <View className="flex-row items-center mt-2">
        <Ionicons name="calendar-outline" size={12} color="#829bcd" />
        <Text className="text-dark-400 text-xs ml-1">
          {contract.start_date
            ? new Date(contract.start_date).toLocaleDateString()
            : 'No start date'}
          {contract.end_date && ` — ${new Date(contract.end_date).toLocaleDateString()}`}
        </Text>
      </View>
    </Pressable>
  );
}
