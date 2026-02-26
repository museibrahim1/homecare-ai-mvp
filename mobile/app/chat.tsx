import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '@/lib/api';
import { useStore } from '@/lib/store';
import ChatBubble from '@/components/ChatBubble';
import type { ChatMessage } from '@/lib/types';

export default function TeamChatScreen() {
  const user = useStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    try {
      const data = await api.get<{ messages?: ChatMessage[]; items?: ChatMessage[] }>('/team-chat/messages');
      setMessages(data.messages || data.items || []);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        setUnavailable(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
    if (!unavailable) {
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [loadMessages, unavailable]);

  const sendMessage = async () => {
    if (!input.trim() || sending || unavailable) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender_id: user?.id || '',
      sender_name: user?.full_name || 'You',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await api.post('/team-chat/messages', { content: text });
      await loadMessages();
    } catch {
      // keep optimistic
    } finally {
      setSending(false);
    }
  };

  if (unavailable) {
    return (
      <>
        <Stack.Screen options={{ title: 'Team Chat' }} />
        <View className="flex-1 bg-dark-900 items-center justify-center px-8">
          <Ionicons name="chatbubbles-outline" size={48} color="#4b5563" />
          <Text className="text-white font-semibold text-lg mt-4">Coming Soon</Text>
          <Text className="text-dark-400 text-sm mt-2 text-center leading-5">
            Team chat is being set up. This feature will be available in the next update.
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Team Chat' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-dark-900"
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatBubble message={item} isOwn={item.sender_id === user?.id} />}
          contentContainerStyle={{ padding: 20, paddingBottom: 8 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            loading ? (
              <View className="items-center py-16"><ActivityIndicator color="#0d9488" /></View>
            ) : (
              <View className="items-center py-16">
                <Ionicons name="chatbubbles-outline" size={36} color="#4b5563" />
                <Text className="text-dark-400 text-sm mt-3">No messages yet</Text>
              </View>
            )
          }
        />
        <View className="px-5 pb-3 pt-2 border-t border-dark-700/50 bg-dark-900">
          <SafeAreaView edges={['bottom']}>
            <View className="flex-row items-end">
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Type a message..."
                placeholderTextColor="#4b5563"
                multiline
                maxLength={1000}
                className="flex-1 bg-dark-800 rounded-2xl px-4 py-3 text-white text-[15px] max-h-24 mr-2"
              />
              <Pressable
                onPress={sendMessage}
                disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-xl bg-palm-500 items-center justify-center active:opacity-80"
                style={{ opacity: !input.trim() || sending ? 0.3 : 1 }}
              >
                <Ionicons name="send" size={16} color="#ffffff" />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
