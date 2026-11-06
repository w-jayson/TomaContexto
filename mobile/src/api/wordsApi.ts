import { WordLookupResponseDto } from '../types/word';
import { getApiBaseUrl } from './config';

// Mock words available for offline preview or immediate design verification
const MOCK_WORDS: Record<string, WordLookupResponseDto> = {
  resilience: {
    term: 'resilience',
    phonetic: '/rɪˈzɪl.jəns/',
    translationsByPos: [
      {
        partOfSpeech: 'noun',
        translations: ['resiliência', 'capacidade de recuperação', 'elasticidade'],
      },
    ],
    exampleSentences: [
      {
        en: 'The community showed remarkable resilience after the natural disaster.',
        pt: 'A comunidade mostrou uma resiliência notável após o desastre natural.',
      },
      {
        en: 'Emotional resilience is a skill that can be developed over time.',
        pt: 'A resiliência emocional é uma habilidade que pode ser desenvolvida ao longo do tempo.',
      },
      {
        en: 'Economic resilience allowed the company to survive the market downturn.',
        pt: 'A resiliência econômica permitiu que a empresa sobrevivesse à crise do mercado.',
      },
    ],
  },
  serendipity: {
    term: 'serendipity',
    phonetic: '/ˌser.ənˈdɪp.ə.ti/',
    translationsByPos: [
      {
        partOfSpeech: 'noun',
        translations: ['acaso afortunado', 'serendipidade', 'sorte inesperada'],
      },
    ],
    exampleSentences: [
      {
        en: 'Finding my dream job was pure serendipity through a chance meeting.',
        pt: 'Encontrar o emprego dos meus sonhos foi pura serendipidade por meio de um encontro casual.',
      },
      {
        en: 'Penicillin was discovered through a famous moment of scientific serendipity.',
        pt: 'A penicilina foi descoberta através de um famoso momento de acaso afortunado na ciência.',
      },
    ],
  },
  breakthrough: {
    term: 'breakthrough',
    phonetic: '/ˈbreɪk.θruː/',
    translationsByPos: [
      {
        partOfSpeech: 'noun',
        translations: ['avanço significativo', 'grande descoberta', 'ponto de virada'],
      },
    ],
    exampleSentences: [
      {
        en: 'Scientists announced a historic breakthrough in renewable energy storage.',
        pt: 'Cientistas anunciaram um avanço histórico no armazenamento de energia renovável.',
      },
      {
        en: 'After hours of debugging, the team achieved a major breakthrough in the code.',
        pt: 'Após horas de depuração, a equipe conquistou um grande avanço no código.',
      },
    ],
  },
};

export const MAX_SEARCH_LENGTH = 80;
const CLIENT_RATE_LIMIT_MAX_REQUESTS = 15;
const CLIENT_RATE_LIMIT_WINDOW_MS = 60_000;
const requestTimestamps: number[] = [];

export interface WordSuggestion {
  word: string;
  isCorrection: boolean;
}

/**
 * Fetches real-time autocomplete and spell-correction suggestions while the user types.
 * Combines local backend repository matches with Datamuse lexical/spellcheck suggestions.
 * Optimized with single-pass candidate partitioning (js-combine-iterations).
 */
