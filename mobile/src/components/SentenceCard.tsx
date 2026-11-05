import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { SentencePairDto } from '../types/word';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';

interface SentenceCardProps {
  sentence: SentencePairDto;
  index: number;
  keyword: string;
}

export const SentenceCard: React.FC<SentenceCardProps> = ({ sentence, index, keyword }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isPlaying, setIsPlaying] = useState(false);

  const speakSentence = async () => {
    try {
      setIsPlaying(true);
      await Speech.stop();
      Speech.speak(sentence.en, {
        language: 'en-US',
        rate: 0.88,
        onDone: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      });
    } catch {
      setIsPlaying(false);
    }
  };

  // Highlights the searched keyword in the English sentence
  const renderHighlightedText = () => {
    if (!keyword.trim()) {
      return <Text style={styles.sentenceEn}>{sentence.en}</Text>;
    }

    const regex = new RegExp(`(${keyword.trim()})`, 'gi');
    const parts = sentence.en.split(regex);

    return (
      <Text style={styles.sentenceEn}>
        {parts.map((part, i) => {
          const isMatch = part.toLowerCase() === keyword.trim().toLowerCase();
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
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Exemplo {index + 1} • i+1</Text>
        </View>

        <TouchableOpacity
          style={styles.speakerButton}
          onPress={speakSentence}
          activeOpacity={0.7}
          accessibilityLabel="Ouvir sentença em inglês"
        >
          <Ionicons
            name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
            size={18}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* English Sentence with Highlighted Keyword */}
      <View style={styles.sentenceBox}>
        {renderHighlightedText()}
      </View>

      {/* Portuguese Contextual Translation */}
      <View style={styles.translationBox}>
        <Text style={styles.sentencePt}>{sentence.pt}</Text>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 12,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    badge: {
      backgroundColor: colors.primarySubtle,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    badgeText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
    },
    speakerButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.surfaceBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sentenceBox: {
      marginBottom: 10,
    },
    sentenceEn: {
      fontSize: 16,
      color: colors.textPrimary,
      lineHeight: 24,
      fontWeight: '500',
    },
    highlightText: {
      color: colors.targetToken,
      fontWeight: '800',
      backgroundColor: colors.targetTokenSubtle,
      borderRadius: 4,
      paddingHorizontal: 3,
    },
    translationBox: {
      borderTopWidth: 1,
      borderTopColor: colors.surfaceBorder,
      paddingTop: 8,
    },
    sentencePt: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      fontStyle: 'italic',
    },
  });
