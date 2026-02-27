import { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Alert, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';

interface Props {
  onRecordingComplete: (uri: string) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  disabled?: boolean;
}

function WaveformBar({ delay, isRecording }: { delay: number; isRecording: boolean }) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 400 + Math.random() * 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true, delay }),
          Animated.timing(anim, { toValue: 0.2 + Math.random() * 0.3, duration: 400 + Math.random() * 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      Animated.timing(anim, { toValue: 0.3, duration: 300, useNativeDriver: true }).start();
    }
  }, [isRecording, anim, delay]);

  return (
    <Animated.View
      style={{
        width: 4,
        height: 32,
        borderRadius: 2,
        backgroundColor: '#0d9488',
        marginHorizontal: 2,
        transform: [{ scaleY: anim }],
      }}
    />
  );
}

export default function AudioRecorder({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  disabled,
}: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Microphone access is needed to record assessments.');
        return;
      }

      await AudioModule.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      recorder.record();
      setIsRecording(true);
      setDuration(0);
      onRecordingStart?.();

      intervalRef.current = setInterval(() => {
        setDuration((d: number) => d + 1);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Recording error:', msg);
      Alert.alert('Recording Error', msg);
    }
  };

  const stopRecording = async () => {
    if (!recorder) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsRecording(false);
    onRecordingStop?.();

    try {
      await recorder.stop();
      const uri = recorder.uri;
      setDuration(0);

      if (uri) {
        onRecordingComplete(uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  return (
    <View className="items-center py-2">
      {/* Waveform visualization */}
      <View className="flex-row items-center justify-center h-12 mb-6">
        {isRecording ? (
          Array.from({ length: 20 }).map((_, i) => (
            <WaveformBar key={i} delay={i * 40} isRecording={isRecording} />
          ))
        ) : (
          <View className="flex-row items-center">
            <Ionicons name="mic-outline" size={18} color="#4b5563" />
            <Text className="text-dark-500 text-sm ml-2">Ready to record</Text>
          </View>
        )}
      </View>

      {/* Timer */}
      {isRecording && (
        <View className="items-center mb-6">
          <Text className="text-white text-5xl font-extralight tracking-widest">
            {formatTime(duration)}
          </Text>
          <View className="flex-row items-center mt-2">
            <View className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2" />
            <Text className="text-red-400 font-medium text-sm">Recording</Text>
          </View>
        </View>
      )}

      {/* Record button */}
      <Pressable
        onPress={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        className="items-center justify-center active:scale-95"
        style={{ opacity: disabled ? 0.4 : 1 }}
      >
        <Animated.View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: isRecording ? '#ef444430' : '#0d948830',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pulseAnim }],
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: isRecording ? '#ef4444' : '#0d9488',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: isRecording ? '#ef4444' : '#0d9488',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            <Ionicons name={isRecording ? 'stop' : 'mic'} size={34} color="#ffffff" />
          </View>
        </Animated.View>
      </Pressable>

      <Text className="text-dark-400 text-sm mt-5 font-medium">
        {isRecording ? 'Tap to stop recording' : disabled ? 'Select a client first' : 'Tap to start assessment'}
      </Text>
    </View>
  );
}
