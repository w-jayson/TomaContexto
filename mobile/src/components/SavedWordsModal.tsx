import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SavedWord } from '../types/word';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';

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
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Vocabulário Minerado</Text>
            <Text style={styles.subtitle}>{savedWords.length} palavras salvas</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {savedWords.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhuma palavra salva</Text>
            <Text style={styles.emptyDesc}>
              Ao pesquisar um termo, toque no ícone de marcador para guardá-lo no seu deck de revisão.
            </Text>
          </View>
        ) : (
          <FlatList
            data={savedWords}
            keyExtractor={item => item.term}
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
      </SafeAreaView>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      width: '100%',
      maxWidth: 580,
      alignSelf: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    },
    title: {
      fontSize: 20,
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
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: {
      padding: 20,
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
      padding: 16,
    },
    cardContent: {
      flex: 1,
    },
    termRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
    },
    term: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    phonetic: {
      fontSize: 13,
      color: colors.textMuted,
      fontFamily: 'monospace',
    },
    translation: {
      fontSize: 14,
      color: colors.primary,
      marginTop: 4,
      fontWeight: '500',
    },
    date: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 6,
    },
    deleteButton: {
      padding: 8,
      marginLeft: 8,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 16,
    },
    emptyDesc: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },
  });
