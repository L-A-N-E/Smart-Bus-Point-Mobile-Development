import { useEffect, useState } from 'react';
import { Modal, Share, StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, ScreenHeader, TextField, TimelineLeg } from '../components';
import { Map, Marker, Polyline } from '../components/Map';
import { useActiveTrip } from '../contexts/ActiveTripContext';
import { useI18n } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { useSavedRoutes } from '../contexts/SavedRoutesContext';
import { useVehicles } from '../hooks/useVehicles';
import { RootStackScreenProps } from '../navigation/types';
import { BusLeg, StopRef } from '../services/api';
import { streetPathForWaypoints } from '../services/streetRouting';
import { palette, radii, spacing } from '../tokens';
import { formatCo2Saved } from '../utils/co2';
import { haversineMeters } from '../utils/geo';
import { tap } from '../utils/haptics';

function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function RouteDetailScreen({ route, navigation }: RootStackScreenProps<'RouteDetail'>) {
  const { option, request, originLabel, destinationLabel } = route.params;
  const { t } = useI18n();
  const { colors } = useTheme();
  const showToast = useToast();
  const { addRoute } = useSavedRoutes();
  const { startTrip } = useActiveTrip();

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [routeName, setRouteName] = useState('');

  const handleShare = async () => {
    tap();
    await Share.share({
      message: t('detail.shareMessage', { origin: originLabel, destination: destinationLabel, time: formatClock(option.arriveAt) }),
    });
  };

  const handleSave = () => {
    const name = routeName.trim() || `${originLabel} → ${destinationLabel}`;
    addRoute({
      name,
      origin: { label: originLabel, lat: request.origin.lat, lng: request.origin.lng },
      destination: { label: destinationLabel, lat: request.destination.lat, lng: request.destination.lng },
      preferences: { onlyAccessible: Boolean(request.onlyAccessible), lessWalking: Boolean(request.lessWalking) },
    });
    setSaveModalOpen(false);
    setRouteName('');
    showToast({ message: t('detail.saved'), icon: 'check-circle', tone: 'success' });
  };

  const handleStart = () => {
    tap('medium');
    startTrip(option, originLabel, destinationLabel);
    navigation.navigate('ActiveTrip', { option, originLabel, destinationLabel });
  };

  // Pontos de passagem do trajeto: origem -> embarque/desembarque de cada trecho de ônibus (na
  // ordem) -> destino. O traçado exibido no mapa (abaixo) segue as ruas reais entre esses pontos
  // em vez de linhas retas.
  const busLegs = option.legs.filter((l): l is BusLeg => l.type === 'bus');
  const waypoints = [
    { lat: request.origin.lat, lng: request.origin.lng },
    ...busLegs.flatMap((leg) => [
      { lat: leg.fromStop.lat, lng: leg.fromStop.lng },
      { lat: leg.toStop.lat, lng: leg.toStop.lng },
    ]),
    { lat: request.destination.lat, lng: request.destination.lng },
  ];
  const straightCoordinates = waypoints.map((w) => ({ latitude: w.lat, longitude: w.lng }));

  // Mostra a linha reta imediatamente (resposta instantânea) e troca pelo traçado real das ruas
  // (grafo do OpenStreetMap + Dijkstra, ver services/streetRouting.ts) assim que ele chegar.
  const [routeCoordinates, setRouteCoordinates] = useState(straightCoordinates);

  useEffect(() => {
    let active = true;
    streetPathForWaypoints(waypoints).then((path) => {
      if (active) setRouteCoordinates(path.map((p) => ({ latitude: p.lat, longitude: p.lng })));
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- waypoints vem de `option`/`request`, estáveis por navegação
  }, [option, request]);

  const lats = routeCoordinates.map((c) => c.latitude);
  const lngs = routeCoordinates.map((c) => c.longitude);
  const mapRegion = {
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
    longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    latitudeDelta: Math.max(0.01, (Math.max(...lats) - Math.min(...lats)) * 1.6),
    longitudeDelta: Math.max(0.01, (Math.max(...lngs) - Math.min(...lngs)) * 1.6),
  };

  return (
    <Screen scroll>
      <ScreenHeader onBack={navigation.goBack} title={t('detail.title')} subtitle={`${formatClock(option.departAt)} → ${formatClock(option.arriveAt)}`} />

      <View style={styles.mapWrap} accessible accessibilityLabel={t('a11y.map')}>
        <Map initialRegion={mapRegion} style={styles.map}>
          <Polyline coordinates={routeCoordinates} strokeColor={palette.teal} strokeWidth={4} />
          <Marker coordinate={straightCoordinates[0]} title={originLabel} pinColor={palette.teal} />
          <Marker coordinate={straightCoordinates[straightCoordinates.length - 1]} title={destinationLabel} pinColor={palette.terracota} />
          {busLegs.flatMap((leg, i) => [
            <Marker key={`board-${i}`} coordinate={{ latitude: leg.fromStop.lat, longitude: leg.fromStop.lng }} title={leg.fromStop.name} />,
            <Marker key={`alight-${i}`} coordinate={{ latitude: leg.toStop.lat, longitude: leg.toStop.lng }} title={leg.toStop.name} />,
          ])}
          {busLegs.map((leg, i) =>
            leg.vehiclesCode ? <NextBusMarker key={`vehicle-${i}`} vehiclesCode={leg.vehiclesCode} anchor={leg.fromStop} /> : null,
          )}
        </Map>
      </View>

      <View style={styles.timeline}>
        {option.legs.map((leg, i) => (
          <TimelineLeg key={i} leg={leg} isLast={i === option.legs.length - 1} />
        ))}
      </View>

      <AppText variant="caption" tone="tertiary" style={styles.co2}>
        {formatCo2Saved(option.co2SavedGrams)}
      </AppText>

      <View style={styles.actions}>
        <Button title={t('detail.saveRoute')} variant="secondary" icon="bookmark-outline" onPress={() => setSaveModalOpen(true)} />
        <Button title={t('detail.shareTrip')} variant="secondary" icon="share-variant-outline" onPress={handleShare} />
        <Button title={t('detail.startTrip')} icon="navigation-variant-outline" onPress={handleStart} />
      </View>

      <Modal visible={saveModalOpen} transparent animationType="fade" onRequestClose={() => setSaveModalOpen(false)}>
        <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
          <View style={[styles.saveCard, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityViewIsModal>
            <AppText variant="h3" style={styles.saveTitle}>
              {t('detail.saveRouteTitle')}
            </AppText>
            <AppText variant="bodySm" tone="secondary" style={styles.savePrompt}>
              {t('detail.saveRoutePrompt')}
            </AppText>
            <TextField
              placeholder={t('detail.saveRoutePlaceholder')}
              value={routeName}
              onChangeText={setRouteName}
              autoFocus
              accessibilityLabel={t('detail.saveRoutePrompt')}
            />
            <View style={styles.saveActions}>
              <Button title={t('common.cancel')} variant="secondary" onPress={() => setSaveModalOpen(false)} style={styles.flex} />
              <Button title={t('common.save')} onPress={handleSave} style={styles.flex} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

// Posição do ônibus mais próximo do embarque deste trecho — usa o polling já existente
// (useVehicles) em vez de buscar uma vez só, pra acompanhar a aproximação na própria tela.
function NextBusMarker({ vehiclesCode, anchor }: { vehiclesCode: number; anchor: StopRef }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { vehicles } = useVehicles(vehiclesCode);

  if (vehicles.length === 0) return null;

  const nearest = vehicles.reduce((best, v) =>
    haversineMeters(v.lat, v.lng, anchor.lat, anchor.lng) < haversineMeters(best.lat, best.lng, anchor.lat, anchor.lng) ? v : best,
  );

  return (
    <Marker coordinate={{ latitude: nearest.lat, longitude: nearest.lng }} title={t('detail.nextBusMarker')}>
      <View style={[styles.vehiclePin, { backgroundColor: nearest.accessible ? colors.success : colors.text }]}>
        <AppText variant="caption" color={nearest.accessible ? colors.onSuccess : colors.textInverse}>
          🚍
        </AppText>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  mapWrap: { height: 220, borderRadius: radii.lg, overflow: 'hidden', marginTop: spacing.sm },
  vehiclePin: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  map: { flex: 1 },
  timeline: { marginTop: spacing.lg },
  co2: { marginBottom: spacing.lg },
  actions: { gap: spacing.md, marginBottom: spacing.xxxl },
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  saveCard: { width: '100%', maxWidth: 360, borderRadius: radii.lg, borderWidth: 1, padding: spacing.xl },
  saveTitle: { marginBottom: spacing.sm },
  savePrompt: { marginBottom: spacing.lg },
  saveActions: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
