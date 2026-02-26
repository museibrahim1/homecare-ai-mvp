import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import type { Contract } from '@/lib/types';
import LoadingScreen from '@/components/LoadingScreen';

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: '#1e3f7640', text: '#829bcd', label: 'Draft' },
  pending_signature: { bg: '#854d0e40', text: '#eab308', label: 'Pending Signature' },
  active: { bg: '#14532d40', text: '#22c55e', label: 'Active' },
  expired: { bg: '#7f1d1d40', text: '#ef4444', label: 'Expired' },
  cancelled: { bg: '#44403c40', text: '#a8a29e', label: 'Cancelled' },
};

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<Contract>(`/visits/${id}/contract`);
        setContract(data);
      } catch {
        try {
          const all = await api.get<{ items?: Contract[]; contracts?: Contract[] }>('/visits/contracts');
          const list = all.items || all.contracts || [];
          const found = list.find((c) => c.id === id);
          if (found) setContract(found);
        } catch {
          // not found
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingScreen />;
  if (!contract) {
    return (
      <>
        <Stack.Screen options={{ title: 'Contract' }} />
        <View className="flex-1 bg-dark-900 items-center justify-center">
          <Text className="text-white">Contract not found</Text>
        </View>
      </>
    );
  }

  const badge = STATUS_BADGE[contract.status] || STATUS_BADGE.draft;

  return (
    <>
      <Stack.Screen options={{ title: 'Contract' }} />
      <ScrollView className="flex-1 bg-dark-900 px-5" contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}>
        {/* Header */}
        <View className="bg-dark-800 rounded-xl p-5 mb-4 items-center">
          <Ionicons name="briefcase" size={28} color="#0d9488" />
          <Text className="text-white text-lg font-bold mt-2">
            {contract.title || `Contract #${contract.contract_number || contract.id.slice(0, 8)}`}
          </Text>
          <View className="rounded-full px-3 py-1 mt-2" style={{ backgroundColor: badge.bg }}>
            <Text className="text-xs font-semibold" style={{ color: badge.text }}>
              {badge.label}
            </Text>
          </View>
        </View>

        {/* Rates & Schedule */}
        <View className="bg-dark-800 rounded-xl p-4 mb-3">
          <Text className="text-white font-semibold text-sm mb-3">Rates & Schedule</Text>
          {contract.hourly_rate != null && (
            <View className="flex-row items-center justify-between py-2 border-b border-dark-700/50">
              <Text className="text-dark-400 text-sm">Hourly Rate</Text>
              <Text className="text-palm-400 font-bold text-lg">${contract.hourly_rate}</Text>
            </View>
          )}
          {(contract.weekly_hours ?? contract.schedule?.total_hours_per_week) != null && (
            <View className="flex-row items-center justify-between py-2 border-b border-dark-700/50">
              <Text className="text-dark-400 text-sm">Hours/Week</Text>
              <Text className="text-white font-medium text-sm">
                {contract.weekly_hours ?? contract.schedule?.total_hours_per_week}
              </Text>
            </View>
          )}
          {contract.hourly_rate != null && (contract.weekly_hours ?? contract.schedule?.total_hours_per_week) != null && (
            <View className="flex-row items-center justify-between py-2 border-b border-dark-700/50">
              <Text className="text-dark-400 text-sm">Monthly Est.</Text>
              <Text className="text-white font-bold text-base">
                ${(contract.hourly_rate * (contract.weekly_hours ?? contract.schedule?.total_hours_per_week ?? 0) * 4.33).toFixed(0)}
              </Text>
            </View>
          )}
          {contract.start_date && (
            <View className="flex-row items-center justify-between py-2 border-b border-dark-700/50">
              <Text className="text-dark-400 text-sm">Start Date</Text>
              <Text className="text-white text-sm">{new Date(contract.start_date).toLocaleDateString()}</Text>
            </View>
          )}
          {contract.end_date && (
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-dark-400 text-sm">End Date</Text>
              <Text className="text-white text-sm">{new Date(contract.end_date).toLocaleDateString()}</Text>
            </View>
          )}
        </View>

        {/* Services */}
        {contract.services && contract.services.length > 0 && (
          <View className="bg-dark-800 rounded-xl p-4 mb-3">
            <Text className="text-white font-semibold text-sm mb-3">Services</Text>
            {contract.services.map((svc, i) => (
              <View key={i} className="py-2.5 border-b border-dark-700/50">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                  <Text className="text-white text-sm ml-2 flex-1">{svc.name}</Text>
                  {svc.priority && (
                    <Text className="text-dark-400 text-xs capitalize">{svc.priority}</Text>
                  )}
                </View>
                {svc.description && (
                  <Text className="text-dark-400 text-xs mt-1 ml-6" numberOfLines={2}>{svc.description}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Schedule */}
        {(() => {
          const scheduleDays = contract.schedule?.preferred_days || contract.schedule?.days;
          if (!scheduleDays || scheduleDays.length === 0) return null;
          return (
            <View className="bg-dark-800 rounded-xl p-4 mb-3">
              <Text className="text-white font-semibold text-sm mb-3">Weekly Schedule</Text>
              {contract.schedule?.frequency && (
                <Text className="text-dark-300 text-sm mb-3">{contract.schedule.frequency}</Text>
              )}
              <View className="flex-row flex-wrap">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                  const isActive = scheduleDays.some(
                    (d) => d.toLowerCase().startsWith(day.toLowerCase()),
                  );
                  return (
                    <View
                      key={day}
                      className="w-10 h-10 rounded-full items-center justify-center mr-2 mb-2"
                      style={{ backgroundColor: isActive ? '#0d948830' : '#1e3f7630' }}
                    >
                      <Text className="text-xs font-medium" style={{ color: isActive ? '#0d9488' : '#4b5563' }}>
                        {day}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}

        {/* Terms */}
        {contract.terms_and_conditions && (
          <View className="bg-dark-800 rounded-xl p-4 mb-3">
            <Text className="text-white font-semibold text-sm mb-2">Terms & Conditions</Text>
            <Text className="text-dark-300 text-sm leading-5">{contract.terms_and_conditions}</Text>
          </View>
        )}

        {contract.cancellation_policy && (
          <View className="bg-dark-800 rounded-xl p-4 mb-3">
            <Text className="text-white font-semibold text-sm mb-2">Cancellation Policy</Text>
            <Text className="text-dark-300 text-sm leading-5">{contract.cancellation_policy}</Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}
