import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useResponsive } from '../utils/useResponsive';

export const EmptyState: React.FC = () => {
  const { colors } = useTheme();
  const { isWide, isDesktop } = useResponsive();
  const styles = useMemo(() => createStyles(colors, isWide, isDesktop), [colors, isWide, isDesktop]);

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="book-outline" size={isWide ? 38 : 30} color={colors.primary} />
      </View>

      <Text style={styles.title}>Mineração de Sentenças</Text>
      <Text style={styles.description}>
        Baseado no método do <Text style={styles.bold}>Input Compreensível (i+1)</Text>:
        aprenda novos vocábulos inseridos em contextos naturais, onde{' '}
        <Text style={styles.accentText}>i</Text> é a sua base conhecida e{' '}
        <Text style={styles.accentText}>+1</Text> é a nova expressão aprendida.
      </Text>

      <View style={styles.guideCard}>
        <Text style={styles.guideTitle}>Como funciona o TomaSeuContexto</Text>

        <View style={styles.stepsContainer}>
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepHeading}>Busque qualquer termo</Text>
              <Text style={styles.stepText}>
                Digite qualquer palavra, verbo ou *phrasal verb* em inglês na barra acima.
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepHeading}>Análise Lexical & Fonética</Text>
              <Text style={styles.stepText}>
                Consulte transcrição fonética internacional (IPA) e traduções agrupadas por classe.
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepHeading}>Contexto Real & Áudio</Text>
              <Text style={styles.stepText}>
                Examine sentenças reais de uso, ouça pronúncias nativas e salve termos no seu deck.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors, isWide: boolean, isDesktop: boolean) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: isWide ? 32 : 24,
      paddingVertical: isWide ? 44 : 36,
      alignItems: 'center',
      maxWidth: isDesktop ? 960 : 760,
      width: '100%',
      alignSelf: 'center',
    },
    iconCircle: {
      width: isWide ? 76 : 64,
      height: isWide ? 76 : 64,
      borderRadius: isWide ? 24 : 20,
      backgroundColor: colors.primarySubtle,
      borderWidth: 1.5,
      borderColor: colors.primaryBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: isWide ? 20 : 16,
    },
    title: {
      fontSize: isWide ? 28 : 22,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: isWide ? 12 : 10,
      textAlign: 'center',
      letterSpacing: -0.4,
    },
    description: {
      fontSize: isWide ? 16 : 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: isWide ? 26 : 22,
      marginBottom: isWide ? 36 : 28,
      maxWidth: 680,
    },
    bold: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    accentText: {
      color: colors.targetToken,
      fontWeight: '700',
    },
    guideCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: isWide ? 20 : 16,
      padding: isWide ? 28 : 20,
      gap: isWide ? 20 : 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 2,
    },
    guideTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    stepsContainer: {
      flexDirection: isDesktop ? 'row' : 'column',
      gap: isDesktop ? 20 : 16,
    },
    stepItem: {
      flex: isDesktop ? 1 : undefined,
      flexDirection: isDesktop ? 'column' : 'row',
      alignItems: isDesktop ? 'flex-start' : 'center',
      gap: 12,
      backgroundColor: isDesktop ? colors.surfaceHover : 'transparent',
      borderRadius: isDesktop ? 14 : 0,
      padding: isDesktop ? 16 : 0,
      borderWidth: isDesktop ? 1 : 0,
      borderColor: isDesktop ? colors.surfaceBorder : 'transparent',
    },
    stepNumber: {
      width: isWide ? 28 : 24,
      height: isWide ? 28 : 24,
      borderRadius: isWide ? 14 : 12,
      backgroundColor: colors.primarySubtle,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumberText: {
      fontSize: isWide ? 13 : 12,
      fontWeight: '700',
      color: colors.primary,
    },
    stepContent: {
      flex: 1,
    },
    stepHeading: {
      fontSize: isWide ? 15 : 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 3,
    },
    stepText: {
      fontSize: isWide ? 13 : 13,
      color: colors.textSecondary,
      lineHeight: isWide ? 20 : 18,
    },
  });
