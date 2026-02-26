import { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

let Audio: typeof import('expo-av').Audio | null = null;
try {
  Audio = require('expo-av').Audio;
} catch {
  // expo-av not available (Expo Go without native module)
}

interface Props {
  onRecordingComplete: (uri: string) => void;
  disabled?: boolean;
}

export default function AudioRecorder({ onRecordingComplete, disabled }: Props) {
  const [recording, setRecording] = useState<InstanceType<NonNullable<typeof Audio>['Recording']> | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [unavailable, setUnavailable] = useState(!Audio);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    if (!Audio) {
      setUnavailable(true);
      Alert.alert(
        'Development Build Required',
        'Audio recording requires a development build. Run `npx expo run:ios` to create one.',
      );
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Microphone access is needed to record assessments.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(newRecording);
      setIsRecording(true);
      setDuration(0);

      intervalRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      setUnavailable(true);
      Alert.alert(
        'Recording Unavailable',
        'Audio recording is not available in Expo Go. Use a development build instead.',
      );
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsRecording(false);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setDuration(0);

      if (uri) {
        onRecordingComplete(uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  if (unavailable) {
    return (
      <View className="items-center">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: '#1e3f76' }}
        >
          <Ionicons name="mic-off" size={32} color="#829bcd" />
        </View>
        <Text className="text-dark-300 text-sm text-center px-4">
          Audio recording requires a development build.
        </Text>
        <Text className="text-dark-500 text-xs text-center mt-1">
          Run: npx expo run:ios
        </Text>
      </View>
    );
  }

  return (
    <View className="items-center">
      {isRecording && (
        <View className="items-center mb-6">
          <View className="flex-row items-center mb-2">
            <View className="w-3 h-3 rounded-full bg-red-500 mr-2" />
            <Text className="text-red-400 font-medium text-sm">Recording</Text>
          </View>
          <Text className="text-white text-4xl font-light tracking-wider">
            {formatTime(duration)}
          </Text>
        </View>
      )}

      <Pressable
        onPress={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        className="items-center justify-center active:scale-95"
        style={{ opacity: disabled ? 0.4 : 1 }}
      >
        <View
          className="w-20 h-20 rounded-full items-center justify-center"
          style={{
            backgroundColor: isRecording ? '#ef4444' : '#0d9488',
            shadowColor: isRecording ? '#ef4444' : '#0d9488',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Ionicons name={isRecording ? 'stop' : 'mic'} size={32} color="#ffffff" />
        </View>
      </Pressable>

      <Text className="text-dark-400 text-sm mt-4">
        {isRecording ? 'Tap to stop' : 'Tap to record assessment'}
      </Text>
    </View>
  );
}
