import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getApiBaseUrl, setApiBaseUrl, DEFAULT_API_URL } from '../api/config';
import { colors } from '../theme/colors';

interface ConfigModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ visible, onClose }) => {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      getApiBaseUrl().then(setUrl);
      setStatusMessage(null);
    }
  }, [visible]);

  const handleSave = async () => {
    if (!url.trim()) return;
    await setApiBaseUrl(url);
    onClose();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setStatusMessage(null);
    try {
      const cleanUrl = url.trim().replace(/\/+$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${cleanUrl}/api/Words/test`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Even if 404/200, the server answered
      if (res.status === 200 || res.status === 404) {
        setIsSuccess(true);
        setStatusMessage('Conexão estabelecida com sucesso!');
      } else {
        setIsSuccess(false);
        setStatusMessage(`Servidor respondeu com código ${res.status}.`);
      }
    } catch {
      setIsSuccess(false);
      setStatusMessage('Falha ao conectar. Verifique se o backend .NET está rodando nesta URL.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Configurações da API</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>URL Base do Backend (.NET API):</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="http://localhost:5000"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.sectionSubtitle}>Atalhos comuns:</Text>
          <View style={styles.presets}>
            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => setUrl('http://10.0.2.2:5000')}
              activeOpacity={0.7}
            >
              <Text style={styles.presetText}>Emulador Android (10.0.2.2:5000)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => setUrl('http://localhost:5000')}
              activeOpacity={0.7}
            >
              <Text style={styles.presetText}>Localhost / Web / iOS (localhost:5000)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => setUrl(DEFAULT_API_URL)}
              activeOpacity={0.7}
            >
              <Text style={styles.presetText}>Padrão da Plataforma</Text>
            </TouchableOpacity>
          </View>

          {statusMessage && (
            <View
              style={[
                styles.statusBox,
                { backgroundColor: isSuccess ? 'rgba(16, 185, 129, 0.12)' : colors.errorSubtle },
              ]}
            >
              <Ionicons
                name={isSuccess ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={isSuccess ? colors.success : colors.error}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isSuccess ? colors.success : colors.error },
                ]}
              >
                {statusMessage}
              </Text>
            </View>
          )}

          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestConnection}
              disabled={testing || !url.trim()}
              activeOpacity={0.7}
            >
              {testing ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <Text style={styles.testButtonText}>Testar Conexão</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={!url.trim()}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>Salvar Configuração</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  presets: {
    gap: 8,
    marginBottom: 24,
  },
  presetButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  presetText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  footerButtons: {
    gap: 12,
  },
  testButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  testButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
