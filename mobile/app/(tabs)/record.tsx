import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const transcriptRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (clients.length === 0) fetchClients();
  }, [clients.length, fetchClients]);

  const onTranscriptUpdate = useCallback((text: string) => {
    setLiveTranscript((prev) => {
      const updated = prev ? `${prev} ${text}` : text;
      return updated;
    });
    setTimeout(() => transcriptRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const onRecordingStart = useCallback(() => {
    setIsRecording(true);
    setLiveTranscript('');
  }, []);

  const onRecordingStop = useCallback(() => {
    setIsRecording(false);
  }, []);

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
      formData.append('auto_process', 'true');

      await api.upload('/uploads/audio', formData);

      Alert.alert('Uploaded', 'Assessment uploaded & pipeline started.', [
        { text: 'View Pipeline', onPress: () => router.push(`/pipeline/${visit.id}`) },
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
        <Text className="text-white text-2xl font-bold">Record</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Client picker */}
        <View className="px-5 mb-6">
          <Pressable
            onPress={() => setShowPicker(!showPicker)}
            className="bg-dark-800 rounded-2xl px-4 py-3.5 flex-row items-center justify-between active:opacity-80"
          >
            {selectedClient ? (
              <View className="flex-row items-center flex-1">
                <View className="w-8 h-8 rounded-full bg-palm-500/20 items-center justify-center mr-3">
                  <Text className="text-palm-400 font-bold text-xs">
                    {selectedClient.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <Text className="text-white text-[15px]">{selectedClient.full_name}</Text>
              </View>
            ) : (
              <Text className="text-dark-500 text-[15px]">Select a client...</Text>
            )}
            <Ionicons name={showPicker ? 'chevron-up' : 'chevron-down'} size={18} color="#829bcd" />
          </Pressable>

          {showPicker && (
            <View className="bg-dark-800 rounded-2xl mt-2 max-h-52 overflow-hidden">
              <ScrollView>
                {clients.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => { setSelectedClient(c); setShowPicker(false); }}
                    className="px-4 py-3 border-b border-dark-700/50 flex-row items-center active:bg-dark-700"
                  >
                    <Text className="text-white text-sm flex-1">{c.full_name}</Text>
                    {selectedClient?.id === c.id && <Ionicons name="checkmark" size={18} color="#0d9488" />}
                  </Pressable>
                ))}
                {clients.length === 0 && (
                  <View className="px-4 py-6 items-center">
                    <Text className="text-dark-400 text-sm">No clients yet</Text>
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
              <Text className="text-dark-400 mt-4 text-sm">Uploading & starting pipeline...</Text>
            </View>
          ) : (
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              onTranscriptUpdate={onTranscriptUpdate}
              onRecordingStart={onRecordingStart}
              onRecordingStop={onRecordingStop}
              disabled={!selectedClient}
            />
          )}
        </View>

        {/* Live transcript preview */}
        {(isRecording || liveTranscript) && (
          <View className="px-5 mt-6">
            <View className="flex-row items-center mb-2">
              <Ionicons name="text" size={14} color="#0d9488" />
              <Text className="text-palm-400 text-xs font-semibold ml-1.5 uppercase tracking-wider">
                Live Transcript
              </Text>
              {isRecording && (
                <View className="ml-2 flex-row items-center">
                  <View className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1" />
                  <Text className="text-red-400 text-xs">listening</Text>
                </View>
              )}
            </View>
            <ScrollView
              ref={transcriptRef}
              className="bg-dark-800 rounded-2xl p-4 max-h-48"
              showsVerticalScrollIndicator={false}
            >
              {liveTranscript ? (
                <Text className="text-dark-200 text-sm leading-5">{liveTranscript}</Text>
              ) : (
                <Text className="text-dark-500 text-sm italic">
                  Transcript will appear here as you speak...
                </Text>
              )}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
