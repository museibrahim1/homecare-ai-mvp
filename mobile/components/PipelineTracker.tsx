import { View, Text } from 'react-native';
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
  completed: { color: '#22c55e', icon: 'checkmark-circle' as const },
  processing: { color: '#0d9488', icon: 'reload' as const },
  queued: { color: '#eab308', icon: 'time-outline' as const },
  failed: { color: '#ef4444', icon: 'close-circle' as const },
  pending: { color: '#4b5563', icon: 'ellipse-outline' as const },
};

export default function PipelineTracker({ state }: { state?: PipelineState }) {
  return (
    <View className="bg-dark-800 rounded-xl p-4">
      {STAGES.map((stage, i) => {
        const stageState = state?.[stage.key];
        const status = stageState?.status || 'pending';
        const style = STATUS_STYLE[status] || STATUS_STYLE.pending;
        const isLast = i === STAGES.length - 1;

        return (
          <View key={stage.key} className="flex-row items-start">
            <View className="items-center mr-3">
              <Ionicons name={style.icon} size={22} color={style.color} />
              {!isLast && (
                <View
                  className="w-0.5 h-8 my-1"
                  style={{ backgroundColor: status === 'completed' ? '#22c55e' : '#1e3f76' }}
                />
              )}
            </View>
            <View className="flex-1 pb-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name={stage.icon} size={14} color="#829bcd" />
                  <Text className="text-white font-medium text-sm ml-1.5">{stage.label}</Text>
                </View>
                <Text className="text-xs capitalize" style={{ color: style.color }}>
                  {status}
                </Text>
              </View>
              {stageState?.error && (
                <Text className="text-red-400 text-xs mt-1">{stageState.error}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
