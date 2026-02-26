import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, RefreshControl,
  Modal, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import ClientCard from '@/components/ClientCard';

export default function ClientsScreen() {
  const clients = useStore((s) => s.clients);
  const fetchClients = useStore((s) => s.fetchClients);
  const createClient = useStore((s) => s.createClient);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newClient, setNewClient] = useState({ full_name: '', phone: '', email: '' });

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchClients();
    setRefreshing(false);
  }, [fetchClients]);

  const filtered = clients.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAdd = async () => {
    if (!newClient.full_name.trim()) { Alert.alert('Required', 'Name is required.'); return; }
    setSaving(true);
    try {
      await createClient(newClient);
      setShowAdd(false);
      setNewClient({ full_name: '', phone: '', email: '' });
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create client.');
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <Text className="text-white text-2xl font-bold">Clients</Text>
        <Pressable onPress={() => setShowAdd(true)} className="bg-palm-500 rounded-xl px-3.5 py-2 flex-row items-center active:opacity-80">
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text className="text-white font-medium text-sm ml-1">Add</Text>
        </Pressable>
      </View>

      <View className="px-5 mb-3">
        <View className="flex-row items-center bg-dark-800 rounded-2xl px-4">
          <Ionicons name="search" size={16} color="#4b5563" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search..."
            placeholderTextColor="#4b5563"
            className="flex-1 text-white py-2.5 ml-2.5 text-sm"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#4b5563" />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ClientCard client={item} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Ionicons name="people-outline" size={36} color="#4b5563" />
            <Text className="text-dark-400 text-sm mt-3">{search ? 'No matches' : 'No clients yet'}</Text>
          </View>
        }
      />

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-dark-900">
          <SafeAreaView className="flex-1">
            <View className="flex-row items-center justify-between px-5 pt-4 pb-4 border-b border-dark-700/50">
              <Pressable onPress={() => setShowAdd(false)}><Text className="text-dark-400">Cancel</Text></Pressable>
              <Text className="text-white font-semibold">New Client</Text>
              <Pressable onPress={handleAdd} disabled={saving}>
                {saving ? <ActivityIndicator color="#0d9488" size="small" /> : <Text className="text-palm-400 font-semibold">Save</Text>}
              </Pressable>
            </View>
            <ScrollView className="flex-1 px-5 pt-6" keyboardShouldPersistTaps="handled">
              {[
                { label: 'Full Name *', key: 'full_name', placeholder: 'Margaret Johnson' },
                { label: 'Phone', key: 'phone', placeholder: '+1 (555) 000-0000', keyboard: 'phone-pad' as const },
                { label: 'Email', key: 'email', placeholder: 'client@email.com', keyboard: 'email-address' as const },
              ].map((field) => (
                <View key={field.key} className="mb-5">
                  <Text className="text-dark-300 text-sm mb-1.5">{field.label}</Text>
                  <TextInput
                    value={newClient[field.key as keyof typeof newClient]}
                    onChangeText={(t) => setNewClient((p) => ({ ...p, [field.key]: t }))}
                    placeholder={field.placeholder}
                    placeholderTextColor="#4b5563"
                    keyboardType={field.keyboard || 'default'}
                    autoCapitalize={field.key === 'email' ? 'none' : 'words'}
                    className="bg-dark-800 rounded-2xl px-4 py-3.5 text-white text-[15px]"
                  />
                </View>
              ))}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
