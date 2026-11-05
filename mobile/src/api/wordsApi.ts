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

export async function lookupWord(term: string): Promise<WordLookupResponseDto> {
  const cleanTerm = term.trim().toLowerCase();
  const baseUrl = await getApiBaseUrl();

  try {
    const controller = new AbortController();
    // 45s timeout to comfortably accommodate free-tier cloud cold starts and LLM generation
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(`${baseUrl}/api/Words/${encodeURIComponent(cleanTerm)}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data: WordLookupResponseDto = await response.json();
      return data;
    }

    if (response.status === 404) {
      throw new Error(`A palavra "${cleanTerm}" não foi encontrada no vocabulário.`);
    }

    throw new Error(`Erro no servidor (status ${response.status})`);
  } catch (err: any) {
    // If backend is not running or network request failed, check if mock word exists
    if (MOCK_WORDS[cleanTerm]) {
      return MOCK_WORDS[cleanTerm];
    }

    if (err.name === 'AbortError') {
      throw new Error(`O servidor na nuvem demorou para responder (comum ao acordar da hibernação). Por favor, tente novamente agora!`);
    }

    if (err.message && err.message.includes('não foi encontrada')) {
      throw err;
    }

    throw new Error(
      `Não foi possível conectar ao servidor. Verifique sua conexão com a internet ou tente novamente mais tarde.`
    );
  }
}
