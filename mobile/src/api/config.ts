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
    cachedBaseUrl = envUrl.replace(/\/+$/, '');
    return cachedBaseUrl;
  }

  const isWebRemote =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    Boolean(window.location?.origin) &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  // Candidate ports commonly used by reverse proxy (same origin), dotnet run, and docker
  const candidates: string[] = [];
  if (isWebRemote) {
    candidates.push(window.location.origin);
  }
  candidates.push(
    `http://${defaultHost}:5127`,
    `http://${defaultHost}:5000`,
    `https://${defaultHost}:7110`,
    `http://${defaultHost}:8080`
  );

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

  // Fallback to same-origin in production web, or default port 5127 locally
  const fallback = isWebRemote ? window.location.origin : `http://${defaultHost}:5127`;
  cachedBaseUrl = fallback;
  return fallback;
}
