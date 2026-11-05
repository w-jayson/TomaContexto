import { Platform } from 'react-native';

const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const DEFAULT_API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.select({
    android: 'http://10.0.2.2:5127',
    default: 'http://localhost:5127',
  }) ?? 'http://localhost:5127');

let cachedBaseUrl: string | null = null;

/**
 * Dynamically resolves the API base URL.
 * Automatically discovers active backend instances across standard .NET ports
 * (5127 defined in launchSettings.json, 5000, 7110, or 8080).
 */
export async function getApiBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;

  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    cachedBaseUrl = envUrl;
    return envUrl;
  }

  // Candidate ports commonly used by dotnet run (launchSettings.json) and docker
  const candidates = [
    `http://${defaultHost}:5127`,
    `http://${defaultHost}:5000`,
    `https://${defaultHost}:7110`,
    `http://${defaultHost}:8080`,
  ];

  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${url}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        cachedBaseUrl = url;
        return url;
      }
    } catch {
      // Continue to next candidate
    }
  }

  // Fallback to default port 5127 (matches launchSettings.json)
  const fallback = `http://${defaultHost}:5127`;
  cachedBaseUrl = fallback;
  return fallback;
}
