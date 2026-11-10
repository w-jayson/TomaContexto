import React, { useState, useMemo, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WordLookupResponseDto } from '../types/word';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useResponsive } from '../utils/useResponsive';
import { playSmartAudio } from '../utils/audioPlayer';

interface WordCardProps {
  word: WordLookupResponseDto;
  onSelectSynonym?: (synonym: string) => void;
}

const WordCardComponent: React.FC<WordCardProps> = ({ word, onSelectSynonym }) => {
  const { colors } = useTheme();
  const { isWide, isDesktop } = useResponsive();
  const styles = useMemo(() => createStyles(colors, isWide, isDesktop), [colors, isWide, isDesktop]);
  const [isPlaying, setIsPlaying] = useState(false);

  const speakTerm = async () => {
    await playSmartAudio({
      text: word.term,
      type: 'word',
      rate: 0.9,
      onStart: () => setIsPlaying(true),
      onDone: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
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

  // Adjust font size dynamically for long terms without useMemo overhead (rerender-simple-expression-in-memo)
  const termLength = word.term.length;
  const termFontSize = isWide
    ? (termLength >= 15 ? 24 : termLength >= 11 ? 27 : 31)
    : (termLength >= 15 ? 21 : termLength >= 11 ? 23 : 26);

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

          {word.phonetic ? (
            <View style={styles.phoneticRow}>
              <Text style={styles.phonetic}>{word.phonetic}</Text>
              <TouchableOpacity
                style={[styles.speakerButton, isPlaying ? styles.speakerButtonPlaying : null]}
                onPress={speakTerm}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Ouvir pronúncia"
                accessibilityState={{ busy: isPlaying }}
              >
                <Ionicons
                  name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
                  size={isWide ? 19 : 18}
                  color={isPlaying ? colors.primaryDark : colors.primary}
                />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {!word.phonetic ? (
          <TouchableOpacity
            style={[styles.speakerButton, isPlaying ? styles.speakerButtonPlaying : null]}
            onPress={speakTerm}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Ouvir pronúncia"
            accessibilityState={{ busy: isPlaying }}
          >
            <Ionicons
              name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
              size={isWide ? 20 : 18}
              color={isPlaying ? colors.primaryDark : colors.primary}
            />
          </TouchableOpacity>
        ) : null}
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

      {/* Synonyms Section */}
      {word.synonyms && word.synonyms.length > 0 ? (
        <View style={styles.synonymsSection}>
          <View style={styles.synonymsHeader}>
            <View style={styles.synonymsTitleRow}>
              <Ionicons
                name="swap-horizontal-outline"
                size={isWide ? 15 : 14}
                color={colors.primary}
              />
              <Text style={styles.synonymsTitle}>Sinônimos</Text>
            </View>
            <Text style={styles.synonymsSubtitle}>Toque para pesquisar</Text>
          </View>

          <View style={styles.synonymsList}>
            {word.synonyms.map((synonym, sIndex) => (
              <TouchableOpacity
                key={`${synonym}-${sIndex}`}
                style={styles.synonymChip}
                onPress={() => onSelectSynonym?.(synonym)}
                activeOpacity={0.7}
                disabled={!onSelectSynonym}
                accessibilityRole="button"
                accessibilityLabel={`Pesquisar sinônimo ${synonym}`}
              >
                <Text style={styles.synonymText}>{synonym}</Text>
                {onSelectSynonym ? (
                  <Ionicons
                    name="arrow-forward"
                    size={isWide ? 11 : 10}
                    color={colors.primary}
                    style={styles.synonymArrow}
                  />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};

export const WordCard = memo(WordCardComponent);

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
    speakerButtonPlaying: {
      backgroundColor: colors.primaryBorder,
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
    synonymsSection: {
      marginTop: isWide ? 18 : 14,
      paddingTop: isWide ? 16 : 14,
      borderTopWidth: 1,
      borderTopColor: colors.surfaceBorder,
      gap: 10,
    },
    synonymsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    synonymsTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    synonymsTitle: {
      fontSize: isWide ? 13 : 12,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    synonymsSubtitle: {
      fontSize: isWide ? 12 : 11,
      color: colors.textMuted,
    },
    synonymsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    synonymChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primarySubtle,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      paddingHorizontal: isWide ? 12 : 10,
      paddingVertical: isWide ? 6 : 5,
      borderRadius: 8,
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
    },
    synonymText: {
      fontSize: isWide ? 13 : 12,
      color: colors.primary,
      fontWeight: '600',
    },
    synonymArrow: {
      opacity: 0.7,
    },
  });
