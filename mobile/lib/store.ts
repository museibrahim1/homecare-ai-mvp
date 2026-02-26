import { create } from 'zustand';
import type { User, Client, Visit, Contract } from './types';
import { api } from './api';
import { setToken, removeToken, clearAll, setCachedUser } from './auth';

interface AppState {
  user: User | null;
  clients: Client[];
  visits: Visit[];
  contracts: Contract[];
  isLoading: boolean;

  setUser: (user: User | null) => void;

  login: (email: string, password: string) => Promise<{ requiresMfa: boolean; mfaToken?: string }>;
  completeMfa: (mfaToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;

  fetchClients: () => Promise<void>;
  createClient: (data: Partial<Client>) => Promise<Client>;

  fetchVisits: () => Promise<void>;
  fetchContracts: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  clients: [],
  visits: [],
  contracts: [],
  isLoading: false,

  setUser: (user) => set({ user }),

  login: async (email, password) => {
    const res = await api.post<{
      access_token?: string;
      requires_mfa?: boolean;
      mfa_token?: string;
    }>('/auth/login', { email, password }, { noAuth: true });

    if (res.requires_mfa) {
      return { requiresMfa: true, mfaToken: res.mfa_token };
    }

    if (res.access_token) {
      await setToken(res.access_token);
      await get().fetchUser();
    }

    return { requiresMfa: false };
  },

  completeMfa: async (mfaToken, code) => {
    const res = await api.post<{ access_token: string }>(
      '/auth/mfa/login',
      { mfa_token: mfaToken, code },
      { noAuth: true },
    );
    await setToken(res.access_token);
    await get().fetchUser();
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore errors during logout
    }
    await clearAll();
    set({ user: null, clients: [], visits: [], contracts: [] });
  },

  fetchUser: async () => {
    const user = await api.get<User>('/auth/me');
    await setCachedUser(JSON.stringify(user));
    set({ user });
  },

  fetchClients: async () => {
    set({ isLoading: true });
    try {
      const data = await api.get<{ items?: Client[]; clients?: Client[] }>('/clients');
      set({ clients: data.items || data.clients || [] });
    } finally {
      set({ isLoading: false });
    }
  },

  createClient: async (data) => {
    const client = await api.post<Client>('/clients', data as Record<string, unknown>);
    set((s) => ({ clients: [client, ...s.clients] }));
    return client;
  },

  fetchVisits: async () => {
    const data = await api.get<{ items?: Visit[]; visits?: Visit[] }>('/visits');
    set({ visits: data.items || data.visits || [] });
  },

  fetchContracts: async () => {
    const data = await api.get<{ items?: Contract[]; contracts?: Contract[] }>('/visits/contracts');
    set({ contracts: data.items || data.contracts || [] });
  },
}));
