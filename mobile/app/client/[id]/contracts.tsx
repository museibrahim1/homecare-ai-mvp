import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { api } from '@/lib/api';
import type { Contract } from '@/lib/types';
import ContractCard from '@/components/ContractCard';
import LoadingScreen from '@/components/LoadingScreen';
import EmptyState from '@/components/EmptyState';

export default function ClientContractsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<{ items?: Contract[]; contracts?: Contract[] }>(
          `/visits/clients/${id}/contracts`,
        );
        setContracts(data.items || data.contracts || []);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingScreen />;

  return (
    <>
      <Stack.Screen options={{ title: 'Contracts' }} />
      <ScrollView className="flex-1 bg-dark-900 px-5" contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}>
        {contracts.length === 0 ? (
          <EmptyState
            icon="briefcase-outline"
            title="No Contracts"
            subtitle="Contracts will appear here after running the assessment pipeline."
          />
        ) : (
          contracts.map((c) => <ContractCard key={c.id} contract={c} />)
        )}
      </ScrollView>
    </>
  );
}
