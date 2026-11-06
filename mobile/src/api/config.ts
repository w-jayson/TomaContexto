import { Platform } from 'react-native';

const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const DEFAULT_API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.select({
    android: 'http://10.0.2.2:5127',
    default: 'http://localhost:5127',
  }) ?? 'http://localhost:5127');

let cachedBaseUrl: string | null = null;
let resolvingPromise: Promise<string> | null = null;

async function probeUrl(url: string, timeoutMs = 1200): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (res.ok) {
      return url;
    }
    throw new Error(`Endpoint ${url} returned ${res.status}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Dynamically resolves the API base URL with parallel probing (eliminates waterfalls).
 * Automatically discovers active backend instances across standard .NET ports
 * (5127 defined in launchSettings.json, 5000, 7110, or 8080).
 */
export async function getApiBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;
  if (resolvingPromise) return resolvingPromise;

  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    const sanitized = envUrl.replace(/\/+$/, '');
    cachedBaseUrl = sanitized;
    return sanitized;
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

  resolvingPromise = (async () => {
    try {
      // Parallel probing using Promise.any to eliminate sequential waterfalls (async-parallel)
      const healthyUrl = await Promise.any(candidates.map((url) => probeUrl(url)));
      cachedBaseUrl = healthyUrl;
      return healthyUrl;
    } catch {
      // Fallback to same-origin in production web, or default port 5127 locally
      const fallback = isWebRemote ? window.location.origin : `http://${defaultHost}:5127`;
      cachedBaseUrl = fallback;
      return fallback;
    } finally {
      resolvingPromise = null;
    }
  })();

  return resolvingPromise;
}
