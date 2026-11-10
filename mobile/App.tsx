import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ThemeColors } from './src/theme/colors';
import { WordLookupResponseDto } from './src/types/word';
import { lookupWord, fetchDidYouMean, fetchMoreSentences } from './src/api/wordsApi';
import { getRecentSearches, addRecentSearch } from './src/utils/storage';
import { useResponsive } from './src/utils/useResponsive';

import { Header } from './src/components/Header';
import { SearchBar } from './src/components/SearchBar';
import { WordCard } from './src/components/WordCard';
import { SentenceCard } from './src/components/SentenceCard';
import { EmptyState } from './src/components/EmptyState';
import { stopAudio } from './src/utils/audioPlayer';

function MainApp() {
  const { colors, isDark } = useTheme();
  const { isWide, isDesktop } = useResponsive();
  const styles = useMemo(
    () => createStyles(colors, isDark, isWide, isDesktop),
    [colors, isDark, isWide, isDesktop]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [didYouMeanTerm, setDidYouMeanTerm] = useState<string | null>(null);
  const [wordData, setWordData] = useState<WordLookupResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Minerando sentenças no contexto i+1...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [moreSentencesError, setMoreSentencesError] = useState<string | null>(null);

  useEffect(() => {
    let timer: any;
    if (isLoading) {
      setLoadingMessage('Minerando sentenças no contexto i+1...');
      timer = setTimeout(() => {
        setLoadingMessage('O servidor gratuito está acordando da hibernação... quase pronto!');
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Load initial recent searches on startup
  const loadStoredData = useCallback(async () => {
    const recent = await getRecentSearches();
    setRecentSearches(recent);
  }, []);

  useEffect(() => {
    loadStoredData();
  }, [loadStoredData]);

  const handleSearch = useCallback(
    async (termToSearch?: string) => {
      const target = (termToSearch || searchTerm).trim();
      if (!target) return;

      stopAudio();
      Keyboard.dismiss();
      setIsLoading(true);
      setErrorMessage(null);
      setDidYouMeanTerm(null);
      setMoreSentencesError(null);
      setIsLoadingMore(false);

      try {
        const data = await lookupWord(target);
        setWordData(data);

        // Defer local storage update without blocking UI display (async-defer-await)
        addRecentSearch(data.term)
          .then((updatedRecent) => setRecentSearches(updatedRecent))
          .catch(() => {});
      } catch (err: any) {
        setWordData(null);
        setErrorMessage(err.message || 'Ocorreu um erro ao buscar a palavra.');
        fetchDidYouMean(target)
          .then((suggestion) => {
            if (suggestion && suggestion.toLowerCase() !== target.toLowerCase()) {
              setDidYouMeanTerm(suggestion);
            }
          })
          .catch(() => {});
      } finally {
        setIsLoading(false);
      }
    },
    [searchTerm]
  );

  const handleRefresh = useCallback(async () => {
    if (wordData) {
      setRefreshing(true);
      await handleSearch(wordData.term);
      setRefreshing(false);
    }
  }, [handleSearch, wordData]);

  const handleSelectRecent = useCallback(
    (term: string) => {
      setSearchTerm(term);
      handleSearch(term);
    },
    [handleSearch]
  );

  const handleSelectSynonym = useCallback(
    (synonym: string) => {
      setSearchTerm(synonym);
      handleSearch(synonym);
    },
    [handleSearch]
  );

  const handleLoadMoreSentences = useCallback(async () => {
    if (!wordData || isLoadingMore) return;

    setIsLoadingMore(true);
    setMoreSentencesError(null);

    try {
      const existingEnList = wordData.exampleSentences.map((s) => s.en);
      const newSentences = await fetchMoreSentences(wordData.term, existingEnList);

      if (newSentences && newSentences.length > 0) {
        setWordData((prev) => {
          if (!prev) return prev;
          const existingSet = new Set(prev.exampleSentences.map((s) => s.en.toLowerCase().trim()));
          const uniqueNew = newSentences.filter(
            (s) => !existingSet.has(s.en.toLowerCase().trim())
          );
          if (uniqueNew.length === 0) return prev;
          return {
            ...prev,
            exampleSentences: [...prev.exampleSentences, ...uniqueNew],
          };
        });
      }
    } catch (err: any) {
      setMoreSentencesError(err.message || 'Não foi possível carregar novas frases.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [wordData, isLoadingMore]);

  const renderLoadMoreSection = () => (
    <View style={styles.loadMoreSection}>
      {moreSentencesError ? (
        <View style={styles.loadMoreErrorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
          <Text style={styles.loadMoreErrorText}>{moreSentencesError}</Text>
          <TouchableOpacity
            style={styles.loadMoreRetryBtn}
            onPress={handleLoadMoreSentences}
            activeOpacity={0.7}
          >
            <Text style={styles.loadMoreRetryText}>Tentar de novo</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        style={[
          styles.loadMoreButton,
          isLoadingMore && styles.loadMoreButtonDisabled,
        ]}
        onPress={handleLoadMoreSentences}
        disabled={isLoadingMore}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Buscar mais frases de exemplo"
        accessibilityState={{ busy: isLoadingMore }}
      >
        {isLoadingMore ? (
          <View style={styles.loadMoreButtonInner}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadMoreButtonTextLoading}>Minerando mais 4 frases no contexto i+1...</Text>
          </View>
        ) : (
          <View style={styles.loadMoreButtonInner}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
            <Text style={styles.loadMoreButtonText}>Buscar mais frases</Text>
            <View style={styles.loadMoreBadge}>
              <Text style={styles.loadMoreBadgeText}>+4</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.loadMoreContextHint}>
        Explorando contextos variados: dia a dia, trabalho, viagens e acadêmico.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={styles.appContainer}>
        {/* Main App Bar */}
        <Header />

        {/* Persistent Search Bar */}
        <SearchBar
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmit={handleSearch}
          isLoading={isLoading}
          recentSearches={recentSearches}
          onSelectRecent={handleSelectRecent}
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
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>{loadingMessage}</Text>
            </View>
          ) : null}

          {/* Error Alert Box */}
          {!isLoading && errorMessage ? (
            <View style={styles.errorBoxWrapper}>
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={26} color={colors.error} />
                <View style={styles.errorTextContainer}>
                  <Text style={styles.errorTitle}>Atenção</Text>
                  <Text style={styles.errorDesc}>{errorMessage}</Text>
                </View>

                {didYouMeanTerm ? (
                  <TouchableOpacity
                    style={styles.didYouMeanButton}
                    onPress={() => {
                      setSearchTerm(didYouMeanTerm);
                      handleSearch(didYouMeanTerm);
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                    <Text style={styles.didYouMeanText}>
                      Você quis dizer: <Text style={styles.didYouMeanWord}>{didYouMeanTerm}</Text>?
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => handleSearch()}
                  activeOpacity={0.7}
                >
                  <Text style={styles.retryText}>Tentar Novamente</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Word Display and Sentences */}
          {!isLoading && wordData ? (
            <View style={styles.contentWrapper}>
              {isDesktop ? (
                /* Desktop Two-Column Layout */
                <View style={styles.desktopLayout}>
                  {/* Left Column: Word Anchor */}
                  <View style={styles.desktopSidebar}>
                    <WordCard word={wordData} onSelectSynonym={handleSelectSynonym} />
                  </View>

                  {/* Right Column: Sentence Context Mining Stream */}
                  <View style={styles.desktopMainStream}>
                    <View style={styles.sentencesHeader}>
                      <View style={styles.sectionTitleRow}>
                        <Ionicons name="documents-outline" size={20} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Sentenças de Contexto (i+1)</Text>
                      </View>
                      <Text style={styles.sectionSubtitle}>
                        {wordData.exampleSentences.length} exemplos com traduções contextualizadas para{' '}
                        <Text style={styles.boldKeyword}>{wordData.term}</Text>
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

                    {renderLoadMoreSection()}
                  </View>
                </View>
              ) : (
                /* Mobile / Tablet Stacked Layout */
                <View style={styles.stackedLayout}>
                  {/* Word Header Card */}
                  <WordCard word={wordData} onSelectSynonym={handleSelectSynonym} />

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

                  {renderLoadMoreSection()}
                </View>
              )}
            </View>
          ) : null}

          {/* Initial Empty State when no search conducted */}
          {!isLoading && !wordData && !errorMessage ? <EmptyState /> : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

const createStyles = (
  colors: ThemeColors,
  isDark: boolean,
  isWide: boolean,
  isDesktop: boolean
) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: Platform.OS === 'android' ? 30 : 0,
    },
    appContainer: {
      flex: 1,
      width: '100%',
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
      width: '100%',
    },
    scrollContent: {
      paddingBottom: isWide ? 60 : 40,
      alignItems: 'center',
    },
    contentWrapper: {
      width: '100%',
      maxWidth: isDesktop ? 1180 : 760,
      paddingHorizontal: isDesktop ? 32 : 0,
    },
    didYouMeanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
      backgroundColor: colors.primarySubtle,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
    },
    didYouMeanText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '500',
    },
    didYouMeanWord: {
      color: colors.primary,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    desktopLayout: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 28,
      paddingTop: 8,
    },
    desktopSidebar: {
      width: 360,
    },
    desktopMainStream: {
      flex: 1,
    },
    stackedLayout: {
      width: '100%',
    },
    loadingContainer: {
      paddingVertical: isWide ? 64 : 48,
      alignItems: 'center',
      gap: 14,
    },
    loadingText: {
      color: colors.textSecondary,
      fontSize: isWide ? 15 : 14,
      fontWeight: '500',
    },
    errorBoxWrapper: {
      width: '100%',
      maxWidth: 760,
      paddingHorizontal: isWide ? 32 : 20,
      alignSelf: 'center',
    },
    errorBox: {
      backgroundColor: colors.errorSubtle,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
      borderRadius: 16,
      padding: isWide ? 20 : 16,
      marginVertical: 14,
      alignItems: 'center',
      gap: 8,
    },
    errorTextContainer: {
      alignItems: 'center',
    },
    errorTitle: {
      color: colors.error,
      fontWeight: '700',
      fontSize: isWide ? 16 : 15,
    },
    errorDesc: {
      color: colors.textSecondary,
      fontSize: isWide ? 14 : 13,
      textAlign: 'center',
      marginTop: 4,
      lineHeight: isWide ? 20 : 18,
    },
    retryButton: {
      marginTop: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 10,
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
    },
    retryText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    sentencesHeader: {
      marginHorizontal: isDesktop ? 0 : isWide ? 32 : 20,
      marginTop: isWide ? 12 : 18,
      marginBottom: isWide ? 14 : 10,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      fontSize: isWide ? 19 : 17,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    sectionSubtitle: {
      fontSize: isWide ? 13 : 12,
      color: colors.textMuted,
      marginTop: 3,
    },
    loadMoreSection: {
      marginTop: 14,
      marginBottom: 32,
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: isDesktop ? 0 : isWide ? 32 : 20,
    },
    loadMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.primaryBorder,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 14,
      width: isDesktop || isWide ? 380 : '100%',
      ...(Platform.OS === 'web'
        ? ({
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          } as any)
        : {
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          }),
    },
    loadMoreButtonDisabled: {
      opacity: 0.75,
      borderColor: colors.surfaceBorder,
    },
    loadMoreButtonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    loadMoreButtonText: {
      color: colors.textPrimary,
      fontSize: isWide ? 15 : 14,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    loadMoreButtonTextLoading: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '500',
    },
    loadMoreBadge: {
      backgroundColor: colors.primarySubtle,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
    },
    loadMoreBadgeText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    loadMoreContextHint: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 8,
      maxWidth: 380,
      lineHeight: 16,
    },
    loadMoreErrorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.errorSubtle,
      borderWidth: 1,
      borderColor: colors.error,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 10,
      width: isDesktop || isWide ? 380 : '100%',
      gap: 8,
    },
    loadMoreErrorText: {
      flex: 1,
      color: colors.error,
      fontSize: 13,
    },
    loadMoreRetryBtn: {
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    loadMoreRetryText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 12,
      textDecorationLine: 'underline',
    },
    boldKeyword: {
      fontWeight: '700',
      color: colors.textPrimary,
    },
  });
