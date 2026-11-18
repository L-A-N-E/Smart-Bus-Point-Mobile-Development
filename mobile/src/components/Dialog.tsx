import { Modal, StyleSheet, View } from 'react-native';

import { useTheme } from '../contexts/ThemeContext';
import { radii, spacing } from '../tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, IconName } from './Icon';

type Props = {
  visible: boolean;
  icon?: IconName;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel: () => void;
  danger?: boolean;
};

// Diálogo simples de confirmação/aviso. Usa o `Modal` nativo (foco e leitor de tela já tratados pelo SO).
export function Dialog({ visible, icon, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, danger }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
        <View
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          {icon ? (
            <View style={[styles.iconWrap, { backgroundColor: danger ? colors.dangerSoft : colors.primarySoft }]}>
              <Icon name={icon} size={26} color={danger ? colors.dangerText : colors.primaryText} />
            </View>
          ) : null}
          <AppText variant="h3" align="center" style={styles.title}>
            {title}
          </AppText>
          <AppText variant="body" tone="secondary" align="center" style={styles.message}>
            {message}
          </AppText>
          <View style={styles.actions}>
            {onConfirm ? (
              <Button
                title={confirmLabel ?? ''}
                variant={danger ? 'danger' : 'primary'}
                onPress={onConfirm}
                style={styles.flex}
              />
            ) : null}
            <Button title={cancelLabel ?? ''} variant={onConfirm ? 'secondary' : 'primary'} onPress={onCancel} style={styles.flex} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { width: '100%', maxWidth: 360, borderRadius: radii.lg, borderWidth: 1, padding: spacing.xl, alignItems: 'center' },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  title: { marginBottom: spacing.sm },
  message: { marginBottom: spacing.xl },
  actions: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  flex: { flex: 1 },
});
