import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ icon = 'folder-open-outline', title, subtitle }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Ionicons name={icon} size={48} color="#829bcd" />
      <Text className="text-white text-lg font-semibold mt-4 text-center">{title}</Text>
      {subtitle && (
        <Text className="text-dark-400 text-sm mt-2 text-center leading-5">{subtitle}</Text>
      )}
    </View>
  );
}
