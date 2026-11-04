import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedWord, WordLookupResponseDto } from '../types/word';

const SAVED_WORDS_KEY = '@tomaseucontexto_saved_words';
const RECENT_SEARCHES_KEY = '@tomaseucontexto_recent_searches';

export async function getSavedWords(): Promise<SavedWord[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_WORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function toggleSaveWord(word: WordLookupResponseDto): Promise<boolean> {
  const current = await getSavedWords();
  const index = current.findIndex(w => w.term.toLowerCase() === word.term.toLowerCase());

  if (index >= 0) {
    // Remove if already saved
    current.splice(index, 1);
    await AsyncStorage.setItem(SAVED_WORDS_KEY, JSON.stringify(current));
    return false; // is no longer saved
  } else {
    // Add to saved
    const firstTranslation = word.translationsByPos[0]?.translations[0] || 'Sem tradução direta';
    const newEntry: SavedWord = {
      term: word.term,
      phonetic: word.phonetic,
      mainTranslation: firstTranslation,
      savedAt: new Date().toLocaleDateString('pt-BR'),
    };
    current.unshift(newEntry);
    await AsyncStorage.setItem(SAVED_WORDS_KEY, JSON.stringify(current));
    return true; // is now saved
  }
}

export async function isWordSaved(term: string): Promise<boolean> {
  const current = await getSavedWords();
  return current.some(w => w.term.toLowerCase() === term.toLowerCase());
}

export async function removeSavedWord(term: string): Promise<SavedWord[]> {
  const current = await getSavedWords();
  const filtered = current.filter(w => w.term.toLowerCase() !== term.toLowerCase());
  await AsyncStorage.setItem(SAVED_WORDS_KEY, JSON.stringify(filtered));
  return filtered;
}

export async function getRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addRecentSearch(term: string): Promise<string[]> {
  const clean = term.trim().toLowerCase();
  if (!clean) return getRecentSearches();

  let list = await getRecentSearches();
  list = [clean, ...list.filter(item => item !== clean)].slice(0, 8);
  await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
  return list;
}
