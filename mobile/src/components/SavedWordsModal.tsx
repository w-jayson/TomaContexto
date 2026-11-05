import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SavedWord } from '../types/word';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useResponsive } from '../utils/useResponsive';

interface SavedWordsModalProps {
  visible: boolean;
  onClose: () => void;
  savedWords: SavedWord[];
  onSelectWord: (term: string) => void;
  onRemoveWord: (term: string) => void;
}

export const SavedWordsModal: React.FC<SavedWordsModalProps> = ({
  visible,
  onClose,
  savedWords,
  onSelectWord,
  onRemoveWord,
}) => {
  const { colors } = useTheme();
  const { isWide, isDesktop } = useResponsive();
  const styles = useMemo(() => createStyles(colors, isWide, isDesktop), [colors, isWide, isDesktop]);

  const modalContent = (
    <View style={styles.dialogCard}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Vocabulário Minerado</Text>
          <Text style={styles.subtitle}>{savedWords.length} palavras salvas no seu deck</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {savedWords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bookmark-outline" size={isWide ? 56 : 48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Nenhuma palavra salva</Text>
          <Text style={styles.emptyDesc}>
            Ao pesquisar um termo, toque no marcador de favoritos para guardá-lo no seu deck de revisão.
          </Text>
        </View>
      ) : (
        <FlatList
          data={savedWords}
          keyExtractor={(item) => item.term}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                onSelectWord(item.term);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.cardContent}>
                <View style={styles.termRow}>
                  <Text style={styles.term}>{item.term}</Text>
                  {item.phonetic && <Text style={styles.phonetic}>{item.phonetic}</Text>}
                </View>
                <Text style={styles.translation}>{item.mainTranslation}</Text>
                <Text style={styles.date}>Salvo em {item.savedAt}</Text>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => onRemoveWord(item.term)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType={isWide ? 'fade' : 'slide'}
      transparent={isWide}
      onRequestClose={onClose}
    >
      {isWide ? (
        <View style={styles.backdrop}>
          <TouchableOpacity
            style={styles.backdropTouch}
            activeOpacity={1}
            onPress={onClose}
          />
          {modalContent}
        </View>
      ) : (
        <SafeAreaView style={styles.mobileSafeArea}>
          {modalContent}
        </SafeAreaView>
      )}
    </Modal>
  );
};

const createStyles = (colors: ThemeColors, isWide: boolean, isDesktop: boolean) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    backdropTouch: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    mobileSafeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    dialogCard: {
      backgroundColor: colors.background,
      width: '100%',
      maxWidth: isWide ? 680 : undefined,
      maxHeight: isWide ? '85%' : '100%',
      flex: isWide ? 0 : 1,
      borderRadius: isWide ? 20 : 0,
      borderWidth: isWide ? 1 : 0,
      borderColor: colors.surfaceBorder,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: isWide ? 24 : 20,
      paddingVertical: isWide ? 20 : 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
      backgroundColor: colors.surface,
    },
    title: {
      fontSize: isWide ? 22 : 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceHover,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
    },
    listContent: {
      padding: isWide ? 24 : 20,
      gap: 12,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 14,
      padding: isWide ? 18 : 16,
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
    },
    cardContent: {
      flex: 1,
    },
    termRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 10,
    },
    term: {
      fontSize: isWide ? 20 : 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    phonetic: {
      fontSize: 14,
      color: colors.textSecondary,
      fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    },
    translation: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    date: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 6,
    },
    deleteButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.surfaceHover,
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
    },
    emptyContainer: {
      paddingVertical: 60,
      paddingHorizontal: 24,
      alignItems: 'center',
      gap: 12,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    emptyDesc: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 360,
    },
  });
