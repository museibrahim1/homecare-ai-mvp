import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import ChatBubble from '@/components/ChatBubble';
import type { ChatMessage } from '@/lib/types';

export default function TeamChatScreen() {
  const user = useStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    try {
      const data = await api.get<{ messages?: ChatMessage[]; items?: ChatMessage[] }>(
        '/team-chat/messages',
      );
      setMessages(data.messages || data.items || []);
    } catch {
      // endpoint may not exist yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

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
      // keep optimistic message
    } finally {
      setSending(false);
    }
  };

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
          renderItem={({ item }) => (
            <ChatBubble message={item} isOwn={item.sender_id === user?.id} />
          )}
          contentContainerStyle={{ padding: 20, paddingBottom: 8 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            loading ? (
              <View className="items-center py-16">
                <ActivityIndicator color="#0d9488" />
              </View>
            ) : (
              <View className="items-center py-16">
                <Ionicons name="chatbubbles-outline" size={48} color="#829bcd" />
                <Text className="text-white font-semibold text-lg mt-4">No messages yet</Text>
                <Text className="text-dark-400 text-sm mt-1">Start the conversation</Text>
              </View>
            )
          }
        />

        <View className="px-5 pb-3 pt-2 border-t border-dark-700 bg-dark-900">
          <SafeAreaView edges={['bottom']}>
            <View className="flex-row items-end">
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Type a message..."
                placeholderTextColor="#4b5563"
                multiline
                maxLength={1000}
                className="flex-1 bg-dark-800 rounded-xl border border-dark-700 px-4 py-3 text-white text-[15px] max-h-24 mr-2"
              />
              <Pressable
                onPress={sendMessage}
                disabled={!input.trim() || sending}
                className="w-11 h-11 rounded-xl bg-palm-500 items-center justify-center active:opacity-80"
                style={{ opacity: !input.trim() || sending ? 0.4 : 1 }}
              >
                <Ionicons name="send" size={18} color="#ffffff" />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
