import { StyleSheet, View } from 'react-native';

import { useI18n } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Arrival } from '../services/api';
import { spacing } from '../tokens';
import { formatDataAge } from '../utils/time';
import { AccessibleBadge } from './AccessibleBadge';
import { AppText } from './AppText';
import { LineChip } from './LineChip';
import { StatusBadge } from './StatusBadge';

export function ArrivalRow({ arrival }: { arrival: Arrival }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const ageLabel = formatDataAge(arrival.dataAgeSeconds);
  const accessibleLabel = t(
    arrival.accessible === null ? 'accessible.unknown' : arrival.accessible ? 'accessible.yes' : 'accessible.no',
  );
  const label = `${arrival.line}, ${arrival.destination}, ${arrival.minutes} ${t('common.minutes')}, ${t(
    `status.${arrival.confidence}`,
  )}, ${accessibleLabel}${ageLabel ? `, ${ageLabel}` : ''}`;

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]} accessible accessibilityLabel={label}>
      <LineChip label={arrival.line} />
      <View style={styles.middle}>
        <AppText variant="title" numberOfLines={1}>
          {arrival.destination}
        </AppText>
        <View style={styles.metaRow}>
          <StatusBadge tone={arrival.confidence} />
          <AccessibleBadge accessible={arrival.accessible} compact />
          {ageLabel ? (
            <AppText variant="caption" tone="tertiary">
              {ageLabel}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={styles.minutesWrap}>
        <AppText variant="h2" color={colors.text}>
          {arrival.minutes}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {t('common.minutes')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1 },
  middle: { flex: 1, gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  minutesWrap: { alignItems: 'center', minWidth: 44 },
});
