import { View, Text } from 'react-native';
import type { ChatMessage } from '@/lib/types';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
}

export default function ChatBubble({ message, isOwn }: Props) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View className={`mb-3 ${isOwn ? 'items-end' : 'items-start'}`}>
      {!isOwn && (
        <Text className="text-dark-400 text-xs mb-1 ml-1">{message.sender_name}</Text>
      )}
      <View
        className="max-w-[80%] rounded-2xl px-4 py-2.5"
        style={{
          backgroundColor: isOwn ? '#0d9488' : '#1e3f76',
          borderBottomRightRadius: isOwn ? 4 : 16,
          borderBottomLeftRadius: isOwn ? 16 : 4,
        }}
      >
        <Text className="text-white text-sm leading-5">{message.content}</Text>
      </View>
      <Text className="text-dark-500 text-[10px] mt-1 mx-1">{time}</Text>
    </View>
  );
}
