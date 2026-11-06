import React, { useMemo, useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useResponsive } from '../utils/useResponsive';
import { MAX_SEARCH_LENGTH, fetchWordSuggestions, WordSuggestion } from '../api/wordsApi';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (term?: string) => void;
  isLoading: boolean;
  recentSearches?: string[];
  onSelectRecent?: (term: string) => void;
  maxLength?: number;
}

const SearchBarComponent: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onSubmit,
  isLoading,
  recentSearches = [],
  onSelectRecent,
  maxLength = MAX_SEARCH_LENGTH,
}) => {
  const { colors } = useTheme();
  const { isWide, isDesktop } = useResponsive();
  const styles = useMemo(() => createStyles(colors, isWide, isDesktop), [colors, isWide, isDesktop]);
  const isNearLimit = value.length >= Math.floor(maxLength * 0.75);
  const isAtLimit = value.length >= maxLength;

  const [suggestions, setSuggestions] = useState<WordSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimerRef = useRef<any>(null);
  const requestSeqRef = useRef(0);

  // Close suggestions whenever a search starts loading
  useEffect(() => {
    if (isLoading) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      requestSeqRef.current += 1;
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [isLoading]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      const sliced = text.slice(0, maxLength);
      onChangeText(sliced);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const trimmed = sliced.trim();
      if (trimmed.length < 2) {
        requestSeqRef.current += 1;
        setShowSuggestions(false);
        setSuggestions([]);
        return;
      }

      const currentSeq = ++requestSeqRef.current;
      debounceTimerRef.current = setTimeout(async () => {
        const results = await fetchWordSuggestions(trimmed, recentSearches);
        if (currentSeq !== requestSeqRef.current) {
          return;
        }
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      }, 200);
    },
    [maxLength, onChangeText, recentSearches]
  );

  const handleSelectSuggestion = (word: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    requestSeqRef.current += 1;
    setShowSuggestions(false);
    setSuggestions([]);
    onChangeText(word);
    onSubmit(word);
  };

  const handleManualSubmit = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    requestSeqRef.current += 1;
    setShowSuggestions(false);
    setSuggestions([]);
    onSubmit();
  };

  return (
    <View style={styles.outerWrapper}>
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <Ionicons
            name="search"
            size={isWide ? 22 : 20}
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={
              isWide
                ? 'Digite uma palavra, phrasal verb ou expressão em inglês para minerar...'
                : 'Digite uma palavra ou expressão...'
            }
            placeholderTextColor={colors.textMuted}
            value={value}
            onChangeText={handleChangeText}
            onSubmitEditing={handleManualSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={maxLength}
          />

          {isNearLimit ? (
            <Text style={[styles.charCounter, isAtLimit ? styles.charCounterLimit : null]}>
              {value.length}/{maxLength}
            </Text>
          ) : null}

          {value.length > 0 ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                setShowSuggestions(false);
                setSuggestions([]);
                onChangeText('');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={isWide ? 20 : 18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}

          {isWide && !isLoading ? (
            <View style={styles.shortcutHint}>
              <Text style={styles.shortcutText}>Enter ↵</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.submitButton, !value.trim() ? styles.submitButtonDisabled : null]}
            onPress={handleManualSubmit}
            disabled={isLoading || !value.trim()}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-forward" size={isWide ? 20 : 18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Autocomplete & Spell-Correction Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 ? (
          <View style={styles.suggestionsDropdown}>
            {suggestions.map((item, idx) => (
              <TouchableOpacity
                key={item.word}
                style={[
                  styles.suggestionItem,
                  idx < suggestions.length - 1 ? styles.suggestionItemBorder : null,
                ]}
                onPress={() => handleSelectSuggestion(item.word)}
                activeOpacity={0.7}
              >
                <View style={styles.suggestionLeft}>
                  <Ionicons
                    name={item.isCorrection ? 'sparkles-outline' : 'search-outline'}
                    size={16}
                    color={item.isCorrection ? colors.primary : colors.textSecondary}
                  />
                  <Text style={styles.suggestionWord}>{item.word}</Text>
                </View>

                {item.isCorrection ? (
                  <View style={styles.correctionBadge}>
                    <Text style={styles.correctionBadgeText}>Você quis dizer?</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Desktop Quick Chips for Recent Searches */}
        {isWide && recentSearches.length > 0 && onSelectRecent ? (
          <View style={styles.recentRow}>
            <Text style={styles.recentLabel}>Consultas recentes:</Text>
            <View style={styles.chipsContainer}>
              {recentSearches.slice(0, 6).map((term) => (
                <TouchableOpacity
                  key={term}
                  style={styles.chip}
                  onPress={() => {
                    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                    requestSeqRef.current += 1;
                    setShowSuggestions(false);
                    setSuggestions([]);
                    onSelectRecent(term);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

export const SearchBar = memo(SearchBarComponent);

const createStyles = (colors: ThemeColors, isWide: boolean, isDesktop: boolean) =>
  StyleSheet.create({
    outerWrapper: {
      width: '100%',
      alignItems: 'center',
    },
    container: {
      width: '100%',
      maxWidth: isDesktop ? 1180 : 760,
      paddingHorizontal: isWide ? 32 : 20,
      paddingTop: isWide ? 20 : 16,
      paddingBottom: isWide ? 12 : 12,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.surfaceBorder,
      borderRadius: isWide ? 16 : 14,
      paddingLeft: isWide ? 18 : 14,
      paddingRight: isWide ? 8 : 6,
      height: isWide ? 60 : 52,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    searchIcon: {
      marginRight: isWide ? 12 : 10,
    },
    input: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: isWide ? 16 : 15,
      height: '100%',
      outlineStyle: 'none',
    } as any,
    clearButton: {
      padding: 6,
      marginRight: 4,
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
    },
    charCounter: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      marginRight: 6,
    },
    charCounterLimit: {
      color: colors.error,
    },
    shortcutHint: {
      backgroundColor: colors.primarySubtle,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginRight: 8,
    },
    shortcutText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    submitButton: {
      width: isWide ? 44 : 40,
      height: isWide ? 44 : 40,
      borderRadius: isWide ? 12 : 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
    },
    submitButtonDisabled: {
      opacity: 0.45,
    },
    suggestionsDropdown: {
      marginTop: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 14,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 4,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: isWide ? 18 : 14,
      paddingVertical: isWide ? 12 : 10,
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
    },
    suggestionItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    },
    suggestionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    suggestionWord: {
      fontSize: isWide ? 15 : 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    correctionBadge: {
      backgroundColor: colors.primarySubtle,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    correctionBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
    },
    recentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      flexWrap: 'wrap',
      gap: 8,
    },
    recentLabel: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '600',
    },
    chipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    chip: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
    },
    chipText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
  });
