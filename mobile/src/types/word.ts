export interface SentencePairDto {
  en: string;
  pt: string;
}

export interface TranslationGroupDto {
  partOfSpeech: string;
  translations: string[];
}

export interface WordLookupResponseDto {
  term: string;
  phonetic?: string | null;
  translationsByPos: TranslationGroupDto[];
  exampleSentences: SentencePairDto[];
}

export interface SavedWord {
  term: string;
  phonetic?: string | null;
  mainTranslation: string;
  savedAt: string;
}
