import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import type { UsageStats, Visit } from '@/lib/types';

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View className="flex-1 bg-dark-800 rounded-2xl p-4 mr-2.5 last:mr-0">
      <Ionicons name={icon} size={18} color={color} />
      <Text className="text-white text-2xl font-bold mt-2.5">{value}</Text>
      <Text className="text-dark-400 text-xs mt-1">{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const clients = useStore((s) => s.clients);
  const fetchClients = useStore((s) => s.fetchClients);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [usageData, visitsData] = await Promise.all([
        api.get<UsageStats>('/visits/usage').catch(() => null),
        api.get<{ items?: Visit[]; visits?: Visit[] }>('/visits?limit=5').catch(() => null),
      ]);
      if (usageData) setUsage(usageData);
      if (visitsData) setRecentVisits(visitsData.items || visitsData.visits || []);
      await fetchClients();
    } catch {
      // silent
    }
  }, [fetchClients]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
      >
        <View className="px-5 pt-5 pb-6">
          <Text className="text-dark-400 text-sm">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},</Text>
          <Text className="text-white text-2xl font-bold mt-0.5">{firstName}</Text>
        </View>

        <View className="flex-row px-5 mb-6">
          <StatCard label="Clients" value={clients.length.toString()} icon="people" color="#0d9488" />
          <StatCard label="This Month" value={usage?.visits_this_month?.toString() || '0'} icon="mic" color="#8b5cf6" />
          <StatCard label="Total" value={usage?.total_visits?.toString() || '0'} icon="bar-chart" color="#f59e0b" />
        </View>

        <View className="px-5 mb-6">
          <Pressable
            onPress={() => router.push('/(tabs)/record')}
            className="bg-palm-500 rounded-2xl py-4 px-5 flex-row items-center active:opacity-80"
          >
            <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3">
              <Ionicons name="mic" size={22} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-base">Record Assessment</Text>
              <Text className="text-white/70 text-xs mt-0.5">Tap to start a new voice assessment</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ffffff" />
          </Pressable>
        </View>

        <View className="px-5">
          <Text className="text-white font-semibold text-base mb-3">Recent</Text>
          {recentVisits.length === 0 ? (
            <View className="bg-dark-800 rounded-2xl p-8 items-center">
              <Ionicons name="document-text-outline" size={28} color="#4b5563" />
              <Text className="text-dark-400 text-sm mt-3">No assessments yet</Text>
            </View>
          ) : (
            recentVisits.map((visit) => (
              <Pressable
                key={visit.id}
                onPress={() => router.push(`/pipeline/${visit.id}`)}
                className="bg-dark-800 rounded-2xl px-4 py-3.5 mb-2 flex-row items-center active:opacity-80"
              >
                <View className="w-9 h-9 rounded-xl bg-palm-500/15 items-center justify-center mr-3">
                  <Ionicons name="mic" size={16} color="#0d9488" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-sm font-medium">
                    {visit.client?.full_name || 'Assessment'}
                  </Text>
                  <Text className="text-dark-500 text-xs mt-0.5">
                    {new Date(visit.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text className="text-dark-400 text-xs capitalize">{visit.status.replace('_', ' ')}</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
