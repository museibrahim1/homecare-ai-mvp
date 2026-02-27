import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import type { CalendarEvent } from '@/lib/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysArray(center: Date, range: number = 15) {
  const days: Date[] = [];
  for (let i = -range; i <= range; i++) {
    const d = new Date(center);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function CalendarScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const today = new Date();
  const days = getDaysArray(today);
  const scrollRef = useRef<FlatList>(null);

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

  useEffect(() => {
    const idx = days.findIndex(d => d.toDateString() === today.toDateString());
    if (idx >= 0) {
      setTimeout(() => scrollRef.current?.scrollToIndex({ index: idx, animated: false, viewPosition: 0.3 }), 100);
    }
  }, []);

  const onRefresh = async () => { setRefreshing(true); await loadEvents(); setRefreshing(false); };

  const getStartTime = (e: CalendarEvent) => e.start.dateTime || e.start.date || '';
  const getEndTime = (e: CalendarEvent) => e.end.dateTime || e.end.date || '';
  const isAllDay = (e: CalendarEvent) => !e.start.dateTime && !!e.start.date;

  const formatTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const selectedStr = selectedDate.toDateString();
  const dayEvents = events.filter(e => new Date(getStartTime(e)).toDateString() === selectedStr);

  const monthYear = selectedDate.toLocaleDateString([], { month: 'long', year: 'numeric' });

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      <View className="px-6 pt-4 pb-2">
        <Text className="text-white text-2xl font-bold">Calendar</Text>
        <Text className="text-dark-400 text-sm mt-1">{monthYear}</Text>
      </View>

      {/* Date strip */}
      <View className="mb-4">
        <FlatList
          ref={scrollRef}
          data={days}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(d) => d.toISOString()}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          getItemLayout={(_, index) => ({ length: 64, offset: 64 * index, index })}
          renderItem={({ item: day }) => {
            const isSelected = day.toDateString() === selectedStr;
            const isToday = day.toDateString() === today.toDateString();
            const hasEvents = events.some(e => new Date(getStartTime(e)).toDateString() === day.toDateString());

            return (
              <Pressable
                onPress={() => setSelectedDate(day)}
                className="items-center mx-1"
                style={{
                  width: 56,
                  paddingVertical: 10,
                  borderRadius: 16,
                  backgroundColor: isSelected ? '#0d9488' : isToday ? '#0d948820' : 'transparent',
                }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: isSelected ? '#ffffff90' : '#4b5563' }}
                >
                  {WEEKDAYS[day.getDay()]}
                </Text>
                <Text
                  className="text-lg font-bold mt-1"
                  style={{ color: isSelected ? '#ffffff' : isToday ? '#0d9488' : '#ffffff' }}
                >
                  {day.getDate()}
                </Text>
                {hasEvents && !isSelected && (
                  <View className="w-1.5 h-1.5 rounded-full bg-palm-500 mt-1" />
                )}
                {isSelected && hasEvents && (
                  <View className="w-1.5 h-1.5 rounded-full bg-white mt-1" />
                )}
              </Pressable>
            );
          }}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
      >
        {connected === false && (
          <View className="bg-dark-800 rounded-2xl p-8 items-center">
            <View className="w-16 h-16 rounded-full bg-dark-700 items-center justify-center mb-4">
              <Ionicons name="calendar-outline" size={28} color="#4b5563" />
            </View>
            <Text className="text-dark-300 text-base font-medium text-center">
              Connect Google Calendar
            </Text>
            <Text className="text-dark-500 text-sm mt-1 text-center">
              Link your calendar from the web app to see events here
            </Text>
          </View>
        )}

        {connected && dayEvents.length === 0 && (
          <View className="bg-dark-800 rounded-2xl p-8 items-center">
            <View className="w-16 h-16 rounded-full bg-dark-700 items-center justify-center mb-4">
              <Ionicons name="sunny-outline" size={28} color="#4b5563" />
            </View>
            <Text className="text-dark-300 text-base font-medium">No events this day</Text>
            <Text className="text-dark-500 text-sm mt-1">Enjoy your free time</Text>
          </View>
        )}

        {dayEvents.map((evt) => (
          <View
            key={evt.id}
            className="bg-dark-800 rounded-2xl px-4 py-4 mb-3"
            style={{ borderLeftWidth: 3, borderLeftColor: '#0d9488' }}
          >
            <View className="flex-row items-start">
              <View className="w-10 h-10 rounded-2xl bg-palm-500/15 items-center justify-center mr-3 mt-0.5">
                <Ionicons name="calendar" size={18} color="#0d9488" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-[15px] font-semibold">{evt.summary}</Text>
                <Text className="text-dark-400 text-sm mt-1">
                  {isAllDay(evt) ? 'All day' : `${formatTime(getStartTime(evt))} - ${formatTime(getEndTime(evt))}`}
                </Text>
                {evt.location && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="location-outline" size={12} color="#4b5563" />
                    <Text className="text-dark-500 text-xs ml-1" numberOfLines={1}>{evt.location}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
