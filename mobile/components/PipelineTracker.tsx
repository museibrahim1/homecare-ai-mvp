import { View, Text, Animated, Easing, useRef, useEffect } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PipelineState } from '@/lib/types';

const STAGES: { key: keyof PipelineState; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'transcription', label: 'Transcription', icon: 'mic-outline' },
  { key: 'diarization', label: 'Speaker ID', icon: 'people-outline' },
  { key: 'alignment', label: 'Alignment', icon: 'git-merge-outline' },
  { key: 'billing', label: 'Billing', icon: 'cash-outline' },
  { key: 'note', label: 'Visit Note', icon: 'document-text-outline' },
  { key: 'contract', label: 'Contract', icon: 'briefcase-outline' },
];

const STATUS_STYLE = {
  completed: { color: '#22c55e', bg: '#22c55e20', icon: 'checkmark-circle' as const },
  processing: { color: '#0d9488', bg: '#0d948830', icon: 'reload' as const },
  queued: { color: '#eab308', bg: '#eab30820', icon: 'time-outline' as const },
  failed: { color: '#ef4444', bg: '#ef444420', icon: 'close-circle' as const },
  pending: { color: '#4b5563', bg: '#4b556320', icon: 'ellipse-outline' as const },
};

function SpinningIcon({ name, color }: { name: keyof typeof Ionicons.glyphMap; color: string }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Ionicons name={name} size={18} color={color} />
    </Animated.View>
  );
}

export default function PipelineTracker({ state }: { state?: PipelineState }) {
  return (
    <View className="bg-dark-800 rounded-2xl p-5">
      <Text className="text-white font-bold text-base mb-4">Pipeline Progress</Text>

      {STAGES.map((stage, i) => {
        const stageState = state?.[stage.key];
        const status = stageState?.status || 'pending';
        const style = STATUS_STYLE[status] || STATUS_STYLE.pending;
        const isLast = i === STAGES.length - 1;
        const isCompleted = status === 'completed';
        const isProcessing = status === 'processing';

        return (
          <View key={stage.key} className="flex-row items-start">
            {/* Timeline */}
            <View className="items-center mr-4" style={{ width: 36 }}>
              <View
                className="w-9 h-9 rounded-xl items-center justify-center"
                style={{ backgroundColor: style.bg }}
              >
                {isProcessing ? (
                  <SpinningIcon name={style.icon} color={style.color} />
                ) : (
                  <Ionicons name={style.icon} size={18} color={style.color} />
                )}
              </View>
              {!isLast && (
                <View
                  className="w-0.5 my-1"
                  style={{
                    height: 24,
                    backgroundColor: isCompleted ? '#22c55e40' : '#1e3f7640',
                  }}
                />
              )}
            </View>

            {/* Content */}
            <View className="flex-1 pb-2" style={{ paddingTop: 6 }}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name={stage.icon} size={13} color="#829bcd" />
                  <Text className="text-white font-medium text-sm ml-1.5">{stage.label}</Text>
                </View>
                <View className="rounded-md px-2 py-0.5" style={{ backgroundColor: style.bg }}>
                  <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: style.color }}>
                    {status}
                  </Text>
                </View>
              </View>
              {stageState?.error && (
                <Text className="text-red-400 text-xs mt-1.5">{stageState.error}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
