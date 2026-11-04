import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Keyboard,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { colors } from './src/theme/colors';
import { WordLookupResponseDto, SavedWord } from './src/types/word';
import { lookupWord } from './src/api/wordsApi';
import {
  getSavedWords,
  toggleSaveWord,
  isWordSaved,
  removeSavedWord,
  getRecentSearches,
  addRecentSearch,
} from './src/utils/storage';

import { Header } from './src/components/Header';
import { SearchBar } from './src/components/SearchBar';
import { WordCard } from './src/components/WordCard';
import { SentenceCard } from './src/components/SentenceCard';
import { EmptyState } from './src/components/EmptyState';
import { SavedWordsModal } from './src/components/SavedWordsModal';
import { ConfigModal } from './src/components/ConfigModal';

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [wordData, setWordData] = useState<WordLookupResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCurrentWordSaved, setIsCurrentWordSaved] = useState(false);

  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load initial saved words and recent searches on startup
  const loadStoredData = useCallback(async () => {
    const [saved, recent] = await Promise.all([getSavedWords(), getRecentSearches()]);
    setSavedWords(saved);
    setRecentSearches(recent);
  }, []);

  useEffect(() => {
    loadStoredData();
  }, [loadStoredData]);

  // Check if current word is saved whenever wordData changes
  useEffect(() => {
    if (wordData) {
      isWordSaved(wordData.term).then(setIsCurrentWordSaved);
    }
  }, [wordData]);

  const handleSearch = async (termToSearch?: string) => {
    const target = (termToSearch || searchTerm).trim();
    if (!target) return;

    Keyboard.dismiss();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await lookupWord(target);
      setWordData(data);
      const updatedRecent = await addRecentSearch(target);
      setRecentSearches(updatedRecent);
    } catch (err: any) {
      setWordData(null);
      setErrorMessage(err.message || 'Ocorreu um erro ao buscar a palavra.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (wordData) {
      setRefreshing(true);
      await handleSearch(wordData.term);
      setRefreshing(false);
    }
  };

  const handleToggleSave = async () => {
    if (!wordData) return;
    const isNowSaved = await toggleSaveWord(wordData);
    setIsCurrentWordSaved(isNowSaved);
    const updatedList = await getSavedWords();
    setSavedWords(updatedList);
  };

  const handleRemoveSavedWord = async (term: string) => {
    const updated = await removeSavedWord(term);
    setSavedWords(updated);
    if (wordData && wordData.term.toLowerCase() === term.toLowerCase()) {
      setIsCurrentWordSaved(false);
    }
  };

  const handleSelectFromModalOrHistory = (term: string) => {
    setSearchTerm(term);
    handleSearch(term);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <View style={styles.appContainer}>
        {/* Main App Bar */}
        <Header
          savedCount={savedWords.length}
          onOpenSaved={() => setIsSavedModalOpen(true)}
          onOpenSettings={() => setIsConfigModalOpen(true)}
        />

        {/* Persistent Search Bar */}
        <SearchBar
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmit={handleSearch}
          isLoading={isLoading}
        />

        {/* Main Content Area */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            wordData ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        >
          {/* Loading Spinner */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Minerando sentenças no contexto i+1...</Text>
            </View>
          )}

          {/* Error Alert Box */}
          {errorMessage && !isLoading && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
              <View style={styles.errorTextContainer}>
                <Text style={styles.errorTitle}>Atenção</Text>
                <Text style={styles.errorDesc}>{errorMessage}</Text>
              </View>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => handleSearch()}
                activeOpacity={0.7}
              >
                <Text style={styles.retryText}>Tentar Novamente</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Word Display and Sentences */}
          {!isLoading && wordData && (
            <View>
              {/* Word Header Card */}
              <WordCard
                word={wordData}
                isSaved={isCurrentWordSaved}
                onToggleSave={handleToggleSave}
              />

              {/* Sentence Mining Section */}
              <View style={styles.sentencesHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="documents-outline" size={18} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Sentenças de Contexto (i+1)</Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  {wordData.exampleSentences.length} exemplos com traduções contextualizadas
                </Text>
              </View>

              {wordData.exampleSentences.map((sentence, index) => (
                <SentenceCard
                  key={`${sentence.en}-${index}`}
                  sentence={sentence}
                  index={index}
                  keyword={wordData.term}
                />
              ))}
            </View>
          )}

          {/* Initial Empty State when no search conducted */}
          {!isLoading && !wordData && !errorMessage && (
            <EmptyState />
          )}
        </ScrollView>
      </View>

      {/* Modals */}
      <SavedWordsModal
        visible={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        savedWords={savedWords}
        onSelectWord={handleSelectFromModalOrHistory}
        onRemoveWord={handleRemoveSavedWord}
      />

      <ConfigModal
        visible={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A100E',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  appContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 580,
    backgroundColor: colors.background,
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: colors.surfaceBorder,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: colors.errorSubtle,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  errorTextContainer: {
    alignItems: 'center',
  },
  errorTitle: {
    color: colors.error,
    fontWeight: '700',
    fontSize: 15,
  },
  errorDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  sentencesHeader: {
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