export async function fetchWordSuggestions(
  query: string,
  recentSearches: string[] = []
): Promise<WordSuggestion[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (cleanQuery.length < 2 || cleanQuery.length > MAX_SEARCH_LENGTH) {
    return [];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const baseUrl = await getApiBaseUrl();

    const [backendRes, datamuseSugRes] = await Promise.allSettled([
      fetch(`${baseUrl}/api/Words/suggestions?q=${encodeURIComponent(cleanQuery)}`, {
        signal: controller.signal,
      }).then((r) => (r.ok ? (r.json() as Promise<string[]>) : [])),
      fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(cleanQuery)}&max=8`, {
        signal: controller.signal,
      }).then((r) => (r.ok ? (r.json() as Promise<Array<{ word: string }>>) : [])),
    ]);

    const seen = new Set<string>();
    const prefixMatches: string[] = [];
    const fuzzyMatches: string[] = [];

    const addCandidate = (raw: string | undefined | null) => {
      if (!raw) return;
      const term = raw.trim().toLowerCase();
      if (!term || term === cleanQuery || seen.has(term)) return;
      seen.add(term);

      if (term.startsWith(cleanQuery)) {
        if (prefixMatches.length < 5) {
          prefixMatches.push(term);
        }
      } else {
        if (fuzzyMatches.length < 3) {
          fuzzyMatches.push(term);
        }
      }
    };

    // 1. Process recent searches first (highest personal relevance)
    for (let i = 0; i < recentSearches.length; i++) {
      addCandidate(recentSearches[i]);
    }

    // 2. Process backend repository matches
    if (backendRes.status === 'fulfilled') {
      const backendWords = backendRes.value;
      for (let i = 0; i < backendWords.length; i++) {
        addCandidate(backendWords[i]);
      }
    }

    // 3. Process datamuse suggestions
    if (datamuseSugRes.status === 'fulfilled') {
      const sugWords = datamuseSugRes.value;
      for (let i = 0; i < sugWords.length; i++) {
        addCandidate(sugWords[i]?.word);
      }
    }

    // 4. Process mock words
    const mockKeys = Object.keys(MOCK_WORDS);
    for (let i = 0; i < mockKeys.length; i++) {
      addCandidate(mockKeys[i]);
    }

    if (prefixMatches.length > 0) {
      return prefixMatches.map((word) => ({
        word,
        isCorrection: false,
      }));
    }

    return fuzzyMatches.map((word, idx) => ({
      word,
      isCorrection: idx === 0,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Finds the best "Did you mean?" spelling suggestion when a searched term is not found (e.g. "aple" -> "apple").
 */
export async function fetchDidYouMean(term: string): Promise<string | null> {
  const cleanTerm = term.trim().toLowerCase();
  if (cleanTerm.length < 2 || cleanTerm.length > MAX_SEARCH_LENGTH) {
    return null;
  }

  try {
    const suggestions = await fetchWordSuggestions(cleanTerm);
    const best = suggestions.find((s) => s.word !== cleanTerm);
    return best ? best.word : null;
  } catch {
    return null;
  }
}

export async function lookupWord(term: string): Promise<WordLookupResponseDto> {
  const cleanTerm = term.trim().toLowerCase();

  if (cleanTerm.length > MAX_SEARCH_LENGTH) {
    throw new Error(
      `O termo pesquisado é muito longo (máximo de ${MAX_SEARCH_LENGTH} caracteres). Digite apenas uma palavra ou expressão.`
    );
  }

  // Client-side sliding window rate limit check
  const now = Date.now();
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] > CLIENT_RATE_LIMIT_WINDOW_MS) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= CLIENT_RATE_LIMIT_MAX_REQUESTS) {
    const retrySeconds = Math.ceil(
      (CLIENT_RATE_LIMIT_WINDOW_MS - (now - requestTimestamps[0])) / 1000
    );
    throw new Error(
      `Muitas buscas em pouco tempo. Aguarde cerca de ${retrySeconds}s antes de pesquisar novamente.`
    );
  }
  requestTimestamps.push(now);

  const baseUrl = await getApiBaseUrl();

  let response: Response;
  const controller = new AbortController();
  // 45s timeout to comfortably accommodate free-tier cloud cold starts and LLM generation
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    response = await fetch(`${baseUrl}/api/Words/${encodeURIComponent(cleanTerm)}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } catch (err: any) {
    // If backend is not running or network request failed, check if mock word exists safely
    if (Object.prototype.hasOwnProperty.call(MOCK_WORDS, cleanTerm)) {
      return MOCK_WORDS[cleanTerm];
    }

    if (err.name === 'AbortError') {
      throw new Error(
        'O servidor na nuvem demorou para responder (comum ao acordar da hibernação). Por favor, tente novamente agora!'
      );
    }

    throw new Error(
      'Não foi possível conectar ao servidor. Verifique sua conexão com a internet ou tente novamente mais tarde.'
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.ok) {
    const data: WordLookupResponseDto = await response.json();
    return data;
  }

  if (response.status === 400) {
    throw new Error(
      `Termo inválido ou muito longo (máximo de ${MAX_SEARCH_LENGTH} caracteres).`
    );
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const waitHint = retryAfter ? ` Aguarde ${retryAfter}s e tente novamente.` : ' Aguarde alguns instantes e tente novamente.';
    throw new Error(`Limite de buscas atingido.${waitHint}`);
  }

  if (response.status === 404) {
    throw new Error(`A palavra "${cleanTerm}" não foi encontrada no vocabulário.`);
  }

  if (response.status === 502 || response.status === 503) {
    throw new Error(
      'O serviço de inteligência artificial está temporariamente indisponível ou com falha de comunicação. Tente novamente em instantes.'
    );
  }

  throw new Error(`Erro no servidor (status ${response.status}). Tente novamente mais tarde.`);
}
