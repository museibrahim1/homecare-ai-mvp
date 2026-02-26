import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import type { Client } from '@/lib/types';
import LoadingScreen from '@/components/LoadingScreen';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View className="flex-row justify-between py-2.5 border-b border-dark-700/50">
      <Text className="text-dark-400 text-sm">{label}</Text>
      <Text className="text-white text-sm font-medium text-right flex-1 ml-4">{value}</Text>
    </View>
  );
}

function Section({ title, icon, children }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View className="bg-dark-800 rounded-xl p-4 mb-3">
      <View className="flex-row items-center mb-3">
        <Ionicons name={icon} size={16} color="#0d9488" />
        <Text className="text-white font-semibold text-sm ml-2">{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function ClientProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<Client>(`/clients/${id}`);
        setClient(data);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingScreen />;
  if (!client) {
    return (
      <View className="flex-1 bg-dark-900 items-center justify-center">
        <Text className="text-white">Client not found</Text>
      </View>
    );
  }

  const STATUS_COLORS: Record<string, string> = {
    active: '#22c55e',
    pending: '#eab308',
    inactive: '#94a3b8',
    discharged: '#ef4444',
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerStyle: { backgroundColor: '#0a1628' },
          headerTintColor: '#ffffff',
          headerShadowVisible: false,
        }}
      />
      <ScrollView className="flex-1 bg-dark-900" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header Card */}
        <View className="px-5 pt-2 pb-4">
          <View className="bg-dark-800 rounded-xl p-5 items-center">
            <View className="w-16 h-16 rounded-full bg-palm-500/20 items-center justify-center mb-3">
              <Text className="text-palm-400 font-bold text-xl">
                {client.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </Text>
            </View>
            <Text className="text-white text-xl font-bold">{client.full_name}</Text>
            <View className="flex-row items-center mt-1.5">
              <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: STATUS_COLORS[client.status] || '#94a3b8' }} />
              <Text className="text-dark-400 text-sm capitalize">{client.status}</Text>
            </View>

            {/* Action buttons */}
            <View className="flex-row mt-4">
              <Pressable
                onPress={() => router.push(`/client/${id}/care-plan`)}
                className="bg-palm-500/20 rounded-xl px-4 py-2.5 flex-row items-center mr-2 active:opacity-80"
              >
                <Ionicons name="heart" size={14} color="#0d9488" />
                <Text className="text-palm-400 text-sm font-medium ml-1.5">Care Plan</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/client/${id}/contracts`)}
                className="bg-dark-700 rounded-xl px-4 py-2.5 flex-row items-center active:opacity-80"
              >
                <Ionicons name="briefcase" size={14} color="#829bcd" />
                <Text className="text-dark-300 text-sm font-medium ml-1.5">Contracts</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View className="px-5">
          <Section title="Contact" icon="call-outline">
            <InfoRow label="Phone" value={client.phone} />
            <InfoRow label="Secondary" value={client.phone_secondary} />
            <InfoRow label="Email" value={client.email} />
            <InfoRow label="Address" value={client.address} />
            <InfoRow label="City" value={client.city && client.state ? `${client.city}, ${client.state} ${client.zip_code || ''}` : client.city} />
          </Section>

          <Section title="Medical" icon="medkit-outline">
            <InfoRow label="Primary Diagnosis" value={client.primary_diagnosis} />
            <InfoRow label="Secondary" value={client.secondary_diagnoses} />
            <InfoRow label="Allergies" value={client.allergies} />
            <InfoRow label="Medications" value={client.medications} />
            <InfoRow label="Physician" value={client.physician_name} />
            <InfoRow label="Physician Phone" value={client.physician_phone} />
            {client.medical_notes && <Text className="text-dark-300 text-sm mt-2 leading-5">{client.medical_notes}</Text>}
          </Section>

          <Section title="Care" icon="heart-outline">
            <InfoRow label="Care Level" value={client.care_level} />
            <InfoRow label="Mobility" value={client.mobility_status} />
            <InfoRow label="Cognitive" value={client.cognitive_status} />
            <InfoRow label="Living Situation" value={client.living_situation} />
            <InfoRow label="Preferred Days" value={client.preferred_days} />
            <InfoRow label="Preferred Times" value={client.preferred_times} />
            {client.special_requirements && <Text className="text-dark-300 text-sm mt-2 leading-5">{client.special_requirements}</Text>}
          </Section>

          <Section title="Emergency Contacts" icon="alert-circle-outline">
            <InfoRow label="Contact 1" value={client.emergency_contact_name} />
            <InfoRow label="Phone" value={client.emergency_contact_phone} />
            <InfoRow label="Relation" value={client.emergency_contact_relationship} />
            {client.emergency_contact_name_2 && (
              <>
                <InfoRow label="Contact 2" value={client.emergency_contact_name_2} />
                <InfoRow label="Phone" value={client.emergency_contact_phone_2} />
                <InfoRow label="Relation" value={client.emergency_contact_relationship_2} />
              </>
            )}
          </Section>

          <Section title="Insurance" icon="card-outline">
            <InfoRow label="Provider" value={client.insurance_provider} />
            <InfoRow label="Insurance ID" value={client.insurance_id} />
            <InfoRow label="Medicaid ID" value={client.medicaid_id} />
            <InfoRow label="Medicare ID" value={client.medicare_id} />
          </Section>
        </View>
      </ScrollView>
    </>
  );
}
