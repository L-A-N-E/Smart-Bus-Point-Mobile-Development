import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppText, Card, EmptyState, ErrorState, Icon, Screen, ScreenHeader, Skeleton } from '../components';
import { useI18n } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { getRailStatus, RailLine } from '../services/api';
import { spacing } from '../tokens';

function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function RailStatusScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [lines, setLines] = useState<RailLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    getRailStatus()
      .then((res) => setLines(res.lines))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <Screen scroll={false}>
      <ScreenHeader title={t('rail.title')} subtitle={t('rail.disclaimer')} />

      <FlatList
        data={lines}
        keyExtractor={(item) => item.line}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <RailLineRow line={item} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletons}>
              <Skeleton height={64} />
              <Skeleton height={64} />
              <Skeleton height={64} />
            </View>
          ) : error ? (
            <ErrorState title={t('rail.unavailableTitle')} description={t('rail.unavailableDescription')} onRetry={load} />
          ) : (
            <EmptyState icon="train-variant" title={t('rail.unavailableTitle')} description={t('rail.unavailableDescription')} />
          )
        }
      />
    </Screen>
  );
}

function RailLineRow({ line }: { line: RailLine }) {
  const { colors } = useTheme();
  const { t } = useI18n();

  // Nunca só cor: o círculo colorido é decorativo, o ícone + texto do status é que comunica o estado.
  const iconByLevel = { normal: 'check-circle-outline', reduced: 'alert-outline', problem: 'alert-octagon-outline' } as const;
  const colorByLevel = { normal: colors.successText, reduced: colors.dangerText, problem: colors.dangerText } as const;

  return (
    <Card style={styles.row} accessibilityLabel={`${line.name}, ${line.status}, ${t('rail.updatedAt', { time: formatClock(line.updatedAt) })}`}>
      <View style={[styles.dot, { backgroundColor: line.color }]} />
      <View style={styles.flex}>
        <AppText variant="title" numberOfLines={1}>
          {line.name}
        </AppText>
        <View style={styles.statusRow}>
          <Icon name={iconByLevel[line.statusLevel]} size={14} color={colorByLevel[line.statusLevel]} />
          <AppText variant="bodySm" color={colorByLevel[line.statusLevel]}>
            {line.status}
          </AppText>
        </View>
        <AppText variant="caption" tone="tertiary">
          {t('rail.updatedAt', { time: formatClock(line.updatedAt) })}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl, paddingTop: spacing.sm, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  dot: { width: 14, height: 14, borderRadius: 7 },
  flex: { flex: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  skeletons: { gap: spacing.md, marginTop: spacing.sm },
});
