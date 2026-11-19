import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ArrivalRow, Button, EmptyState, ErrorState, Icon, IconButton, Screen, Skeleton } from '../components';
import { AppText } from '../components/AppText';
import { useFavorites } from '../contexts/FavoritesContext';
import { useI18n } from '../contexts/LanguageContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { useArrivals } from '../hooks/useArrivals';
import { getRecentReports, Report } from '../services/api';
import { isSpeaking, speak, stopSpeaking } from '../services/speech';
import { recordStopVisit } from '../services/stopHistoryDb';
import { spacing } from '../tokens';
import { tap } from '../utils/haptics';
import { formatCacheAge } from '../utils/time';

export function StopDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const { preferences, setPreference } = usePreferences();
  const { isFavorite, toggleFavorite } = useFavorites();
  const showToast = useToast();
  const [speaking, setSpeaking] = useState(false);

  const { stop, arrivals, loading, error, stale, lastUpdatedAt, refresh } = useArrivals(code, preferences.onlyAccessible);
  const [recentReports, setRecentReports] = useState<Report[]>([]);

  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    if (!stop) return;
    getRecentReports({ stopCode: stop.stop_code ?? code }).then(setRecentReports);
    recordStopVisit(stop.stop_code ?? code, stop.stop_name).catch(() => {});
  }, [stop, code]);

  const handleFavorite = () => {
    tap();
    toggleFavorite(code);
    showToast({
      message: t(isFavorite(code) ? 'stop.unfavorited' : 'stop.favorited'),
      icon: isFavorite(code) ? 'star-outline' : 'star',
      tone: 'success',
    });
  };

  const handleSpeak = async () => {
    if (await isSpeaking()) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    if (arrivals.length === 0) {
      speak(t('stop.speakNone'));
      return;
    }
    const sentence = arrivals
      .slice(0, 3)
      .map((a) =>
        t('stop.speakArrival', { line: a.line, destination: a.destination, minutes: a.minutes, confidence: t(`status.${a.confidence}`) }) +
        (a.accessible ? t('stop.speakArrival_accessible') : ''),
      )
      .join('. ');
    setSpeaking(true);
    speak(sentence);
  };

  const headerName = stop?.stop_name ?? t('stop.notFoundTitle');

  const handleTraceRoute = () => {
    if (!stop) return;
    tap();
    const presetOrigin = { label: stop.stop_name, lat: stop.stop_lat, lng: stop.stop_lon };
    router.push({ pathname: '/route-planner', params: { presetOrigin: JSON.stringify(presetOrigin) } });
  };

  const handleReport = () => {
    if (!stop) return;
    tap();
    router.push({ pathname: '/report', params: { stopCode: stop.stop_code ?? code } });
  };

  return (
    <Screen scroll={false} padded={false}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <IconButton name="arrow-left" accessibilityLabel={t('a11y.backButton')} onPress={router.back} />
        <View style={styles.headerText}>
          <AppText variant="h3" numberOfLines={1}>
            {headerName}
          </AppText>
          {stop?.stop_code ? (
            <AppText variant="caption" tone="secondary">
              {t('stop.code', { code: stop.stop_code })}
            </AppText>
          ) : null}
        </View>
        {stop ? (
          <IconButton
            name={isFavorite(code) ? 'star' : 'star-outline'}
            accessibilityLabel={t(isFavorite(code) ? 'stop.unfavorite' : 'stop.favorite')}
            color={isFavorite(code) ? colors.primaryText : colors.text}
            onPress={handleFavorite}
          />
        ) : null}
      </View>

      {stop ? (
        <View style={[styles.actionsRow, { borderBottomColor: colors.border }]}>
          <IconButton
            name={speaking ? 'volume-off' : 'volume-high'}
            accessibilityLabel={t(speaking ? 'stop.stopSpeaking' : 'stop.speak')}
            variant="soft"
            onPress={handleSpeak}
          />
          <View style={styles.filterRow}>
            <AppText variant="bodySm" style={styles.flex}>
              {t('stop.filterAccessibleOnly')}
            </AppText>
            <Switch
              value={preferences.onlyAccessible}
              onValueChange={(v) => setPreference('onlyAccessible', v)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
              accessibilityLabel={t('stop.filterAccessibleOnly')}
            />
          </View>
        </View>
      ) : null}

      {stop && recentReports.length > 0 ? (
        <Pressable onPress={handleReport} style={[styles.reportsBanner, { backgroundColor: colors.surfaceAlt }]} accessibilityRole="button">
          <Icon name="alert-outline" size={16} color={colors.dangerText} />
          <AppText variant="bodySm" tone="secondary" style={styles.flex}>
            {t('report.recentTitle')} ({recentReports.length})
          </AppText>
        </Pressable>
      ) : null}

      <FlatList
        data={stop ? arrivals : []}
        keyExtractor={(item, index) => `${item.line}-${index}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <ArrivalRow arrival={item} />}
        ListHeaderComponent={
          stop ? (
            <AppText variant="label" tone="secondary" style={styles.sectionLabel}>
              {t('stop.arrivalsTitle')}
            </AppText>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletons}>
              <Skeleton height={64} style={styles.skeletonItem} />
              <Skeleton height={64} style={styles.skeletonItem} />
              <Skeleton height={64} style={styles.skeletonItem} />
            </View>
          ) : !stop ? (
            <EmptyState icon="map-marker-off-outline" title={t('stop.notFoundTitle')} description={t('stop.notFoundDescription')} />
          ) : error ? (
            <ErrorState
              title={t('stop.loadError')}
              onRetry={refresh}
              cacheAgeLabel={lastUpdatedAt ? formatCacheAge(Date.now() - lastUpdatedAt) : undefined}
            />
          ) : (
            <EmptyState icon="bus-alert" title={t('stop.noArrivals')} description={t('stop.noArrivalsDescription')} />
          )
        }
      />

      {stop ? (
        <View style={[styles.footerActions, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <Button title={t('stop.traceRoute')} variant="secondary" icon="map-marker-path" onPress={handleTraceRoute} style={styles.flex} />
          <Button title={t('stop.reportProblem')} variant="outline" icon="alert-outline" onPress={handleReport} style={styles.flex} />
        </View>
      ) : null}
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
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  filterRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  listContent: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl, flexGrow: 1 },
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.xs },
  skeletons: { gap: spacing.md, marginTop: spacing.lg },
  skeletonItem: { borderRadius: 12 },
  footerActions: { flexDirection: 'row', gap: spacing.md, padding: spacing.screen, borderTopWidth: 1 },
  reportsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.screen,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 10,
  },
});
