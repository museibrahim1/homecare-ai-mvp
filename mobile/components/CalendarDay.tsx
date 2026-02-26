import { View, Text, Pressable } from 'react-native';

interface Props {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
  hasEvents: boolean;
  onPress: () => void;
}

export default function CalendarDay({ date, isToday, isSelected, hasEvents, onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="items-center justify-center w-10 h-10 mx-0.5">
      <View
        className="w-9 h-9 rounded-full items-center justify-center"
        style={{
          backgroundColor: isSelected ? '#0d9488' : isToday ? '#0d948830' : 'transparent',
        }}
      >
        <Text
          className="text-sm font-medium"
          style={{ color: isSelected ? '#ffffff' : isToday ? '#0d9488' : '#c5d1e8' }}
        >
          {date.getDate()}
        </Text>
      </View>
      {hasEvents && !isSelected && (
        <View className="w-1 h-1 rounded-full bg-palm-400 mt-0.5" />
      )}
    </Pressable>
  );
}
