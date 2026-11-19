import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AccessibleBadge, AppText, IconButton, Screen, Skeleton } from '../components';
import { Map, Marker, Polyline } from '../components/Map';
import { useI18n } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useVehicles } from '../hooks/useVehicles';
import { getLineSchedule, getLineShape, ShapePoint } from '../services/api';
import { palette, spacing } from '../tokens';
import { tap } from '../utils/haptics';

export function LineDetailScreen() {
  const { routeId, vehiclesCode: vehiclesCodeParam, shortName, destination, origin } = useLocalSearchParams<{
    routeId: string;
    vehiclesCode: string;
    shortName: string;
    destination: string;
    origin: string;
  }>();
  const vehiclesCode = vehiclesCodeParam ? Number(vehiclesCodeParam) : null;
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();

  const [direction, setDirection] = useState<0 | 1>(0);
  const [shape, setShape] = useState<ShapePoint[]>([]);
  const [schedule, setSchedule] = useState<string[]>([]);
  const [loadingShape, setLoadingShape] = useState(true);

  const { vehicles } = useVehicles(vehiclesCode);

  useEffect(() => {
    setLoadingShape(true);
    Promise.all([getLineShape(routeId, direction), getLineSchedule(routeId, direction)])
      .then(([shapePoints, times]) => {
        setShape(shapePoints);
        setSchedule(times);
      })
      .finally(() => setLoadingShape(false));
  }, [routeId, direction]);

  const toggleDirection = () => {
    tap();
    setDirection((d) => (d === 0 ? 1 : 0));
  };

  const currentDestination = direction === 0 ? destination : origin;
  const coordinates = shape.map((p) => ({ latitude: p.shape_pt_lat, longitude: p.shape_pt_lon }));
  const initialRegion = coordinates[0]
    ? { latitude: coordinates[0].latitude, longitude: coordinates[0].longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : undefined;

  return (
    <Screen scroll={false} padded={false}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <IconButton name="arrow-left" accessibilityLabel={t('a11y.backButton')} onPress={router.back} />
        <View style={styles.headerText}>
          <AppText variant="h3" numberOfLines={1}>
            {shortName}
          </AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {t('line.toward', { destination: currentDestination })}
          </AppText>
        </View>
        <IconButton name="swap-horizontal" accessibilityLabel={t('line.directionSwitch')} onPress={toggleDirection} />
      </View>

      <View style={styles.mapWrap} accessible accessibilityLabel={t('a11y.map')}>
        {loadingShape ? (
          <Skeleton height={240} radius={0} />
        ) : (
          <Map initialRegion={initialRegion}>
            {coordinates.length > 1 ? <Polyline coordinates={coordinates} strokeColor={palette.teal} strokeWidth={4} /> : null}
            {vehicles.map((v) => (
              <Marker key={v.prefix} coordinate={{ latitude: v.lat, longitude: v.lng }} title={v.prefix}>
                <View style={[styles.vehiclePin, { backgroundColor: v.accessible ? colors.success : colors.text }]}>
                  <AppText variant="caption" color={v.accessible ? colors.onSuccess : colors.textInverse}>
                    🚍
                  </AppText>
                </View>
              </Marker>
            ))}
          </Map>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.vehiclesRow}>
          <AppText variant="label">
            {vehicles.length > 0 ? t(vehicles.length === 1 ? 'line.vehicles_one' : 'line.vehicles_other', { count: vehicles.length }) : t('line.noVehicles')}
          </AppText>
        </View>

        {vehicles.length > 0 ? (
          <View style={styles.vehicleList}>
            {vehicles.map((v) => (
              <View key={v.prefix} style={[styles.vehicleRow, { borderBottomColor: colors.border }]}>
                <AppText variant="bodySm">{v.prefix}</AppText>
                <AccessibleBadge accessible={v.accessible} />
              </View>
            ))}
          </View>
        ) : null}

        <AppText variant="h3" style={styles.scheduleTitle}>
          {t('line.schedule')}
        </AppText>
        {schedule.length > 0 ? (
          <View style={styles.scheduleGrid}>
            {schedule.map((time) => (
              <View key={time} style={[styles.scheduleChip, { backgroundColor: colors.surfaceAlt }]}>
                <AppText variant="bodySm">{time}</AppText>
              </View>
            ))}
          </View>
        ) : (
          <AppText variant="bodySm" tone="secondary">
            {t('line.noSchedule')}
          </AppText>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  headerText: { flex: 1 },
  mapWrap: { height: 240 },
  vehiclePin: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.screen, paddingBottom: spacing.xxxl },
  vehiclesRow: { marginBottom: spacing.sm },
  vehicleList: { marginBottom: spacing.lg },
  vehicleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1 },
  scheduleTitle: { marginBottom: spacing.md },
  scheduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  scheduleChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 10 },
});
