import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { WordLookupResponseDto } from '../types/word';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useResponsive } from '../utils/useResponsive';

interface WordCardProps {
  word: WordLookupResponseDto;
  isSaved: boolean;
  onToggleSave: () => void;
}

export const WordCard: React.FC<WordCardProps> = ({ word, isSaved, onToggleSave }) => {
  const { colors } = useTheme();
  const { isWide, isDesktop } = useResponsive();
  const styles = useMemo(() => createStyles(colors, isWide, isDesktop), [colors, isWide, isDesktop]);
  const [isPlaying, setIsPlaying] = useState(false);

  const speakTerm = async () => {
    try {
      setIsPlaying(true);
      await Speech.stop();
      Speech.speak(word.term, {
        language: 'en-US',
        rate: 0.9,
        onDone: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      });
    } catch {
      setIsPlaying(false);
    }
  };

  const getPosColor = (pos: string) => {
    const lower = pos.toLowerCase();
    if (lower.includes('noun') || lower.includes('substantivo')) return colors.posNoun;
    if (lower.includes('verb') || lower.includes('verbo')) return colors.posVerb;
    if (lower.includes('adj')) return colors.posAdjective;
    if (lower.includes('adv')) return colors.posAdverb;
    if (lower.includes('idiom') || lower.includes('expressão') || lower.includes('phrase'))
      return colors.posIdiom;
    return colors.posDefault;
  };

  return (
    <View style={styles.card}>
      {/* Top Header: Term + Speech + Save */}
      <View style={styles.topRow}>
        <View style={styles.termInfo}>
          <Text style={styles.term}>{word.term}</Text>
          {word.phonetic && (
            <View style={styles.phoneticRow}>
              <Text style={styles.phonetic}>{word.phonetic}</Text>
              <TouchableOpacity
                style={styles.speakerButton}
                onPress={speakTerm}
                activeOpacity={0.7}
                accessibilityLabel="Ouvir pronúncia"
              >
                <Ionicons
                  name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
                  size={isWide ? 20 : 18}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            isSaved && styles.saveButtonActive,
            isWide && styles.saveButtonWide,
          ]}
          onPress={onToggleSave}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={isWide ? 19 : 20}
            color={isSaved ? '#FFFFFF' : colors.textPrimary}
          />
          {isWide && (
            <Text style={[styles.saveButtonText, isSaved && styles.saveButtonTextActive]}>
              {isSaved ? 'Salva no Deck' : 'Salvar Palavra'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Translations grouped by Part of Speech */}
      <View style={styles.translationsContainer}>
        {word.translationsByPos.map((group, gIndex) => {
          const badgeColor = getPosColor(group.partOfSpeech);
          return (
            <View key={`${group.partOfSpeech}-${gIndex}`} style={styles.posBlock}>
              <View
                style={[
                  styles.posBadge,
                  { borderColor: badgeColor, backgroundColor: `${badgeColor}18` },
                ]}
              >
                <Text style={[styles.posBadgeText, { color: badgeColor }]}>
                  {group.partOfSpeech}
                </Text>
              </View>

              <View style={styles.translationsList}>
                {group.translations.map((trans, tIndex) => (
                  <View key={`${trans}-${tIndex}`} style={styles.translationPill}>
                    <Text style={styles.translationText}>{trans}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors, isWide: boolean, isDesktop: boolean) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: isWide ? 22 : 20,
      padding: isWide ? 26 : 20,
      marginHorizontal: isDesktop ? 0 : isWide ? 32 : 20,
      marginVertical: isWide ? 14 : 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 2,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingBottom: isWide ? 20 : 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    },
    termInfo: {
      flex: 1,
      marginRight: 12,
    },
    term: {
      fontSize: isWide ? 38 : 28,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.6,
      lineHeight: isWide ? 44 : 34,
    },
    phoneticRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: isWide ? 8 : 4,
    },
    phonetic: {
      fontSize: isWide ? 17 : 15,
      color: colors.textSecondary,
      fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    },
    speakerButton: {
      width: isWide ? 34 : 30,
      height: isWide ? 34 : 30,
      borderRadius: 8,
      backgroundColor: colors.primarySubtle,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
    },
    saveButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
    },
    saveButtonWide: {
      width: 'auto',
      paddingHorizontal: 16,
      flexDirection: 'row',
      gap: 8,
    },
    saveButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    saveButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    saveButtonTextActive: {
      color: '#FFFFFF',
    },
    translationsContainer: {
      paddingTop: isWide ? 18 : 14,
      gap: isWide ? 14 : 12,
    },
    posBlock: {
      gap: 8,
    },
    posBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    posBadgeText: {
      fontSize: isWide ? 12 : 11,
      fontWeight: '700',
      textTransform: 'lowercase',
    },
    translationsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    translationPill: {
      backgroundColor: colors.surfaceHover,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      paddingHorizontal: isWide ? 14 : 12,
      paddingVertical: isWide ? 7 : 6,
      borderRadius: 8,
    },
    translationText: {
      fontSize: isWide ? 15 : 14,
      color: colors.textPrimary,
      fontWeight: '500',
    },
  });
