import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'palmcare_token';
const USER_KEY = 'palmcare_user';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getCachedUser(): Promise<string | null> {
  return SecureStore.getItemAsync(USER_KEY);
}

export async function setCachedUser(userJson: string): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, userJson);
}

export async function clearAll(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
