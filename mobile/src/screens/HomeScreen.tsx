import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { AppText, Card, EmptyState, Icon, IconName, Screen } from '../components';
import { Map, Marker } from '../components/Map';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useI18n } from '../contexts/LanguageContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLocation } from '../hooks/useLocation';
import { useNearbyStops } from '../hooks/useNearbyStops';
import { AppTabScreenProps } from '../navigation/types';
import { Arrival, getArrivals, getStopByCode, Stop } from '../services/api';
import { getHourlyForecast, isRainySoon } from '../services/weather';
import { palette, radii, spacing } from '../tokens';
import { tap } from '../utils/haptics';

export function HomeScreen({ navigation }: AppTabScreenProps<'Home'>) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { favoriteCodes } = useFavorites();
  const { preferences } = usePreferences();
  const { location } = useLocation();
  const { colors } = useTheme();
  const { stops: nearbyStops, permissionDenied: nearbyPermissionDenied } = useNearbyStops();

  const [rainPercent, setRainPercent] = useState<number | null>(null);

  useEffect(() => {
    if (!location || !preferences.rainAlerts) return;
    getHourlyForecast(location.lat, location.lng)
      .then((hours) => {
        const rain = isRainySoon(hours);
        setRainPercent(rain ? rain.precipitationProbability : null);
      })
      .catch(() => setRainPercent(null));
  }, [location, preferences.rainAlerts]);

  const openStop = (code: string) => navigation.getParent()?.navigate('StopDetail', { code });
  const openScanner = () => navigation.getParent()?.navigate('ScanQr');

  return (
    <Screen scroll>
      <View style={styles.greetingRow}>
        <Image source={require('../../assets/logo-sbp.png')} style={styles.logo} />
        <AppText variant="h1" style={styles.flex}>
          {t('home.greeting', { name: user?.name?.split(' ')[0] ?? '' })}
        </AppText>
      </View>

      {rainPercent !== null ? (
        <Card style={styles.alertCard}>
          <Icon name="weather-rainy" size={22} color={colors.primaryText} />
          <AppText variant="bodySm" style={styles.flex}>
            {t('weather.rainWarning', { percent: rainPercent })}
          </AppText>
        </Card>
      ) : null}

      {!nearbyPermissionDenied && location ? (
        <View style={styles.mapWrap} accessible accessibilityLabel={t('explore.nearbyTitle')}>
          <Map
            style={styles.map}
            initialRegion={{ latitude: location.lat, longitude: location.lng, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
          >
            {nearbyStops.map((stop) => (
              <Marker
                key={stop.stop_id}
                coordinate={{ latitude: stop.stop_lat, longitude: stop.stop_lon }}
                title={stop.stop_name}
                pinColor={palette.teal}
                onPress={() => {
                  tap();
                  openStop(stop.stop_code ?? stop.stop_id);
                }}
              />
            ))}
          </Map>
        </View>
      ) : null}

      <View style={styles.shortcutsRow}>
        <ShortcutButton icon="qrcode-scan" label={t('home.scanShortcut')} onPress={openScanner} />
        <ShortcutButton icon="map-marker-radius-outline" label={t('home.nearbyShortcut')} onPress={() => navigation.navigate('Explore')} />
      </View>

      <AppText variant="h3" style={styles.sectionTitle}>
        {t('home.favoritesTitle')}
      </AppText>

      {favoriteCodes.length === 0 ? (
        <EmptyState icon="star-outline" title={t('home.noFavoritesTitle')} description={t('home.noFavoritesDescription')} />
      ) : (
        <View style={styles.favoritesList}>
          {favoriteCodes.map((code) => (
            <FavoriteStopCard key={code} code={code} onPress={() => openStop(code)} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function ShortcutButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={label} style={styles.shortcut}>
      <View style={[styles.shortcutIcon, { backgroundColor: colors.primarySoft }]}>
        <Icon name={icon} size={24} color={colors.primaryText} />
      </View>
      <AppText variant="label" align="center">
        {label}
      </AppText>
    </Card>
  );
}

function FavoriteStopCard({ code, onPress }: { code: string; onPress: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [stop, setStop] = useState<Stop | null>(null);
  const [arrival, setArrival] = useState<Arrival | null>(null);

  useEffect(() => {
    let active = true;
    getStopByCode(code).then((s) => active && setStop(s));
    getArrivals(code, false).then((data) => {
      if (active) setArrival(data.arrivals[0] ?? null);
    });
    return () => {
      active = false;
    };
  }, [code]);

  return (
    <Card onPress={onPress} accessibilityLabel={stop?.stop_name ?? code} style={styles.favoriteCard}>
      <Icon name="star" size={20} color={colors.primaryText} />
      <View style={styles.flex}>
        <AppText variant="body" numberOfLines={1}>
          {stop?.stop_name ?? code}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {arrival ? t('home.nextArrival', { minutes: arrival.minutes, line: arrival.line }) : t('home.noArrivalShort')}
        </AppText>
      </View>
      <Icon name="chevron-right" size={20} color={colors.textTertiary} />
    </Card>
  );
}

const styles = StyleSheet.create({
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  logo: { width: 40, height: 40 },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  mapWrap: { height: 180, borderRadius: radii.lg, overflow: 'hidden', marginBottom: spacing.xl },
  map: { flex: 1 },
  shortcutsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  shortcut: { flex: 1, alignItems: 'center', gap: spacing.sm },
  shortcutIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { marginBottom: spacing.md },
  favoritesList: { gap: spacing.sm, marginBottom: spacing.xl },
  favoriteCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
});
