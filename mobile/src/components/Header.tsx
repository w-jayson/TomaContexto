import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useResponsive } from '../utils/useResponsive';

interface HeaderProps {
  onOpenSaved: () => void;
  savedCount: number;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSaved, savedCount }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { isWide, isDesktop } = useResponsive();
  const styles = useMemo(() => createStyles(colors, isDark, isWide, isDesktop), [colors, isDark, isWide, isDesktop]);

  return (
    <View style={styles.outerContainer}>
      <View style={styles.innerContainer}>
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>TSC</Text>
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>TomaSeuContexto</Text>
              {isWide && (
                <View style={styles.langPill}>
                  <Text style={styles.langPillText}>EN ➔ PT-BR</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtitle}>Sentence Mining • Método i+1</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={toggleTheme}
            accessibilityLabel={isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={isWide ? 22 : 20}
              color={isDark ? colors.targetToken : colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.savedButton, isWide && styles.savedButtonWide]}
            onPress={onOpenSaved}
            accessibilityLabel="Palavras Salvas"
            activeOpacity={0.7}
          >
            <Ionicons name="bookmark-outline" size={isWide ? 20 : 20} color={colors.textPrimary} />
            {isWide && <Text style={styles.savedButtonText}>Deck Salvo</Text>}
            {savedCount > 0 && (
              <View style={[styles.badge, isWide && styles.badgeWide]}>
                <Text style={styles.badgeText}>{savedCount > 99 ? '99+' : savedCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors, isDark: boolean, isWide: boolean, isDesktop: boolean) =>
  StyleSheet.create({
    outerContainer: {
      width: '100%',
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
      alignItems: 'center',
    },
    innerContainer: {
      width: '100%',
      maxWidth: isDesktop ? 1180 : 760,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: isWide ? 32 : 20,
      paddingTop: isWide ? 20 : 16,
      paddingBottom: isWide ? 18 : 12,
    },
    brandContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isWide ? 14 : 12,
    },
    logoBadge: {
      width: isWide ? 44 : 38,
      height: isWide ? 44 : 38,
      borderRadius: isWide ? 12 : 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    logoText: {
      color: '#FFFFFF',
      fontWeight: '900',
      fontSize: isWide ? 18 : 16,
      letterSpacing: -0.5,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    title: {
      fontSize: isWide ? 22 : 18,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -0.4,
    },
    langPill: {
      backgroundColor: colors.primarySubtle,
      borderColor: colors.primaryBorder,
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    langPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 0.3,
    },
    subtitle: {
      fontSize: isWide ? 13 : 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isWide ? 12 : 8,
    },
    iconButton: {
      width: isWide ? 42 : 38,
      height: isWide ? 42 : 38,
      borderRadius: isWide ? 12 : 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
    },
    savedButton: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
    },
    savedButtonWide: {
      width: 'auto',
      height: 42,
      borderRadius: 12,
      paddingHorizontal: 14,
      flexDirection: 'row',
      gap: 8,
    },
    savedButtonText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: colors.targetToken,
      borderRadius: 9,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeWide: {
      position: 'relative',
      top: 0,
      right: 0,
      marginLeft: 2,
    },
    badgeText: {
      color: '#11221B',
      fontSize: 11,
      fontWeight: '800',
    },
  });
