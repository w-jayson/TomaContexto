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
  synonyms?: string[];
}

export interface SavedWord {
  term: string;
  phonetic?: string | null;
  mainTranslation: string;
  savedAt: string;
}
