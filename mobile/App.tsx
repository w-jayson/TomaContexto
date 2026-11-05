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
import { useResponsive } from './src/utils/useResponsive';

import { Header } from './src/components/Header';
import { SearchBar } from './src/components/SearchBar';
import { WordCard } from './src/components/WordCard';
import { SentenceCard } from './src/components/SentenceCard';
import { EmptyState } from './src/components/EmptyState';
import { SavedWordsModal } from './src/components/SavedWordsModal';

function MainApp() {
  const { colors, isDark } = useTheme();
  const { isWide, isDesktop, isMobile } = useResponsive();
  const styles = useMemo(
    () => createStyles(colors, isDark, isWide, isDesktop),
    [colors, isDark, isWide, isDesktop]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [wordData, setWordData] = useState<WordLookupResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Minerando sentenças no contexto i+1...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCurrentWordSaved, setIsCurrentWordSaved] = useState(false);

  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={styles.appContainer}>
        {/* Main App Bar */}
        <Header
          savedCount={savedWords.length}
          onOpenSaved={() => setIsSavedModalOpen(true)}
        />

        {/* Persistent Search Bar */}
        <SearchBar
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmit={handleSearch}
          isLoading={isLoading}
          recentSearches={recentSearches}
          onSelectRecent={handleSelectFromModalOrHistory}
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
              <ActivityIndicator size={isWide ? 'large' : 'large'} color={colors.primary} />
              <Text style={styles.loadingText}>{loadingMessage}</Text>
            </View>
          )}

          {/* Error Alert Box */}
          {errorMessage && !isLoading && (
            <View style={styles.errorBoxWrapper}>
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={26} color={colors.error} />
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
            </View>
          )}

          {/* Word Display and Sentences */}
          {!isLoading && wordData && (
            <View style={styles.contentWrapper}>
              {isDesktop ? (
                /* Desktop Two-Column Layout */
                <View style={styles.desktopLayout}>
                  {/* Left Column: Word Anchor & Quick Deck */}
                  <View style={styles.desktopSidebar}>
                    <WordCard
                      word={wordData}
                      isSaved={isCurrentWordSaved}
                      onToggleSave={handleToggleSave}
                    />

                    {/* Quick Deck Widget on Desktop */}
                    {savedWords.length > 0 && (
                      <View style={styles.deckSidebarCard}>
                        <View style={styles.deckSidebarHeader}>
                          <View style={styles.deckSidebarTitleRow}>
                            <Ionicons name="bookmark" size={16} color={colors.targetToken} />
                            <Text style={styles.deckSidebarTitle}>Deck Salvo</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => setIsSavedModalOpen(true)}
                            activeOpacity={0.7}
                            style={styles.deckViewAllBtn}
                          >
                            <Text style={styles.deckViewAllText}>Ver todas ({savedWords.length})</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.deckItemsList}>
                          {savedWords.slice(0, 5).map((item) => (
                            <TouchableOpacity
                              key={item.term}
                              style={styles.deckItem}
                              onPress={() => handleSelectFromModalOrHistory(item.term)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.deckItemTerm}>{item.term}</Text>
                              <Text style={styles.deckItemTrans} numberOfLines={1}>
                                {item.mainTranslation}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
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
                  </View>
                </View>
              ) : (
                /* Mobile / Tablet Stacked Layout */
                <View style={styles.stackedLayout}>
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
            </View>
          )}

          {/* Initial Empty State when no search conducted */}
          {!isLoading && !wordData && !errorMessage && <EmptyState />}
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
    desktopLayout: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 28,
      paddingTop: 8,
    },
    desktopSidebar: {
      width: 390,
      gap: 16,
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
      marginTop: isWide ? 14 : 18,
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
    boldKeyword: {
      fontWeight: '700',
      color: colors.textPrimary,
    },
    deckSidebarCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 18,
      padding: 18,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.02,
      shadowRadius: 6,
      elevation: 1,
    },
    deckSidebarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    },
    deckSidebarTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    deckSidebarTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    deckViewAllBtn: {
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
    },
    deckViewAllText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    deckItemsList: {
      gap: 8,
    },
    deckItem: {
      backgroundColor: colors.surfaceHover,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
    },
    deckItemTerm: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    deckItemTrans: {
      fontSize: 12,
      color: colors.textSecondary,
      flex: 1,
      textAlign: 'right',
    },
  });
