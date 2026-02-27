import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import type { UsageStats, Visit } from '@/lib/types';

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  in_progress: { bg: '#0d948820', text: '#0d9488', label: 'In Progress' },
  completed: { bg: '#22c55e20', text: '#22c55e', label: 'Completed' },
  pending: { bg: '#eab30820', text: '#eab308', label: 'Pending' },
  failed: { bg: '#ef444420', text: '#ef4444', label: 'Failed' },
  new: { bg: '#3b82f620', text: '#3b82f6', label: 'New' },
};

function StatCard({ label, value, icon, gradient }: {
  label: string; value: string; icon: keyof typeof Ionicons.glyphMap; gradient: [string, string];
}) {
  return (
    <View className="flex-1 mr-3 last:mr-0">
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 20, padding: 16 }}
      >
        <View className="w-10 h-10 rounded-2xl bg-white/20 items-center justify-center mb-3">
          <Ionicons name={icon} size={20} color="#ffffff" />
        </View>
        <Text className="text-white/80 text-xs font-medium">{label}</Text>
        <Text className="text-white text-3xl font-bold mt-0.5">{value}</Text>
      </LinearGradient>
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
        api.get<Visit[] | { items?: Visit[]; visits?: Visit[] }>('/visits?limit=5').catch(() => null),
      ]);
      if (usageData) setUsage(usageData);
      if (visitsData) {
        const list = Array.isArray(visitsData) ? visitsData : (visitsData.items || visitsData.visits || []);
        setRecentVisits(list);
      }
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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
      >
        {/* Header */}
        <View className="px-6 pt-5 pb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-dark-400 text-sm">{greeting},</Text>
            <Text className="text-white text-2xl font-bold mt-0.5">{firstName}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            className="w-11 h-11 rounded-2xl bg-dark-800 items-center justify-center active:opacity-80"
          >
            <Ionicons name="settings-outline" size={20} color="#829bcd" />
          </Pressable>
        </View>

        {/* Stats */}
        <View className="flex-row px-6 mt-4 mb-6">
          <StatCard label="Clients" value={clients.length.toString()} icon="people" gradient={['#0d9488', '#059669']} />
          <StatCard label="Completed" value={usage?.completed_assessments?.toString() || '0'} icon="checkmark-done" gradient={['#7c3aed', '#6d28d9']} />
          <StatCard label="Total" value={usage?.total_assessments?.toString() || '0'} icon="bar-chart" gradient={['#f59e0b', '#d97706']} />
        </View>

        {/* Quick Record CTA */}
        <View className="px-6 mb-6">
          <Pressable
            onPress={() => router.push('/(tabs)/record')}
            className="active:scale-[0.98]"
          >
            <LinearGradient
              colors={['#0d9488', '#0f766e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center' }}
            >
              <View className="w-14 h-14 rounded-2xl bg-white/20 items-center justify-center mr-4">
                <Ionicons name="mic" size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-lg">New Assessment</Text>
                <Text className="text-white/70 text-sm mt-0.5">Record a voice assessment</Text>
              </View>
              <View className="w-10 h-10 rounded-xl bg-white/15 items-center justify-center">
                <Ionicons name="arrow-forward" size={18} color="#ffffff" />
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Recent Assessments */}
        <View className="px-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white font-bold text-lg">Recent Assessments</Text>
            {recentVisits.length > 0 && (
              <Pressable className="active:opacity-60">
                <Text className="text-palm-400 text-sm font-medium">See all</Text>
              </Pressable>
            )}
          </View>

          {recentVisits.length === 0 ? (
            <View className="bg-dark-800 rounded-2xl p-10 items-center">
              <View className="w-16 h-16 rounded-full bg-dark-700 items-center justify-center mb-4">
                <Ionicons name="document-text-outline" size={28} color="#4b5563" />
              </View>
              <Text className="text-dark-300 text-base font-medium">No assessments yet</Text>
              <Text className="text-dark-500 text-sm mt-1">Tap the mic to start recording</Text>
            </View>
          ) : (
            recentVisits.map((visit, i) => {
              const badge = STATUS_BADGE[visit.status] || STATUS_BADGE.new;
              const date = new Date(visit.created_at);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

              return (
                <Pressable
                  key={visit.id}
                  onPress={() => router.push(`/pipeline/${visit.id}`)}
                  className="bg-dark-800 rounded-2xl px-4 py-4 mb-3 active:opacity-80"
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: badge.text,
                  }}
                >
                  <View className="flex-row items-center">
                    <View className="w-11 h-11 rounded-2xl bg-palm-500/10 items-center justify-center mr-3">
                      <Ionicons name="mic" size={18} color="#0d9488" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-[15px] font-semibold">
                        {visit.client?.full_name || 'Assessment'}
                      </Text>
                      <Text className="text-dark-500 text-xs mt-1">
                        {dateStr} at {timeStr}
                      </Text>
                    </View>
                    <View className="items-end">
                      <View
                        className="rounded-lg px-2.5 py-1"
                        style={{ backgroundColor: badge.bg }}
                      >
                        <Text className="text-xs font-semibold" style={{ color: badge.text }}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
