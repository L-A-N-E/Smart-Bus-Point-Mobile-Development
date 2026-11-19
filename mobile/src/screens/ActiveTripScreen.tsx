import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccessibleBadge, AppText, Button, Dialog, EmptyState, Icon, Screen, ScreenHeader, StatusBadge } from '../components';
import { useActiveTrip } from '../contexts/ActiveTripContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/LanguageContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useTheme } from '../contexts/ThemeContext';
import { BusLeg, RouteOption } from '../services/api';
import { notifyDescent } from '../services/notifications';
import { speak } from '../services/speech';
import { spacing } from '../tokens';
import { haversineMeters } from '../utils/geo';
import { notifyWarning, tap } from '../utils/haptics';
import { recordCompletedTrip } from '../utils/stats';

const APPROACH_METERS = 150;
const ARRIVED_METERS = 40;

function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function isBusLeg(leg: RouteOption['legs'][number]): leg is BusLeg {
  return leg.type === 'bus';
}

type Phase = 'approaching' | 'arrived' | 'waiting';

export function ActiveTripScreen() {
  const { option: optionRaw, originLabel, destinationLabel } = useLocalSearchParams<{
    option: string;
    originLabel: string;
    destinationLabel: string;
  }>();
  const option = useMemo<RouteOption>(() => JSON.parse(optionRaw), [optionRaw]);
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const { preferences } = usePreferences();
  const { endTrip } = useActiveTrip();
  const { user } = useAuth();

  const busLegs = option.legs.filter(isBusLeg);
  const [legIndex, setLegIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('waiting');
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);

  const alertedApproaching = useRef(false);
  const alertedArrived = useRef(false);

  const currentLeg = busLegs[legIndex] ?? null;
  const finished = legIndex >= busLegs.length;

  useEffect(() => {
    alertedApproaching.current = false;
    alertedArrived.current = false;
    setPhase('waiting');
    setBannerMessage(null);
  }, [legIndex]);

  useEffect(() => {
    if (!currentLeg) return;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(true);
        return;
      }
      subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 15, timeInterval: 5000 }, (position) => {
        const distance = haversineMeters(position.coords.latitude, position.coords.longitude, currentLeg.toStop.lat, currentLeg.toStop.lng);
        setDistanceMeters(Math.round(distance));

        if (distance <= ARRIVED_METERS && !alertedArrived.current) {
          alertedArrived.current = true;
          setPhase('arrived');
          fireAlert('arrived', currentLeg.toStop.name);
        } else if (distance <= APPROACH_METERS && !alertedApproaching.current) {
          alertedApproaching.current = true;
          setPhase('approaching');
          fireAlert('approaching', currentLeg.toStop.name);
        }
      });
    })();

    return () => subscription?.remove();
  }, [currentLeg]);

  const fireAlert = async (kind: 'approaching' | 'arrived', stopName: string) => {
    notifyWarning();
    const title = t(kind === 'arrived' ? 'trip.descentArrivedTitle' : 'trip.descentAlertTitle');
    const body = t(kind === 'arrived' ? 'trip.descentArrivedBody' : 'trip.descentAlertBody', { stop: stopName });

    if (preferences.descentAlerts) {
      await notifyDescent(title, body);
    }
    // Sempre mostra o alerta dentro do app também: notificação do sistema pode não aparecer com
    // o app em primeiro plano (comportamento varia por plataforma), e no Expo Go Android nem existe.
    setBannerMessage(body);
    if (preferences.voiceEnabled) speak(body);
  };

  const advanceLeg = () => {
    tap('medium');
    setLegIndex((i) => i + 1);
  };

  const handleEndTrip = (completed: boolean) => {
    if (completed && user) recordCompletedTrip(user.id, option.co2SavedGrams);
    endTrip();
    router.replace('/(tabs)');
  };

  const nextActionText = () => {
    if (finished) return t('trip.arrived', { stop: destinationLabel });
    if (!currentLeg) return '';
    if (phase === 'arrived') return t('trip.arrived', { stop: currentLeg.toStop.name });
    if (phase === 'approaching') return t('trip.approaching', { stop: currentLeg.toStop.name });
    return t('trip.onBoard', { line: currentLeg.line });
  };

  return (
    <Screen scroll>
      <ScreenHeader title={t('trip.title')} subtitle={`${originLabel} → ${destinationLabel}`} />

      {bannerMessage ? (
        <View style={[styles.banner, { backgroundColor: colors.dangerSoft }]} accessibilityLiveRegion="assertive">
          <Icon name="bell-ring-outline" size={20} color={colors.dangerText} />
          <AppText variant="bodySm" tone="danger" style={styles.flex}>
            {bannerMessage}
          </AppText>
        </View>
      ) : null}

      {locationError ? (
        <EmptyState icon="crosshairs-off" title={t('trip.locationError')} />
      ) : finished ? (
        <View style={styles.finishedWrap}>
          <Icon name="flag-checkered" size={40} color={colors.successText} />
          <AppText variant="h2" align="center" style={styles.finishedTitle}>
            {t('trip.arrived', { stop: destinationLabel })}
          </AppText>
        </View>
      ) : currentLeg ? (
        <View style={styles.card}>
          <AppText variant="label" tone="secondary" style={styles.nextActionLabel}>
            {t('trip.nextAction')}
          </AppText>
          <AppText variant="h2" style={styles.nextAction}>
            {nextActionText()}
          </AppText>

          <View style={styles.metaRow}>
            <StatusBadge tone={currentLeg.confidence} />
            <AccessibleBadge accessible={currentLeg.accessible} />
          </View>

          <View style={styles.row}>
            <AppText variant="bodySm" tone="secondary" style={styles.flex}>
              {currentLeg.line} · {formatClock(currentLeg.departAt)} → {formatClock(currentLeg.arriveAt)}
            </AppText>
          </View>

          {distanceMeters !== null ? (
            <AppText variant="caption" tone="tertiary">
              {Math.round(distanceMeters)} {t('common.meters')}
            </AppText>
          ) : null}

          {phase === 'arrived' ? (
            <Button
              title={legIndex + 1 < busLegs.length ? t('common.confirm') : t('trip.endTrip')}
              onPress={legIndex + 1 < busLegs.length ? advanceLeg : () => handleEndTrip(true)}
              style={styles.advanceButton}
            />
          ) : null}
        </View>
      ) : null}

      <Button title={t('trip.endTrip')} variant="outline" onPress={() => setEndConfirmOpen(true)} style={styles.endButton} />

      <Dialog
        visible={endConfirmOpen}
        icon="close-circle-outline"
        title={t('trip.endConfirmTitle')}
        message={t('trip.endConfirmMessage')}
        confirmLabel={t('trip.endTrip')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={() => {
          setEndConfirmOpen(false);
          handleEndTrip(false);
        }}
        onCancel={() => setEndConfirmOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: 12, marginBottom: spacing.lg },
  flex: { flex: 1 },
  card: { marginTop: spacing.sm },
  nextActionLabel: { marginBottom: spacing.xs },
  nextAction: { marginBottom: spacing.md },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  row: { marginBottom: spacing.sm },
  advanceButton: { marginTop: spacing.lg },
  finishedWrap: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.md },
  finishedTitle: {},
  endButton: { marginTop: spacing.xxxl, marginBottom: spacing.xl },
});
