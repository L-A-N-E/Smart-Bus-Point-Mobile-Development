import { StyleSheet, View } from 'react-native';

import { useI18n } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { radii, spacing } from '../tokens';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';

export type StatusTone = 'live' | 'scheduled' | 'delayed' | 'normal' | 'problem';

// Selo de status: SEMPRE ícone + texto + cor (nunca só cor) — regra de acessibilidade do app.
// Teal (live) e verde (normal) são parecidos em luminosidade; por isso usam ícones diferentes
// (relógio vs. check) e nunca aparecem lado a lado representando estados a diferenciar.
export function StatusBadge({ tone }: { tone: StatusTone }) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const config: Record<StatusTone, { icon: IconName; color: string; soft: string; labelKey: 'status.live' | 'status.scheduled' | 'status.delayed' | 'status.normal' | 'status.problem' }> = {
    live: { icon: 'wifi', color: colors.primaryText, soft: colors.primarySoft, labelKey: 'status.live' },
    scheduled: { icon: 'clock-outline', color: colors.textSecondary, soft: colors.surfaceAlt, labelKey: 'status.scheduled' },
    delayed: { icon: 'alert-circle-outline', color: colors.dangerText, soft: colors.dangerSoft, labelKey: 'status.delayed' },
    normal: { icon: 'check-circle-outline', color: colors.successText, soft: colors.successSoft, labelKey: 'status.normal' },
    problem: { icon: 'alert-octagon-outline', color: colors.dangerText, soft: colors.dangerSoft, labelKey: 'status.problem' },
  };
  const { icon, color, soft, labelKey } = config[tone];

  return (
    <View style={[styles.badge, { backgroundColor: soft }]}>
      <Icon name={icon} size={13} color={color} />
      <AppText variant="caption" color={color}>
        {t(labelKey)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
});
