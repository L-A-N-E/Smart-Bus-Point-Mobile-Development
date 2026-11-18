import { StyleSheet, View } from 'react-native';

import { useI18n } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { BusLeg, RouteOption } from '../services/api';
import { spacing } from '../tokens';
import { formatCo2Saved } from '../utils/co2';
import { AccessibleBadge } from './AccessibleBadge';
import { AppText } from './AppText';
import { Card } from './Card';
import { Icon } from './Icon';
import { LineChip } from './LineChip';
import { StatusBadge } from './StatusBadge';

function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
}

export function RouteOptionCard({ option, onPress }: { option: RouteOption; onPress: () => void }) {
  const { colors } = useTheme();
  const { t, tn } = useI18n();

  const busLegs = option.legs.filter((l): l is BusLeg => l.type === 'bus');
  const lines = busLegs.map((l) => l.line);
  const transfersLabel = option.transfers === 0 ? t('results.direct') : tn('results.transfers', option.transfers);

  // "Ônibus chega em X min": quanto falta para o primeiro ônibus da opção passar na parada de
  // embarque — não confundir com `option.departAt`, que já inclui a caminhada até lá.
  const firstBusDepartureMinutes = busLegs[0] ? minutesUntil(busLegs[0].departAt) : null;
  const arrivalLabel =
    firstBusDepartureMinutes === null
      ? null
      : firstBusDepartureMinutes <= 0
        ? t('results.busArrivesNow')
        : t('results.busArrivesIn', { minutes: firstBusDepartureMinutes });

  const label = `${arrivalLabel ?? ''}, ${t('results.departAt', { time: formatClock(option.departAt) })}, ${t('results.arriveAt', { time: formatClock(option.arriveAt) })}, ${t(
    'results.totalTime',
    { minutes: option.totalMinutes },
  )}, ${transfersLabel}`;

  return (
    <Card onPress={onPress} accessibilityLabel={label} style={styles.card}>
      {arrivalLabel ? (
        <View style={styles.arrivalRow}>
          <Icon name="clock-fast" size={16} color={colors.primaryText} />
          <AppText variant="label" color={colors.primaryText}>
            {arrivalLabel}
          </AppText>
        </View>
      ) : null}

      <View style={styles.timesRow}>
        <View>
          <AppText variant="h2">{formatClock(option.departAt)}</AppText>
          <AppText variant="caption" tone="secondary">
            {t('results.departLabel')}
          </AppText>
        </View>
        <Icon name="arrow-right" size={20} color={colors.textTertiary} />
        <View>
          <AppText variant="h2">{formatClock(option.arriveAt)}</AppText>
          <AppText variant="caption" tone="secondary">
            {t('results.arriveLabel')}
          </AppText>
        </View>
        <View style={styles.totalWrap}>
          <AppText variant="title" color={colors.primaryText}>
            {t('results.totalTime', { minutes: option.totalMinutes })}
          </AppText>
        </View>
      </View>

      <View style={styles.linesRow}>
        {lines.map((line, i) => (
          <LineChip key={`${line}-${i}`} label={line} size="sm" />
        ))}
      </View>

      <View style={styles.metaRow}>
        <StatusBadge tone={option.confidence} />
        <AccessibleBadge accessible={option.accessible} />
        <AppText variant="caption" tone="secondary">
          {transfersLabel}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {t('results.walkMeters', { meters: option.walkMeters })}
        </AppText>
      </View>

      <AppText variant="caption" tone="tertiary" style={styles.co2}>
        {formatCo2Saved(option.co2SavedGrams)}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  arrivalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  timesRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  totalWrap: { marginLeft: 'auto' },
  linesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  co2: {},
});
