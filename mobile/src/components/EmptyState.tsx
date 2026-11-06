import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useResponsive } from '../utils/useResponsive';

const EmptyStateComponent: React.FC = () => {
  const { colors } = useTheme();
  const { isWide, isDesktop } = useResponsive();
  const styles = useMemo(() => createStyles(colors, isWide, isDesktop), [colors, isWide, isDesktop]);

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="sparkles-outline" size={isWide ? 34 : 28} color={colors.primary} />
      </View>

      <Text style={styles.title}>Mineração de Sentenças em Contexto</Text>
      <Text style={styles.description}>
        Aprenda inglês com o princípio do <Text style={styles.bold}>Input Compreensível (i+1)</Text>:
        compreender 95% da sentença (<Text style={styles.tokenI}>i</Text>) para adquirir o novo termo (
        <Text style={styles.tokenPlusOne}>+1</Text>) sem esforço de memorização mecânica.
      </Text>

      {/* Grounded Demo Card showing Krashen's i+1 principle */}
      <View style={styles.demoCard}>
        <View style={styles.demoHeader}>
          <Text style={styles.demoBadge}>Princípio na Prática</Text>
          <Text style={styles.demoSub}>Método Natural de Krashen</Text>
        </View>

        <View style={styles.sentencePreview}>
          <Text style={styles.previewEn}>
            "The community showed remarkable{' '}
            <Text style={styles.previewHighlight}>resilience</Text> after the storm."
          </Text>
          <Text style={styles.previewPt}>
            A comunidade mostrou uma <Text style={styles.previewPtHighlight}>resiliência</Text> notável após a tempestade.
          </Text>
        </View>

        <View style={styles.equationRow}>
          <View style={styles.equationBlock}>
            <Text style={styles.equationSymbol}>i</Text>
            <Text style={styles.equationDesc}>Tudo o que você já compreende na frase</Text>
          </View>
          <Text style={styles.equationPlus}>+</Text>
          <View style={styles.equationBlock}>
            <Text style={[styles.equationSymbol, styles.equationPlusOne]}>1</Text>
            <Text style={styles.equationDesc}>O novo termo assimilado pelo contexto</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export const EmptyState = memo(EmptyStateComponent);

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
      width: isWide ? 68 : 58,
      height: isWide ? 68 : 58,
      borderRadius: isWide ? 20 : 18,
      backgroundColor: colors.primarySubtle,
      borderWidth: 1.5,
      borderColor: colors.primaryBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: isWide ? 18 : 14,
    },
    title: {
      fontSize: isWide ? 26 : 21,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: isWide ? 10 : 8,
      textAlign: 'center',
      letterSpacing: -0.4,
    },
    description: {
      fontSize: isWide ? 15 : 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: isWide ? 24 : 22,
      marginBottom: isWide ? 32 : 24,
      maxWidth: 620,
    },
    bold: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    tokenI: {
      color: colors.primary,
      fontWeight: '700',
    },
    tokenPlusOne: {
      color: colors.targetToken,
      fontWeight: '700',
    },
    demoCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: isWide ? 18 : 16,
      padding: isWide ? 26 : 18,
      gap: isWide ? 18 : 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 2,
    },
    demoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
      paddingBottom: 12,
    },
    demoBadge: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    demoSub: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500',
    },
    sentencePreview: {
      backgroundColor: colors.surfaceHover,
      borderRadius: 12,
      padding: isWide ? 18 : 14,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      gap: 8,
    },
    previewEn: {
      fontSize: isWide ? 16 : 15,
      color: colors.textPrimary,
      fontWeight: '500',
      lineHeight: isWide ? 24 : 22,
    },
    previewHighlight: {
      color: colors.targetToken,
      fontWeight: '700',
      backgroundColor: colors.targetTokenSubtle,
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    previewPt: {
      fontSize: isWide ? 14 : 13,
      color: colors.textSecondary,
      lineHeight: isWide ? 20 : 18,
    },
    previewPtHighlight: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    equationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingTop: 4,
      gap: 12,
    },
    equationBlock: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    equationSymbol: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.primary,
    },
    equationPlusOne: {
      color: colors.targetToken,
    },
    equationDesc: {
      fontSize: isWide ? 12 : 11,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 16,
    },
    equationPlus: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 16,
    },
  });
