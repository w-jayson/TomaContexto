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
}

export const WordCard: React.FC<WordCardProps> = ({ word }) => {
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

  // Adjust font size dynamically for long terms like "consciousness"
  const termLength = word.term.length;
  const termFontSize = useMemo(() => {
    if (isWide) {
      if (termLength >= 15) return 24;
      if (termLength >= 11) return 27;
      return 31;
    } else {
      if (termLength >= 15) return 21;
      if (termLength >= 11) return 23;
      return 26;
    }
  }, [isWide, termLength]);

  return (
    <View style={styles.card}>
      {/* Top Header: Term + Phonetic + Pronunciation Audio */}
      <View style={styles.topRow}>
        <View style={styles.termInfo}>
          <Text
            style={[styles.term, { fontSize: termFontSize }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {word.term}
          </Text>

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
                  size={isWide ? 19 : 18}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!word.phonetic && (
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
        )}
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
      borderRadius: isWide ? 20 : 18,
      padding: isWide ? 24 : 18,
      marginHorizontal: isDesktop ? 0 : isWide ? 32 : 20,
      marginVertical: isWide ? 12 : 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 2,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: isWide ? 16 : 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    },
    termInfo: {
      flex: 1,
    },
    term: {
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.5,
      ...(Platform.OS === 'web'
        ? ({
            wordBreak: 'keep-all',
            overflowWrap: 'normal',
            whiteSpace: 'nowrap',
          } as any)
        : {}),
    },
    phoneticRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: isWide ? 8 : 4,
    },
    phonetic: {
      fontSize: isWide ? 16 : 14,
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
    translationsContainer: {
      paddingTop: isWide ? 16 : 12,
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
      paddingHorizontal: isWide ? 13 : 11,
      paddingVertical: isWide ? 6 : 5,
      borderRadius: 8,
    },
    translationText: {
      fontSize: isWide ? 14 : 13,
      color: colors.textPrimary,
      fontWeight: '500',
    },
  });
