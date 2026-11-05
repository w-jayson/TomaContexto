import React, { useMemo } from 'react';
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

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (term?: string) => void;
  isLoading: boolean;
  recentSearches?: string[];
  onSelectRecent?: (term: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onSubmit,
  isLoading,
  recentSearches = [],
  onSelectRecent,
}) => {
  const { colors } = useTheme();
  const { isWide, isDesktop } = useResponsive();
  const styles = useMemo(() => createStyles(colors, isWide, isDesktop), [colors, isWide, isDesktop]);

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
            onChangeText={onChangeText}
            onSubmitEditing={() => onSubmit()}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {value.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => onChangeText('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={isWide ? 20 : 18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          {isWide && !isLoading && (
            <View style={styles.shortcutHint}>
              <Text style={styles.shortcutText}>Enter ↵</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, !value.trim() && styles.submitButtonDisabled]}
            onPress={() => onSubmit()}
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

        {/* Desktop Quick Chips for Recent Searches */}
        {isWide && recentSearches.length > 0 && onSelectRecent && (
          <View style={styles.recentRow}>
            <Text style={styles.recentLabel}>Consultas recentes:</Text>
            <View style={styles.chipsContainer}>
              {recentSearches.slice(0, 6).map((term) => (
                <TouchableOpacity
                  key={term}
                  style={styles.chip}
                  onPress={() => onSelectRecent(term)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

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
