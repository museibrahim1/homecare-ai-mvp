import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { streamTranscribe } from '@/lib/streamTranscribe';
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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (clients.length === 0) fetchClients();
  }, [clients.length, fetchClients]);

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
    setLiveTranscript('');

    const onTranscript = (ev: { transcript: string }) => {
      if (!mountedRef.current) return;
      setLiveTranscript((prev) => (prev ? `${prev} ${ev.transcript}` : ev.transcript));
      setTimeout(() => transcriptRef.current?.scrollToEnd({ animated: true }), 100);
    };

    try {
      const visit = await api.post<Visit>('/visits', {
        client_id: selectedClient.id,
        status: 'in_progress',
      });

      streamTranscribe(uri, onTranscript).catch(() => {});

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: 'assessment.m4a',
        type: 'audio/m4a',
      } as unknown as Blob);
      formData.append('visit_id', visit.id);
      formData.append('auto_process', 'true');

      await api.upload('/uploads/audio', formData);

      if (!mountedRef.current) return;
      Alert.alert('Uploaded', 'Assessment uploaded & pipeline started.', [
        { text: 'View Pipeline', onPress: () => router.push(`/pipeline/${visit.id}`) },
      ]);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      if (mountedRef.current) setUploading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      <View className="px-6 pt-4 pb-3">
        <Text className="text-white text-2xl font-bold">Record</Text>
        <Text className="text-dark-400 text-sm mt-0.5">Voice assessment recording</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Client picker */}
        <View className="px-6 mb-6">
          <Text className="text-dark-400 text-xs font-semibold uppercase tracking-wider mb-2">Client</Text>
          <Pressable
            onPress={() => setShowPicker(!showPicker)}
            className="bg-dark-800 rounded-2xl px-4 py-3.5 flex-row items-center justify-between active:opacity-80"
            style={{
              borderWidth: selectedClient ? 1 : 0,
              borderColor: '#0d948840',
            }}
          >
            {selectedClient ? (
              <View className="flex-row items-center flex-1">
                <View className="w-9 h-9 rounded-xl bg-palm-500/15 items-center justify-center mr-3">
                  <Text className="text-palm-400 font-bold text-xs">
                    {selectedClient.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <View>
                  <Text className="text-white text-[15px] font-medium">{selectedClient.full_name}</Text>
                  {selectedClient.phone && (
                    <Text className="text-dark-500 text-xs mt-0.5">{selectedClient.phone}</Text>
                  )}
                </View>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="person-add-outline" size={16} color="#4b5563" />
                <Text className="text-dark-500 text-[15px] ml-2">Select a client...</Text>
              </View>
            )}
            <Ionicons name={showPicker ? 'chevron-up' : 'chevron-down'} size={18} color="#829bcd" />
          </Pressable>

          {showPicker && (
            <View className="bg-dark-800 rounded-2xl mt-2 max-h-52 overflow-hidden border border-dark-700/50">
              <ScrollView>
                {clients.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => { setSelectedClient(c); setShowPicker(false); }}
                    className="px-4 py-3 border-b border-dark-700/30 flex-row items-center active:bg-dark-700"
                  >
                    <View className="w-8 h-8 rounded-lg bg-palm-500/10 items-center justify-center mr-3">
                      <Text className="text-palm-400 font-bold text-[10px]">
                        {c.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </Text>
                    </View>
                    <Text className="text-white text-sm flex-1">{c.full_name}</Text>
                    {selectedClient?.id === c.id && <Ionicons name="checkmark-circle" size={18} color="#0d9488" />}
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
        <View className="items-center px-6">
          {uploading ? (
            <View className="items-center py-8">
              <View className="w-20 h-20 rounded-full bg-palm-500/10 items-center justify-center mb-4">
                <ActivityIndicator size="large" color="#0d9488" />
              </View>
              <Text className="text-white font-medium text-base">Processing...</Text>
              <Text className="text-dark-400 mt-1 text-sm">Uploading & starting pipeline</Text>
            </View>
          ) : (
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              onRecordingStart={onRecordingStart}
              onRecordingStop={onRecordingStop}
              disabled={!selectedClient}
            />
          )}
        </View>

        {/* Live transcript preview */}
        {(isRecording || uploading || liveTranscript) && (
          <View className="px-6 mt-6">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-7 h-7 rounded-lg bg-palm-500/15 items-center justify-center mr-2">
                  <Ionicons name="text" size={13} color="#0d9488" />
                </View>
                <Text className="text-white text-sm font-semibold">Live Transcript</Text>
              </View>
              {isRecording && (
                <View className="flex-row items-center bg-red-500/10 rounded-lg px-2.5 py-1">
                  <View className="w-2 h-2 rounded-full bg-red-500 mr-1.5" />
                  <Text className="text-red-400 text-xs font-medium">Listening</Text>
                </View>
              )}
              {uploading && !isRecording && (
                <View className="flex-row items-center bg-palm-500/10 rounded-lg px-2.5 py-1">
                  <ActivityIndicator size="small" color="#0d9488" />
                  <Text className="text-palm-400 text-xs font-medium ml-1.5">Transcribing</Text>
                </View>
              )}
            </View>
            <ScrollView
              ref={transcriptRef}
              className="bg-dark-800 rounded-2xl p-4 max-h-48 border border-dark-700/30"
              showsVerticalScrollIndicator={false}
            >
              {liveTranscript ? (
                <Text className="text-dark-200 text-sm leading-6">{liveTranscript}</Text>
              ) : (
                <View className="items-center py-4">
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color="#4b5563" />
                  <Text className="text-dark-500 text-sm mt-2">
                    Transcript will appear here as you speak...
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
