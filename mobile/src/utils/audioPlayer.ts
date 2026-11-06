import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { getApiBaseUrl } from '../api/config';

let currentSound: Audio.Sound | null = null;
let currentWebAudio: HTMLAudioElement | null = null;

export interface PlayAudioOptions {
  text: string;
  type?: 'word' | 'sentence';
  rate?: number;
  onStart?: () => void;
  onDone?: () => void;
  onError?: () => void;
}

/**
 * Stops any currently playing audio across both native expo-av and web HTMLAudio.
 */
export async function stopAudio(): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && currentWebAudio) {
      currentWebAudio.pause();
      currentWebAudio.currentTime = 0;
      currentWebAudio = null;
    }

    if (currentSound) {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
    }

    await Speech.stop();
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Fallback to device-native Text-to-Speech (expo-speech).
 */
function playNativeTtsFallback(
  text: string,
  rate = 0.9,
  onDone?: () => void,
  onError?: () => void
): void {
  try {
    Speech.speak(text, {
      language: 'en-US',
      rate,
      onDone: () => onDone?.(),
      onError: () => onError?.(),
    });
  } catch {
    onError?.();
  }
}

/**
 * Plays high-fidelity audio from the backend VPS cache (Google Neural2 TTS),
 * with an automatic, seamless fallback to client-side expo-speech if the server is offline
 * or if no Google Cloud key is configured.
 */
export async function playSmartAudio(options: PlayAudioOptions): Promise<void> {
  const { text, type = 'sentence', rate = 0.9, onStart, onDone, onError } = options;
  const trimmed = text.trim();
  if (!trimmed) return;

  await stopAudio();
  onStart?.();

  let audioUrl: string | null = null;
  try {
    const baseUrl = await getApiBaseUrl();
    audioUrl = `${baseUrl}/api/Audio/synthesize?text=${encodeURIComponent(trimmed)}&type=${type}`;
  } catch {
    audioUrl = null;
  }

  // 1. WEB PLATFORM: Native HTML5 Audio
  if (Platform.OS === 'web' && typeof window !== 'undefined' && audioUrl) {
    try {
      const audio = new window.Audio(audioUrl);
      currentWebAudio = audio;

      audio.onended = () => {
        currentWebAudio = null;
        onDone?.();
      };

      audio.onerror = () => {
        currentWebAudio = null;
        // Fallback to Web Speech API
        playNativeTtsFallback(trimmed, rate, onDone, onError);
      };

      await audio.play();
      return;
    } catch {
      currentWebAudio = null;
      playNativeTtsFallback(trimmed, rate, onDone, onError);
      return;
    }
  }

  // 2. MOBILE PLATFORMS (Android / iOS): expo-av
  if (Platform.OS !== 'web' && audioUrl) {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, rate: 1.0 },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            currentSound = null;
            onDone?.();
          }
        }
      );

      currentSound = sound;
      return;
    } catch {
      currentSound = null;
      // Fallback to Android / iOS Text-to-Speech
      playNativeTtsFallback(trimmed, rate, onDone, onError);
      return;
    }
  }

  // 3. Fallback when baseUrl or server audio could not be determined
  playNativeTtsFallback(trimmed, rate, onDone, onError);
}
