import { View, ActivityIndicator, Text } from 'react-native';

export default function LoadingScreen({ message }: { message?: string }) {
  return (
    <View className="flex-1 bg-dark-900 items-center justify-center">
      <ActivityIndicator size="large" color="#0d9488" />
      {message && <Text className="text-dark-400 mt-4 text-sm">{message}</Text>}
    </View>
  );
}
