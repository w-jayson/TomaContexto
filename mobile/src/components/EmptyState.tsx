import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export const EmptyState: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="book-outline" size={30} color={colors.primary} />
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
        
        <View style={styles.stepRow}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Text style={styles.stepText}>
            Digite acima qualquer termo ou *phrasal verb* em inglês.
          </Text>
        </View>

        <View style={styles.stepRow}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <Text style={styles.stepText}>
            Consulte a fonética internacional (IPA) e traduções por classe gramatical.
          </Text>
        </View>

        <View style={styles.stepRow}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Text style={styles.stepText}>
            Examine sentenças reais com a palavra destacada e pratique com o áudio nativo.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 36,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
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
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
});
