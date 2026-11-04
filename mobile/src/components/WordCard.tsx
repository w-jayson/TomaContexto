import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { WordLookupResponseDto } from '../types/word';
import { colors } from '../theme/colors';

interface WordCardProps {
  word: WordLookupResponseDto;
  isSaved: boolean;
  onToggleSave: () => void;
}

export const WordCard: React.FC<WordCardProps> = ({ word, isSaved, onToggleSave }) => {
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
              >
                <Ionicons
                  name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
                  size={18}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaved && styles.saveButtonActive]}
          onPress={onToggleSave}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isSaved ? '#FFFFFF' : colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Translations grouped by Part of Speech */}
      <View style={styles.translationsContainer}>
        {word.translationsByPos.map((group, gIndex) => {
          const badgeColor = getPosColor(group.partOfSpeech);
          return (
            <View key={`${group.partOfSpeech}-${gIndex}`} style={styles.posBlock}>
              <View style={[styles.posBadge, { borderColor: badgeColor, backgroundColor: `${badgeColor}15` }]}>
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  termInfo: {
    flex: 1,
    marginRight: 12,
  },
  term: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  phoneticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  phonetic: {
    fontSize: 15,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  speakerButton: {
    padding: 4,
  },
  saveButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonActive: {
    backgroundColor: colors.primary,
  },
  translationsContainer: {
    marginTop: 16,
    gap: 14,
  },
  posBlock: {
    gap: 8,
  },
  posBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  posBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  translationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  translationPill: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  translationText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
});
