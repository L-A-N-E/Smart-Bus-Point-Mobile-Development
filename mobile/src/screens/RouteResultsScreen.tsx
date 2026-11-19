import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppText, EmptyState, ErrorState, RouteOptionCard, Screen, ScreenHeader, Skeleton } from '../components';
import { useI18n } from '../contexts/LanguageContext';
import { PlanRequest, planRoute, RouteOption } from '../services/api';
import { spacing } from '../tokens';

export function RouteResultsScreen() {
  const { request: requestRaw, originLabel, destinationLabel } = useLocalSearchParams<{
    request: string;
    originLabel: string;
    destinationLabel: string;
  }>();
  const request = useMemo<PlanRequest>(() => JSON.parse(requestRaw), [requestRaw]);
  const router = useRouter();
  const { t } = useI18n();

  const [options, setOptions] = useState<RouteOption[]>([]);
  const [gtfsImported, setGtfsImported] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    planRoute(request)
      .then((res) => {
        setOptions(res.options);
        setGtfsImported(res.gtfsImported);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [request]);

  return (
    <Screen scroll={false}>
      <ScreenHeader onBack={router.back} title={t('results.title')} subtitle={`${originLabel} → ${destinationLabel}`} />

      {!gtfsImported && !loading ? (
        <View style={styles.warning}>
          <AppText variant="caption" tone="secondary">
            {t('planner.gtfsNotImported')}
          </AppText>
        </View>
      ) : null}

      <FlatList
        data={options}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <RouteOptionCard
            option={item}
            onPress={() =>
              router.push({
                pathname: '/route-detail',
                params: { option: JSON.stringify(item), request: requestRaw, originLabel, destinationLabel },
              })
            }
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletons}>
              <Skeleton height={140} />
              <Skeleton height={140} />
            </View>
          ) : error ? (
            <ErrorState title={t('stop.loadError')} onRetry={load} />
          ) : (
            <EmptyState icon="map-marker-path" title={t('results.noOptions')} description={t('results.noOptionsDescription')} />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  warning: { paddingHorizontal: spacing.screen, marginBottom: spacing.sm },
  list: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl, paddingTop: spacing.sm },
  skeletons: { gap: spacing.md },
});
