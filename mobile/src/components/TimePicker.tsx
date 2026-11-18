import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { radii, sizes, spacing } from '../tokens';
import { tap } from '../utils/haptics';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';

type Props = {
  visible: boolean;
  initialHour: number;
  initialMinute: number;
  onConfirm: (hour: number, minute: number) => void;
  onCancel: () => void;
};

// Seletor de horário simples (stepper de hora e de minuto de 5 em 5) — sem depender de nenhuma
// lib externa de date picker. Alvos de toque de 48dp, navegável com leitor de tela.
export function TimePicker({ visible, initialHour, initialMinute, onConfirm, onCancel }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);

  const adjustHour = (delta: number) => {
    tap();
    setHour((h) => (h + delta + 24) % 24);
  };
  const adjustMinute = (delta: number) => {
    tap();
    setMinute((m) => (m + delta + 60) % 60);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityViewIsModal>
          <AppText variant="h3" align="center" style={styles.title}>
            {t('planner.chooseTime')}
          </AppText>

          <View style={styles.pickerRow}>
            <Stepper value={hour} label={t('planner.chooseTime')} onIncrement={() => adjustHour(1)} onDecrement={() => adjustHour(-1)} />
            <AppText variant="h1">:</AppText>
            <Stepper value={minute} step={5} label={t('planner.chooseTime')} onIncrement={() => adjustMinute(5)} onDecrement={() => adjustMinute(-5)} />
          </View>

          <View style={styles.actions}>
            <Button title={t('common.cancel')} variant="secondary" onPress={onCancel} style={styles.flex} />
            <Button title={t('common.confirm')} onPress={() => onConfirm(hour, minute)} style={styles.flex} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Stepper({
  value,
  onIncrement,
  onDecrement,
  label,
}: {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  label: string;
  step?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={onIncrement}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.stepperButton, { backgroundColor: colors.surfaceAlt }]}
      >
        <Icon name="chevron-up" size={22} color={colors.text} />
      </Pressable>
      <AppText variant="h1" style={styles.stepperValue}>
        {String(value).padStart(2, '0')}
      </AppText>
      <Pressable
        onPress={onDecrement}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.stepperButton, { backgroundColor: colors.surfaceAlt }]}
      >
        <Icon name="chevron-down" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { width: '100%', maxWidth: 320, borderRadius: radii.lg, borderWidth: 1, padding: spacing.xl },
  title: { marginBottom: spacing.lg },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.xl },
  stepper: { alignItems: 'center', gap: spacing.sm },
  stepperButton: { width: sizes.iconButton, height: sizes.iconButton, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { minWidth: 56, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
