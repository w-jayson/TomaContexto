import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';

interface HeaderProps {
  onOpenSaved: () => void;
  savedCount: number;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSaved, savedCount }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={styles.container}>
      <View style={styles.brandContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>TSC</Text>
        </View>
        <View>
          <Text style={styles.title}>TomaSeuContexto</Text>
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
            size={20}
            color={isDark ? colors.targetToken : colors.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onOpenSaved}
          accessibilityLabel="Palavras Salvas"
          activeOpacity={0.7}
        >
          <Ionicons name="bookmark-outline" size={20} color={colors.textPrimary} />
          {savedCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{savedCount > 99 ? '99+' : savedCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
      backgroundColor: colors.background,
    },
    brandContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logoBadge: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoText: {
      color: '#FFFFFF',
      fontWeight: '900',
      fontSize: 16,
      letterSpacing: -0.5,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500',
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: colors.targetToken,
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: isDark ? '#0F1715' : '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
    },
  });
