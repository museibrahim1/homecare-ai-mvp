import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import type { CalendarEvent } from '@/lib/types';

export default function CalendarScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const status = await api.get<{ connected: boolean }>('/calendar/status');
      setConnected(status.connected);

      if (status.connected) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30).toISOString();
        const data = await api.get<{ events?: CalendarEvent[]; items?: CalendarEvent[] }>(
          `/calendar/events?time_min=${start}&time_max=${end}`,
        );
        setEvents(data.events || data.items || []);
      }
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const onRefresh = async () => { setRefreshing(true); await loadEvents(); setRefreshing(false); };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d: string) => new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const grouped = events.reduce<Record<string, CalendarEvent[]>>((acc, e) => {
    const key = new Date(e.start.dateTime).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <Text className="text-white text-2xl font-bold">Calendar</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
      >
        {connected === false && (
          <View className="bg-dark-800 rounded-2xl p-8 items-center">
            <Ionicons name="calendar-outline" size={32} color="#4b5563" />
            <Text className="text-dark-300 text-sm mt-3 text-center">
              Connect Google Calendar from the web app to see events here.
            </Text>
          </View>
        )}

        {connected && events.length === 0 && (
          <View className="bg-dark-800 rounded-2xl p-8 items-center">
            <Ionicons name="sunny-outline" size={32} color="#4b5563" />
            <Text className="text-dark-300 text-sm mt-3">No upcoming events</Text>
          </View>
        )}

        {Object.entries(grouped).map(([dateKey, dayEvents]) => (
          <View key={dateKey} className="mb-5">
            <Text className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-2">
              {formatDate(dayEvents[0].start.dateTime)}
            </Text>
            {dayEvents.map((evt) => (
              <View key={evt.id} className="bg-dark-800 rounded-2xl px-4 py-3 mb-2 flex-row items-start">
                <View className="w-1 rounded-full bg-palm-500 self-stretch mr-3" />
                <View className="flex-1">
                  <Text className="text-white text-sm font-medium">{evt.summary}</Text>
                  <Text className="text-dark-400 text-xs mt-1">{formatTime(evt.start.dateTime)} — {formatTime(evt.end.dateTime)}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
