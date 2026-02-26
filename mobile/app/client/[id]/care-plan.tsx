import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import type { Client, Contract } from '@/lib/types';
import LoadingScreen from '@/components/LoadingScreen';

export default function CarePlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, cData] = await Promise.all([
          api.get<Client>(`/clients/${id}`),
          api.get<{ items?: Contract[]; contracts?: Contract[] }>(`/visits/clients/${id}/contracts`).catch(() => null),
        ]);
        setClient(c);
        if (cData) setContracts(cData.items || cData.contracts || []);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingScreen />;
  if (!client) return <View className="flex-1 bg-dark-900 items-center justify-center"><Text className="text-white">Not found</Text></View>;

  const activeContract = contracts.find((c) => c.status === 'active') || contracts[0];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Care Plan',
          headerStyle: { backgroundColor: '#0a1628' },
          headerTintColor: '#ffffff',
          headerShadowVisible: false,
        }}
      />
      <ScrollView className="flex-1 bg-dark-900 px-5" contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}>
        {/* Client name */}
        <View className="bg-dark-800 rounded-xl p-4 mb-4 flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-palm-500/20 items-center justify-center mr-3">
            <Ionicons name="heart" size={20} color="#0d9488" />
          </View>
          <View>
            <Text className="text-white font-semibold text-base">{client.full_name}</Text>
            <Text className="text-dark-400 text-xs capitalize">{client.care_level || 'Not assessed'} care</Text>
          </View>
        </View>

        {/* Care Details */}
        <View className="bg-dark-800 rounded-xl p-4 mb-3">
          <Text className="text-white font-semibold text-sm mb-3">Care Overview</Text>
          {[
            { label: 'Care Level', value: client.care_level || 'Not set', icon: 'fitness' as const },
            { label: 'Mobility', value: client.mobility_status || 'Not assessed', icon: 'walk' as const },
            { label: 'Cognitive', value: client.cognitive_status || 'Not assessed', icon: 'bulb' as const },
            { label: 'Living', value: client.living_situation || 'Not specified', icon: 'home' as const },
          ].map((item) => (
            <View key={item.label} className="flex-row items-center py-2.5 border-b border-dark-700/50">
              <Ionicons name={item.icon} size={16} color="#829bcd" />
              <Text className="text-dark-400 text-sm ml-2 flex-1">{item.label}</Text>
              <Text className="text-white text-sm font-medium">{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Care Plan Text */}
        {client.care_plan && (
          <View className="bg-dark-800 rounded-xl p-4 mb-3">
            <Text className="text-white font-semibold text-sm mb-2">Care Plan Details</Text>
            <Text className="text-dark-300 text-sm leading-5">{client.care_plan}</Text>
          </View>
        )}

        {/* Special Requirements */}
        {client.special_requirements && (
          <View className="bg-dark-800 rounded-xl p-4 mb-3">
            <Text className="text-white font-semibold text-sm mb-2">Special Requirements</Text>
            <Text className="text-dark-300 text-sm leading-5">{client.special_requirements}</Text>
          </View>
        )}

        {/* Schedule from contract */}
        {activeContract && (
          <View className="bg-dark-800 rounded-xl p-4 mb-3">
            <Text className="text-white font-semibold text-sm mb-3">Schedule</Text>
            {activeContract.schedule?.days && (
              <View className="flex-row items-center py-2 border-b border-dark-700/50">
                <Ionicons name="calendar" size={16} color="#829bcd" />
                <Text className="text-dark-400 text-sm ml-2 flex-1">Days</Text>
                <Text className="text-white text-sm">{activeContract.schedule.days.join(', ')}</Text>
              </View>
            )}
            {activeContract.weekly_hours != null && (
              <View className="flex-row items-center py-2 border-b border-dark-700/50">
                <Ionicons name="time" size={16} color="#829bcd" />
                <Text className="text-dark-400 text-sm ml-2 flex-1">Hours/Week</Text>
                <Text className="text-white text-sm">{activeContract.weekly_hours}</Text>
              </View>
            )}
            {activeContract.hourly_rate != null && (
              <View className="flex-row items-center py-2">
                <Ionicons name="cash" size={16} color="#829bcd" />
                <Text className="text-dark-400 text-sm ml-2 flex-1">Rate</Text>
                <Text className="text-palm-400 text-sm font-medium">${activeContract.hourly_rate}/hr</Text>
              </View>
            )}
          </View>
        )}

        {/* Services from contract */}
        {activeContract?.services && activeContract.services.length > 0 && (
          <View className="bg-dark-800 rounded-xl p-4 mb-3">
            <Text className="text-white font-semibold text-sm mb-3">Services</Text>
            {activeContract.services.map((svc, i) => (
              <View key={i} className="flex-row items-center py-2 border-b border-dark-700/50 last:border-b-0">
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text className="text-white text-sm ml-2 flex-1">{svc.name}</Text>
                {svc.rate != null && (
                  <Text className="text-dark-400 text-sm">${svc.rate}/{svc.unit || 'hr'}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Medical Summary */}
        <View className="bg-dark-800 rounded-xl p-4 mb-3">
          <Text className="text-white font-semibold text-sm mb-3">Medical Summary</Text>
          {[
            { label: 'Primary Diagnosis', value: client.primary_diagnosis },
            { label: 'Allergies', value: client.allergies },
            { label: 'Medications', value: client.medications },
          ].map(
            (item) =>
              item.value && (
                <View key={item.label} className="mb-2">
                  <Text className="text-dark-400 text-xs uppercase tracking-wider">{item.label}</Text>
                  <Text className="text-dark-200 text-sm mt-0.5">{item.value}</Text>
                </View>
              ),
          )}
        </View>
      </ScrollView>
    </>
  );
}
