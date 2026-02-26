import { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import AudioRecorder from '@/components/AudioRecorder';
import type { Client, Visit } from '@/lib/types';

export default function RecordScreen() {
  const router = useRouter();
  const clients = useStore((s) => s.clients);
  const fetchClients = useStore((s) => s.fetchClients);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (clients.length === 0) fetchClients();
  }, [clients.length, fetchClients]);

  const handleRecordingComplete = async (uri: string) => {
    if (!selectedClient) {
      Alert.alert('Select Client', 'Please select a client before recording.');
      return;
    }

    setUploading(true);
    try {
      const visit = await api.post<Visit>('/visits', {
        client_id: selectedClient.id,
        status: 'in_progress',
      });

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: 'assessment.m4a',
        type: 'audio/m4a',
      } as unknown as Blob);
      formData.append('visit_id', visit.id);

      await api.upload('/uploads', formData);

      Alert.alert('Upload Complete', 'Your assessment has been uploaded. Starting pipeline...', [
        {
          text: 'View Pipeline',
          onPress: () => router.push(`/pipeline/${visit.id}`),
        },
      ]);
    } catch (err: unknown) {
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <Text className="text-white text-2xl font-bold">Record Assessment</Text>
        <Text className="text-dark-400 text-sm mt-1">Select a client, then tap to record</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Client Selector */}
        <View className="px-5 mb-8">
          <Text className="text-dark-300 text-sm font-medium mb-2">Client</Text>
          <Pressable
            onPress={() => setShowPicker(!showPicker)}
            className="bg-dark-800 rounded-xl border border-dark-700 px-4 py-3.5 flex-row items-center justify-between active:opacity-80"
          >
            {selectedClient ? (
              <View className="flex-row items-center flex-1">
                <View className="w-8 h-8 rounded-full bg-palm-500/20 items-center justify-center mr-3">
                  <Text className="text-palm-400 font-bold text-xs">
                    {selectedClient.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </Text>
                </View>
                <Text className="text-white text-[15px]">{selectedClient.full_name}</Text>
              </View>
            ) : (
              <Text className="text-dark-500 text-[15px]">Select a client...</Text>
            )}
            <Ionicons name="chevron-down" size={18} color="#829bcd" />
          </Pressable>

          {showPicker && (
            <View className="bg-dark-800 rounded-xl border border-dark-700 mt-2 max-h-52 overflow-hidden">
              <ScrollView>
                {clients.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setSelectedClient(c);
                      setShowPicker(false);
                    }}
                    className="px-4 py-3 border-b border-dark-700 flex-row items-center active:bg-dark-700"
                  >
                    <Text className="text-white text-sm flex-1">{c.full_name}</Text>
                    {selectedClient?.id === c.id && (
                      <Ionicons name="checkmark" size={18} color="#0d9488" />
                    )}
                  </Pressable>
                ))}
                {clients.length === 0 && (
                  <View className="px-4 py-6 items-center">
                    <Text className="text-dark-400 text-sm">No clients. Add one first.</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Recorder */}
        <View className="items-center px-5">
          {uploading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#0d9488" />
              <Text className="text-dark-400 mt-4 text-sm">Uploading assessment...</Text>
            </View>
          ) : (
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              disabled={!selectedClient}
            />
          )}
        </View>

        {/* Info */}
        <View className="px-5 mt-10">
          <View className="bg-dark-800 rounded-xl p-4">
            <Text className="text-white font-semibold text-sm mb-2">How it works</Text>
            {[
              'Select a client above',
              'Tap the mic to start recording the assessment',
              'Speak naturally — AI handles the rest',
              'Upload triggers the full pipeline: transcription, billing, contract',
            ].map((step, i) => (
              <View key={i} className="flex-row items-start mb-1.5">
                <Text className="text-palm-400 text-sm font-bold mr-2">{i + 1}.</Text>
                <Text className="text-dark-400 text-sm flex-1 leading-5">{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
