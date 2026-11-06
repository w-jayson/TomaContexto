import React, { useState, useMemo, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SentencePairDto } from '../types/word';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useResponsive } from '../utils/useResponsive';
import { playSmartAudio } from '../utils/audioPlayer';

interface SentenceCardProps {
  sentence: SentencePairDto;
  index: number;
  keyword: string;
}

// Safely escape regex metacharacters to eliminate ReDoS and syntax errors
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SentenceCardComponent: React.FC<SentenceCardProps> = ({ sentence, index, keyword }) => {
  const { colors } = useTheme();
  const { isWide, isDesktop } = useResponsive();
  const styles = useMemo(() => createStyles(colors, isWide, isDesktop), [colors, isWide, isDesktop]);
  const [isPlaying, setIsPlaying] = useState(false);

  const speakSentence = async () => {
    await playSmartAudio({
      text: sentence.en,
      type: 'sentence',
      rate: 0.88,
      onStart: () => setIsPlaying(true),
      onDone: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  };

  // Compile and hoist Regex safely based only on trimmed keyword
  const keywordRegex = useMemo(() => {
    const trimmed = keyword.trim();
    if (!trimmed) return null;
    return new RegExp(`(${escapeRegex(trimmed)})`, 'gi');
  }, [keyword]);

  // Highlights the searched keyword in the English sentence
  const renderedText = useMemo(() => {
    if (!keywordRegex) {
      return <Text style={styles.sentenceEn}>{sentence.en}</Text>;
    }

    const trimmedKeyword = keyword.trim().toLowerCase();
    const parts = sentence.en.split(keywordRegex);

    return (
      <Text style={styles.sentenceEn}>
        {parts.map((part, i) => {
          const isMatch = part.toLowerCase() === trimmedKeyword;
          return isMatch ? (
            <Text key={i} style={styles.highlightText}>
              {part}
            </Text>
          ) : (
            <Text key={i}>{part}</Text>
          );
        })}
      </Text>
    );
  }, [sentence.en, keywordRegex, keyword, styles]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.indexTag}>
          <Text style={styles.indexNumber}>#{index + 1}</Text>
          <Text style={styles.contextLabel}>Contexto i+1</Text>
        </View>

        <TouchableOpacity
          style={[styles.speakerButton, isPlaying ? styles.speakerButtonPlaying : null]}
          onPress={speakSentence}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Ouvir sentença em inglês"
          accessibilityState={{ busy: isPlaying }}
        >
          <Ionicons
            name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
            size={isWide ? 20 : 18}
            color={isPlaying ? colors.primaryDark : colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* English Sentence with Highlighted Keyword */}
      <View style={styles.sentenceBox}>
        {renderedText}
      </View>

      {/* Portuguese Contextual Translation */}
      <View style={styles.translationBox}>
        <Text style={styles.sentencePt}>{sentence.pt}</Text>
      </View>
    </View>
  );
};

export const SentenceCard = memo(SentenceCardComponent);

const createStyles = (colors: ThemeColors, isWide: boolean, isDesktop: boolean) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: isWide ? 18 : 16,
      padding: isWide ? 22 : 16,
      marginHorizontal: isDesktop ? 0 : isWide ? 32 : 20,
      marginBottom: isWide ? 16 : 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.02,
      shadowRadius: 6,
      elevation: 1,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: isWide ? 14 : 10,
    },
    indexTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    indexNumber: {
      color: colors.textMuted,
      fontSize: isWide ? 13 : 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    contextLabel: {
      color: colors.primary,
      fontSize: isWide ? 12 : 11,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    speakerButton: {
      width: isWide ? 36 : 32,
      height: isWide ? 36 : 32,
      borderRadius: 8,
      backgroundColor: colors.surfaceBorder,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
    },
    speakerButtonPlaying: {
      backgroundColor: colors.primaryBorder,
    },
    sentenceBox: {
      marginBottom: isWide ? 14 : 10,
    },
    sentenceEn: {
      fontSize: isWide ? 18 : 16,
      color: colors.textPrimary,
      lineHeight: isWide ? 28 : 24,
      fontWeight: '500',
      letterSpacing: -0.2,
    },
    highlightText: {
      color: colors.targetToken,
      fontWeight: '800',
      backgroundColor: colors.targetTokenSubtle,
      borderRadius: 4,
      paddingHorizontal: 4,
    },
    translationBox: {
      borderTopWidth: 1,
      borderTopColor: colors.surfaceBorder,
      paddingTop: isWide ? 12 : 10,
    },
    sentencePt: {
      fontSize: isWide ? 15 : 14,
      color: colors.textSecondary,
      lineHeight: isWide ? 22 : 20,
    },
  });
