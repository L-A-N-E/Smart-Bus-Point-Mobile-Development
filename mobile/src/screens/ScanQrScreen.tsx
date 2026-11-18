import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, IconButton, Screen, TextField } from '../components';
import { useI18n } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackScreenProps } from '../navigation/types';
import { radii, spacing } from '../tokens';
import { tap } from '../utils/haptics';
import { parseStopCode } from '../utils/qr';

// Leitura de QR Code da parada. SEMPRE oferece alternativa acessível (campo de código manual),
// mesmo com a câmera funcionando — não depende de visão para localizar uma parada.
export function ScanQrScreen({ navigation }: RootStackScreenProps<'ScanQr'>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState('');
  const [scanned, setScanned] = useState(false);

  const openStop = (code: string) => {
    if (scanned) return;
    setScanned(true);
    tap('medium');
    navigation.replace('StopDetail', { code });
  };

  const handleBarcodeScanned = (result: { data: string }) => {
    const code = parseStopCode(result.data);
    if (code) openStop(code);
  };

  const handleManualSubmit = () => {
    const code = parseStopCode(manualCode.trim());
    if (!code) {
      setManualError(t('scan.invalidCode'));
      tap('medium');
      return;
    }
    openStop(code);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <AppText variant="h2">{t('scan.title')}</AppText>
        <IconButton name="close" accessibilityLabel={t('a11y.closeButton')} onPress={navigation.goBack} />
      </View>

      {permission?.granted ? (
        <View style={[styles.cameraWrap, { borderColor: colors.border }]}>
          <CameraView
            style={styles.camera}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          />
          <View pointerEvents="box-none" style={styles.cameraOverlay}>
            <AppText variant="bodySm" color="#FFFFFF" align="center" style={styles.hintText}>
              {t('scan.hint')}
            </AppText>
            <IconButton
              name={torch ? 'flashlight-off' : 'flashlight'}
              accessibilityLabel={t(torch ? 'scan.flashlightOff' : 'scan.flashlightOn')}
              variant="filled"
              onPress={() => setTorch((v) => !v)}
              style={styles.torchButton}
            />
          </View>
        </View>
      ) : (
        <View style={[styles.permissionCard, { backgroundColor: colors.surfaceAlt }]}>
          <AppText variant="h3" align="center" style={styles.permissionTitle}>
            {t('scan.permissionTitle')}
          </AppText>
          <AppText variant="body" tone="secondary" align="center" style={styles.permissionMessage}>
            {t('scan.permissionMessage')}
          </AppText>
          <Button title={t('scan.permissionButton')} onPress={requestPermission} />
        </View>
      )}

      <View style={styles.manualSection}>
        <AppText variant="label" style={styles.manualLabel}>
          {t('scan.manualCode')}
        </AppText>
        <View style={styles.manualRow}>
          <View style={styles.manualField}>
            <TextField
              placeholder={t('scan.manualPlaceholder')}
              value={manualCode}
              onChangeText={(v) => {
                setManualCode(v);
                setManualError('');
              }}
              error={manualError || undefined}
              keyboardType="number-pad"
              returnKeyType="go"
              onSubmitEditing={handleManualSubmit}
              accessibilityLabel={t('scan.manualPlaceholder')}
            />
          </View>
          <Button title={t('scan.manualSubmit')} size="sm" onPress={handleManualSubmit} style={styles.manualButton} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, marginBottom: spacing.lg },
  cameraWrap: { flex: 1, borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden', marginBottom: spacing.lg },
  camera: { flex: 1 },
  cameraOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, alignItems: 'center', gap: spacing.md },
  hintText: { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  torchButton: {},
  permissionCard: { flex: 1, borderRadius: radii.lg, padding: spacing.xl, justifyContent: 'center', gap: spacing.lg, marginBottom: spacing.lg },
  permissionTitle: {},
  permissionMessage: {},
  manualSection: { paddingBottom: spacing.lg },
  manualLabel: { marginBottom: spacing.sm },
  manualRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  manualField: { flex: 1 },
  manualButton: { marginTop: 0 },
});
