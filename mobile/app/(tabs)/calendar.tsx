import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import type { CalendarEvent } from '@/lib/types';

export default function CalendarScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const today = new Date();

  const loadEvents = useCallback(async () => {
    try {
      const status = await api.get<{ connected: boolean }>('/calendar/status');
      setConnected(status.connected);

      if (status.connected) {
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30).toISOString();
        const data = await api.get<{ events?: CalendarEvent[]; items?: CalendarEvent[] }>(
          `/calendar/events?time_min=${start}&time_max=${end}`,
        );
        setEvents(data.events || data.items || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const groupedEvents = events.reduce<Record<string, CalendarEvent[]>>((acc, evt) => {
    const date = new Date(evt.start.dateTime).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(evt);
    return acc;
  }, {});

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <Text className="text-white text-2xl font-bold">Calendar</Text>
        <View className="flex-row items-center">
          <View
            className="w-2 h-2 rounded-full mr-1.5"
            style={{ backgroundColor: connected ? '#22c55e' : '#ef4444' }}
          />
          <Text className="text-dark-400 text-xs">
            {connected === null ? 'Checking...' : connected ? 'Connected' : 'Not connected'}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
      >
        {connected === false && (
          <View className="bg-dark-800 rounded-xl p-6 items-center mb-4">
            <Ionicons name="calendar-outline" size={40} color="#829bcd" />
            <Text className="text-white font-semibold mt-3">Google Calendar Not Connected</Text>
            <Text className="text-dark-400 text-sm mt-1 text-center">
              Connect your Google Calendar from the web app to see events here.
            </Text>
          </View>
        )}

        {connected && events.length === 0 && (
          <View className="bg-dark-800 rounded-xl p-6 items-center">
            <Ionicons name="sunny-outline" size={40} color="#829bcd" />
            <Text className="text-white font-semibold mt-3">No Upcoming Events</Text>
            <Text className="text-dark-400 text-sm mt-1">Your calendar is clear for the next 30 days.</Text>
          </View>
        )}

        {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
          <View key={dateKey} className="mb-5">
            <Text className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-2">
              {formatDate(dayEvents[0].start.dateTime)}
            </Text>
            {dayEvents.map((evt) => (
              <View key={evt.id} className="bg-dark-800 rounded-xl px-4 py-3 mb-2 flex-row items-start">
                <View className="w-1 rounded-full bg-palm-500 self-stretch mr-3" />
                <View className="flex-1">
                  <Text className="text-white font-medium text-sm">{evt.summary}</Text>
                  <Text className="text-dark-400 text-xs mt-1">
                    {formatTime(evt.start.dateTime)} — {formatTime(evt.end.dateTime)}
                  </Text>
                  {evt.location && (
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="location-outline" size={12} color="#829bcd" />
                      <Text className="text-dark-400 text-xs ml-1">{evt.location}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
