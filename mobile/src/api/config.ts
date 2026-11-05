import { Platform } from 'react-native';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Platform.select({
    android: 'http://10.0.2.2:5000',
    default: 'http://localhost:5000',
  });

export async function getApiBaseUrl(): Promise<string> {
  return API_BASE_URL;
}
