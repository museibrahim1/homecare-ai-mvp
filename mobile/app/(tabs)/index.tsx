import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import type { UsageStats, Visit } from '@/lib/types';

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

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        {/* Header */}
        <View className="px-5 pt-4 pb-6">
          <Text className="text-dark-400 text-sm">Welcome back,</Text>
          <Text className="text-white text-2xl font-bold mt-0.5">{firstName}</Text>
        </View>

        {/* Quick Stats */}
        <View className="flex-row px-5 mb-6">
          {[
            { label: 'Clients', value: clients.length.toString(), icon: 'people' as const, color: '#0d9488' },
            { label: 'Assessments', value: usage?.visits_this_month?.toString() || '0', icon: 'mic' as const, color: '#8b5cf6' },
            { label: 'This Month', value: usage?.total_visits?.toString() || '0', icon: 'bar-chart' as const, color: '#f59e0b' },
          ].map((stat, i) => (
            <View key={i} className="flex-1 bg-dark-800 rounded-xl p-3.5 mr-2 last:mr-0">
              <Ionicons name={stat.icon} size={20} color={stat.color} />
              <Text className="text-white text-xl font-bold mt-2">{stat.value}</Text>
              <Text className="text-dark-400 text-xs mt-0.5">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View className="px-5 mb-6">
          <Text className="text-white font-semibold text-base mb-3">Quick Actions</Text>
          <View className="flex-row flex-wrap">
            {[
              { label: 'Record Assessment', icon: 'mic' as const, color: '#0d9488', route: '/(tabs)/record' },
              { label: 'Add Client', icon: 'person-add' as const, color: '#8b5cf6', route: '/(tabs)/clients' },
              { label: 'View Contracts', icon: 'briefcase' as const, color: '#f59e0b', route: '/(tabs)/more' },
              { label: 'Team Chat', icon: 'chatbubbles' as const, color: '#3b82f6', route: '/chat' },
            ].map((action, i) => (
              <Pressable
                key={i}
                onPress={() => router.push(action.route as never)}
                className="w-[48%] bg-dark-800 rounded-xl p-4 mb-2 active:opacity-80"
                style={{ marginRight: i % 2 === 0 ? '4%' : 0 }}
              >
                <View className="w-10 h-10 rounded-xl items-center justify-center mb-2" style={{ backgroundColor: action.color + '20' }}>
                  <Ionicons name={action.icon} size={20} color={action.color} />
                </View>
                <Text className="text-white text-sm font-medium">{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View className="px-5">
          <Text className="text-white font-semibold text-base mb-3">Recent Assessments</Text>
          {recentVisits.length === 0 ? (
            <View className="bg-dark-800 rounded-xl p-6 items-center">
              <Ionicons name="document-text-outline" size={32} color="#829bcd" />
              <Text className="text-dark-400 text-sm mt-2">No assessments yet</Text>
              <Pressable
                onPress={() => router.push('/(tabs)/record')}
                className="mt-3 bg-palm-500/20 rounded-lg px-4 py-2"
              >
                <Text className="text-palm-400 text-sm font-medium">Record your first</Text>
              </Pressable>
            </View>
          ) : (
            recentVisits.map((visit) => (
              <Pressable
                key={visit.id}
                onPress={() => router.push(`/pipeline/${visit.id}`)}
                className="bg-dark-800 rounded-xl px-4 py-3 mb-2 flex-row items-center active:opacity-80"
              >
                <View className="w-9 h-9 rounded-lg bg-palm-500/20 items-center justify-center mr-3">
                  <Ionicons name="mic" size={18} color="#0d9488" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-sm font-medium">
                    {visit.client?.full_name || 'Assessment'}
                  </Text>
                  <Text className="text-dark-400 text-xs mt-0.5">
                    {new Date(visit.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <View
                    className="w-2 h-2 rounded-full mr-1.5"
                    style={{
                      backgroundColor:
                        visit.status === 'approved'
                          ? '#22c55e'
                          : visit.status === 'in_progress'
                          ? '#0d9488'
                          : '#eab308',
                    }}
                  />
                  <Text className="text-dark-400 text-xs capitalize">{visit.status.replace('_', ' ')}</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
