import { StyleSheet, View } from 'react-native';

import { useI18n } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { RouteLeg } from '../services/api';
import { spacing } from '../tokens';
import { AccessibleBadge } from './AccessibleBadge';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { LineChip } from './LineChip';
import { StatusBadge } from './StatusBadge';

function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

type Props = { leg: RouteLeg; isLast: boolean };

// Um trecho da linha do tempo da rota: "caminhar até X" ou "embarcar na linha Y, desce em Z".
export function TimelineLeg({ leg, isLast }: Props) {
  const { colors } = useTheme();
  const { t, tn } = useI18n();

  const icon = leg.type === 'walk' ? 'walk' : 'bus';
  const iconColor = leg.type === 'walk' ? colors.textSecondary : colors.primaryText;
  const iconBg = leg.type === 'walk' ? colors.surfaceAlt : colors.primarySoft;

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Icon name={icon} size={18} color={iconColor} />
        </View>
        {!isLast ? <View style={[styles.line, { backgroundColor: colors.border }]} /> : null}
      </View>

      <View style={styles.content}>
        {leg.type === 'walk' ? (
          <AppText variant="body">
            {leg.to === 'destination'
              ? t('detail.walkLeg', { to: t('results.arriveLabel').toLowerCase() })
              : t('detail.walkLeg', { to: leg.to })}
          </AppText>
        ) : (
          <>
            <View style={styles.busHeader}>
              <LineChip label={leg.line} size="sm" />
              <AppText variant="body" style={styles.flex} numberOfLines={1}>
                {t('detail.boardAt', { line: leg.line, stop: leg.fromStop.name })}
              </AppText>
            </View>
            <View style={styles.busMeta}>
              <StatusBadge tone={leg.confidence} />
              <AccessibleBadge accessible={leg.accessible} />
              <AppText variant="caption" tone="secondary">
                {formatClock(leg.departAt)} → {formatClock(leg.arriveAt)}
              </AppText>
            </View>
            <AppText variant="bodySm" tone="secondary">
              {t('detail.alightAt', { stop: leg.toStop.name })}
            </AppText>
          </>
        )}
        {leg.type === 'walk' ? (
          <AppText variant="caption" tone="tertiary">
            {tn('detail.walkLegGeneric', leg.meters, { meters: leg.meters })}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 36 },
  iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 2, marginVertical: 4 },
  content: { flex: 1, paddingBottom: spacing.lg, gap: 4 },
  flex: { flex: 1 },
  busHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  busMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
