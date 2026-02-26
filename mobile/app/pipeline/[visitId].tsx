import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import type { PipelineState } from '@/lib/types';
import PipelineTracker from '@/components/PipelineTracker';
import LoadingScreen from '@/components/LoadingScreen';

const PIPELINE_STEPS = [
  { name: 'Transcribe', endpoint: 'process-transcript' },
  { name: 'Diarize', endpoint: 'diarize' },
  { name: 'Align', endpoint: 'align' },
  { name: 'Billing', endpoint: 'bill' },
  { name: 'Note', endpoint: 'note' },
  { name: 'Contract', endpoint: 'contract' },
] as const;

export default function PipelineScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const router = useRouter();
  const [state, setState] = useState<PipelineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await api.get<PipelineState>(`/pipeline/visits/${visitId}/status`);
      setState(data);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatus();
    setRefreshing(false);
  };

  const runAll = async () => {
    for (const step of PIPELINE_STEPS) {
      setRunning(step.name);
      try {
        await api.post(`/pipeline/visits/${visitId}/${step.endpoint}`);
        await loadStatus();
      } catch {
        await loadStatus();
        break;
      }
    }
    setRunning(null);
  };

  if (loading) return <LoadingScreen />;

  const allComplete =
    state?.transcription?.status === 'completed' &&
    state?.contract?.status === 'completed';

  return (
    <>
      <Stack.Screen options={{ title: 'Pipeline' }} />
      <ScrollView
        className="flex-1 bg-dark-900 px-5"
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
      >
        <PipelineTracker state={state || undefined} />

        <View className="mt-4">
          {!allComplete && (
            <Pressable
              onPress={runAll}
              disabled={running !== null}
              className="bg-palm-500 rounded-xl py-3.5 items-center mb-2 active:opacity-80"
              style={{ opacity: running ? 0.6 : 1 }}
            >
              <Text className="text-white font-semibold text-[15px]">
                {running ? `Running ${running}...` : 'Run Full Pipeline'}
              </Text>
            </Pressable>
          )}

          {allComplete && (
            <Pressable
              onPress={() => router.push(`/contract/${visitId}`)}
              className="bg-palm-500 rounded-xl py-3.5 items-center mb-2 active:opacity-80"
            >
              <Text className="text-white font-semibold text-[15px]">View Contract</Text>
            </Pressable>
          )}

          <Pressable
            onPress={onRefresh}
            className="bg-dark-800 rounded-xl py-3 items-center active:opacity-80"
          >
            <Text className="text-dark-300 text-sm">Refresh</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}
