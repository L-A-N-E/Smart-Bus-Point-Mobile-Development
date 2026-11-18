import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, Icon, IconName, LineChip, Screen, ScreenHeader, Skeleton, TextField } from '../components';
import { useI18n } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { TouristSpot, TouristSpotCategory, touristSpots } from '../data/touristSpots';
import { useLocation } from '../hooks/useLocation';
import { useNearbyStops } from '../hooks/useNearbyStops';
import { AppTabScreenProps } from '../navigation/types';
import { LineResult, NearbyStop, PlanRequest, searchLines, searchStops, Stop } from '../services/api';
import { spacing } from '../tokens';
import { formatDistance } from '../utils/geo';

const categoryIcons: Record<TouristSpotCategory, IconName> = {
  stadium: 'stadium',
  museum: 'bank',
  monument: 'pillar',
};

type ResultRow =
  | { kind: 'stop'; stop: Stop }
  | { kind: 'line'; line: LineResult };

export function ExploreScreen({ navigation }: AppTabScreenProps<'Explore'>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const showToast = useToast();
  const { location } = useLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResultRow[]>([]);
  const [searching, setSearching] = useState(false);

  const { stops: nearbyStops, loading: nearbyLoading, permissionDenied, error: nearbyError, refresh: refreshNearby } = useNearbyStops();

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      Promise.all([searchStops(term), searchLines(term)])
        .then(([stopMatches, lineMatches]) => {
          setResults([
            ...lineMatches.map((line): ResultRow => ({ kind: 'line', line })),
            ...stopMatches.map((stop): ResultRow => ({ kind: 'stop', stop })),
          ]);
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const openStop = (code: string) => navigation.getParent()?.navigate('StopDetail', { code });
  const openLine = (line: LineResult) =>
    navigation.getParent()?.navigate('LineDetail', {
      routeId: line.routeId,
      vehiclesCode: line.vehiclesCode,
      shortName: line.shortName ?? '?',
      destination: line.destination ?? '',
      origin: line.origin ?? '',
    });

  const openTouristSpot = (spot: TouristSpot) => {
    if (!location) {
      showToast({ message: t('explore.touristNoLocation'), icon: 'map-marker-off-outline', tone: 'danger' });
      return;
    }
    const request: PlanRequest = { origin: { lat: location.lat, lng: location.lng }, destination: { lat: spot.lat, lng: spot.lng } };
    navigation.getParent()?.navigate('RouteResults', { request, originLabel: t('planner.originPlaceholder'), destinationLabel: spot.name });
  };

  const showingSearch = query.trim().length >= 2;

  return (
    <Screen scroll={false}>
      <ScreenHeader title={t('tabs.Explore')} logo />

      <TextField
        icon="magnify"
        placeholder={t('explore.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={t('explore.searchPlaceholder')}
      />

      {showingSearch ? (
        <FlatList
          data={results}
          keyExtractor={(item, index) => (item.kind === 'stop' ? `s-${item.stop.stop_id}` : `l-${item.line.routeId}`) + index}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) =>
            item.kind === 'stop' ? (
              <StopRow stop={item.stop} onPress={() => openStop(item.stop.stop_code ?? item.stop.stop_id)} />
            ) : (
              <LineRow line={item.line} onPress={() => openLine(item.line)} />
            )
          }
          ListEmptyComponent={
            searching ? (
              <View style={styles.skeletons}>
                <Skeleton height={56} />
                <Skeleton height={56} />
              </View>
            ) : (
              <EmptyState icon="magnify" title={t('explore.noResults', { query: query.trim() })} />
            )
          }
        />
      ) : (
        <FlatList
          data={nearbyStops}
          keyExtractor={(item) => item.stop_id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <AppText variant="label" tone="secondary" style={styles.sectionLabel}>
                {t('explore.touristTitle')}
              </AppText>
              <FlatList
                data={touristSpots}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.touristList}
                renderItem={({ item }) => <TouristSpotCard spot={item} onPress={() => openTouristSpot(item)} />}
              />
              <AppText variant="label" tone="secondary" style={styles.sectionLabel}>
                {t('explore.nearbyTitle')}
              </AppText>
            </>
          }
          renderItem={({ item }) => <NearbyStopRow stop={item} onPress={() => openStop(item.stop_code ?? item.stop_id)} />}
          ListEmptyComponent={
            nearbyLoading ? (
              <View style={styles.skeletons}>
                <Skeleton height={56} />
                <Skeleton height={56} />
                <Skeleton height={56} />
              </View>
            ) : permissionDenied || nearbyError ? (
              <EmptyState icon="map-marker-off-outline" title={t('explore.locationError')}>
                <Button title={t('explore.locationPermission')} variant="secondary" onPress={refreshNearby} />
              </EmptyState>
            ) : (
              <EmptyState icon="bus-stop" title={t('explore.noResults', { query: '' })} />
            )
          }
        />
      )}
    </Screen>
  );
}

function StopRow({ stop, onPress }: { stop: Stop; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={stop.stop_name} style={styles.row}>
      <Icon name="bus-stop" size={22} color={colors.primaryText} />
      <AppText variant="body" style={styles.flex} numberOfLines={1}>
        {stop.stop_name}
      </AppText>
      <Icon name="chevron-right" size={20} color={colors.textTertiary} />
    </Card>
  );
}

function NearbyStopRow({ stop, onPress }: { stop: NearbyStop; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={`${stop.stop_name}, ${formatDistance(stop.distance_m)}`} style={styles.row}>
      <Icon name="bus-stop" size={22} color={colors.primaryText} />
      <View style={styles.flex}>
        <AppText variant="body" numberOfLines={1}>
          {stop.stop_name}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {formatDistance(stop.distance_m)}
        </AppText>
      </View>
      <Icon name="chevron-right" size={20} color={colors.textTertiary} />
    </Card>
  );
}

function TouristSpotCard({ spot, onPress }: { spot: TouristSpot; onPress: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={`${spot.name}, ${t(`explore.category.${spot.category}`)}`} style={styles.touristCard}>
      <View style={[styles.touristIcon, { backgroundColor: colors.primarySoft }]}>
        <Icon name={categoryIcons[spot.category]} size={22} color={colors.primaryText} />
      </View>
      <AppText variant="bodySm" numberOfLines={1}>
        {spot.name}
      </AppText>
      <AppText variant="caption" tone="secondary" numberOfLines={1}>
        {t(`explore.category.${spot.category}`)}
      </AppText>
    </Card>
  );
}

function LineRow({ line, onPress }: { line: LineResult; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={`${line.shortName}, ${line.longName}`} style={styles.row}>
      <LineChip label={line.shortName ?? '?'} />
      <AppText variant="body" style={styles.flex} numberOfLines={1}>
        {line.longName}
      </AppText>
      <Icon name="chevron-right" size={20} color={colors.textTertiary} />
    </Card>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.sm },
  sectionLabel: { marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  flex: { flex: 1 },
  skeletons: { gap: spacing.sm, marginTop: spacing.sm },
  touristList: { gap: spacing.sm, paddingBottom: spacing.lg },
  touristCard: { width: 128, alignItems: 'flex-start', gap: spacing.xs },
  touristIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
});
