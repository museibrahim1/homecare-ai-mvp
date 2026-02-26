import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import type { PipelineState } from '@/lib/types';
import PipelineTracker from '@/components/PipelineTracker';
import LoadingScreen from '@/components/LoadingScreen';

const STEPS = ['process-transcript', 'diarization', 'alignment', 'billing', 'note', 'contract'] as const;

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

  const runStep = async (step: string) => {
    setRunning(step);
    try {
      if (step === 'process-transcript') {
        await api.post(`/pipeline/visits/${visitId}/process-transcript`);
      } else {
        await api.post(`/pipeline/visits/${visitId}/${step}`);
      }
      await loadStatus();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Pipeline step failed.');
    } finally {
      setRunning(null);
    }
  };

  const runAll = async () => {
    for (const step of STEPS) {
      setRunning(step);
      try {
        if (step === 'process-transcript') {
          await api.post(`/pipeline/visits/${visitId}/process-transcript`);
        } else {
          await api.post(`/pipeline/visits/${visitId}/${step}`);
        }
        await loadStatus();
      } catch {
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
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Pipeline',
          headerStyle: { backgroundColor: '#0a1628' },
          headerTintColor: '#ffffff',
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        className="flex-1 bg-dark-900 px-5"
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
      >
        {/* Status Header */}
        <View className="bg-dark-800 rounded-xl p-4 mb-4 flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-palm-500/20 items-center justify-center mr-3">
            <Ionicons name={allComplete ? 'checkmark-done' : 'git-branch'} size={20} color="#0d9488" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold text-base">
              {allComplete ? 'Pipeline Complete' : 'Processing Pipeline'}
            </Text>
            <Text className="text-dark-400 text-xs mt-0.5">Visit ID: {visitId?.slice(0, 8)}...</Text>
          </View>
        </View>

        {/* Pipeline Tracker */}
        <PipelineTracker state={state || undefined} />

        {/* Actions */}
        <View className="mt-4">
          {!allComplete && (
            <Pressable
              onPress={runAll}
              disabled={running !== null}
              className="bg-palm-500 rounded-xl py-4 items-center mb-2 active:opacity-80"
              style={{ opacity: running ? 0.6 : 1 }}
            >
              <Text className="text-white font-semibold text-base">
                {running ? `Running ${running}...` : 'Run Full Pipeline'}
              </Text>
            </Pressable>
          )}

          {allComplete && state?.contract && (
            <Pressable
              onPress={() => router.push(`/contract/${visitId}`)}
              className="bg-palm-500 rounded-xl py-4 items-center mb-2 active:opacity-80"
            >
              <Text className="text-white font-semibold text-base">View Generated Contract</Text>
            </Pressable>
          )}

          <Pressable
            onPress={onRefresh}
            className="bg-dark-800 rounded-xl py-3.5 items-center active:opacity-80"
          >
            <Text className="text-dark-300 font-medium text-sm">Refresh Status</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}
