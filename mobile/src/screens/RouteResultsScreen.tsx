import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppText, EmptyState, ErrorState, RouteOptionCard, Screen, ScreenHeader, Skeleton } from '../components';
import { useI18n } from '../contexts/LanguageContext';
import { RootStackScreenProps } from '../navigation/types';
import { planRoute, RouteOption } from '../services/api';
import { spacing } from '../tokens';

export function RouteResultsScreen({ route, navigation }: RootStackScreenProps<'RouteResults'>) {
  const { request, originLabel, destinationLabel } = route.params;
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
      <ScreenHeader onBack={navigation.goBack} title={t('results.title')} subtitle={`${originLabel} → ${destinationLabel}`} />

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
            onPress={() => navigation.navigate('RouteDetail', { option: item, request, originLabel, destinationLabel })}
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
