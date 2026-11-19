import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText, Button, Icon, Screen, ScreenHeader, TextField, TimePicker } from '../components';
import { RoutePoint } from '../contexts/SavedRoutesContext';
import { useI18n } from '../contexts/LanguageContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLocation } from '../hooks/useLocation';
import { geocodeAddress, GeocodeResult, PlanRequest } from '../services/api';
import { radii, spacing } from '../tokens';
import { tap } from '../utils/haptics';

type TimeMode = 'now' | 'departAt' | 'arriveBy';

export function RoutePlannerScreen() {
  const { presetOrigin: presetOriginParam } = useLocalSearchParams<{ presetOrigin?: string }>();
  const presetOrigin: RoutePoint | null = presetOriginParam ? JSON.parse(presetOriginParam) : null;
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const { preferences } = usePreferences();
  const { location } = useLocation();

  const [origin, setOrigin] = useState<RoutePoint | null>(presetOrigin);
  const [originQuery, setOriginQuery] = useState(presetOrigin?.label ?? '');
  const [originResults, setOriginResults] = useState<GeocodeResult[]>([]);
  const [editingOrigin, setEditingOrigin] = useState(false);

  const [destination, setDestination] = useState<RoutePoint | null>(null);
  const [destQuery, setDestQuery] = useState('');
  const [destResults, setDestResults] = useState<GeocodeResult[]>([]);
  const [editingDest, setEditingDest] = useState(false);

  const [timeMode, setTimeMode] = useState<TimeMode>('now');
  const [chosenTime, setChosenTime] = useState<{ hour: number; minute: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [onlyAccessible, setOnlyAccessible] = useState(preferences.onlyAccessible);
  const [lessWalking, setLessWalking] = useState(preferences.lessWalking);
  const [originError, setOriginError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (location && !origin) setOrigin({ label: t('planner.originPlaceholder'), lat: location.lat, lng: location.lng });
  }, [location, origin, t]);

  useEffect(() => {
    const term = originQuery.trim();
    if (term.length < 3) {
      setOriginResults([]);
      return;
    }
    const timer = setTimeout(() => geocodeAddress(term).then(setOriginResults), 300);
    return () => clearTimeout(timer);
  }, [originQuery]);

  useEffect(() => {
    const term = destQuery.trim();
    if (term.length < 3) {
      setDestResults([]);
      return;
    }
    const timer = setTimeout(() => geocodeAddress(term).then(setDestResults), 300);
    return () => clearTimeout(timer);
  }, [destQuery]);

  const useMyLocation = () => {
    if (!location) return;
    setOrigin({ label: t('planner.originPlaceholder'), lat: location.lat, lng: location.lng });
    setOriginQuery('');
    setOriginResults([]);
    setEditingOrigin(false);
  };

  const pickOriginResult = (result: GeocodeResult) => {
    setOrigin(result);
    setOriginQuery(result.label);
    setOriginResults([]);
    setEditingOrigin(false);
  };

  const pickDestResult = (result: GeocodeResult) => {
    setDestination(result);
    setDestQuery(result.label);
    setDestResults([]);
    setEditingDest(false);
  };

  const timeLabel = () => {
    if (timeMode === 'now') return t('planner.departNow');
    const hhmm = chosenTime ? `${String(chosenTime.hour).padStart(2, '0')}:${String(chosenTime.minute).padStart(2, '0')}` : '--:--';
    return t(timeMode === 'departAt' ? 'planner.departAt' : 'planner.arriveBy', { time: hhmm });
  };

  const openTimePicker = (mode: TimeMode) => {
    tap();
    if (mode === 'now') {
      setTimeMode('now');
      return;
    }
    setTimeMode(mode);
    setPickerOpen(true);
  };

  // Se o campo já tem um ponto escolhido (toque numa sugestão, ou "minha localização"), usa ele.
  // Senão, se há texto digitado, geocodifica agora e pega o primeiro resultado (o mais relevante/
  // próximo) — sem isso, digitar um endereço e apertar "Buscar rotas" sem tocar numa sugestão não
  // fazia nada, silenciosamente.
  const resolvePoint = async (query: string, current: RoutePoint | null): Promise<RoutePoint | null> => {
    if (current) return current;
    const trimmed = query.trim();
    if (!trimmed) return null;
    const results = await geocodeAddress(trimmed);
    return results[0] ?? null;
  };

  const handleSubmit = async () => {
    setError('');
    setOriginError('');
    setSubmitting(true);
    try {
      const [resolvedOrigin, resolvedDestination] = await Promise.all([resolvePoint(originQuery, origin), resolvePoint(destQuery, destination)]);

      if (!resolvedDestination) {
        setError(t('planner.missingDestination'));
        tap('medium');
        return;
      }
      if (!resolvedOrigin) {
        setOriginError(t('planner.missingOrigin'));
        tap('medium');
        return;
      }

      setOrigin(resolvedOrigin);
      setDestination(resolvedDestination);

      const now = new Date();
      let departAt: string | undefined;
      let arriveBy: string | undefined;
      if (timeMode !== 'now' && chosenTime) {
        const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), chosenTime.hour, chosenTime.minute);
        if (target.getTime() < now.getTime()) target.setDate(target.getDate() + 1);
        if (timeMode === 'departAt') departAt = target.toISOString();
        else arriveBy = target.toISOString();
      }

      const request: PlanRequest = {
        origin: { lat: resolvedOrigin.lat, lng: resolvedOrigin.lng },
        destination: { lat: resolvedDestination.lat, lng: resolvedDestination.lng },
        departAt,
        arriveBy,
        onlyAccessible,
        lessWalking,
      };

      router.push({
        pathname: '/route-results',
        params: { request: JSON.stringify(request), originLabel: resolvedOrigin.label, destinationLabel: resolvedDestination.label },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader onBack={router.back} title={t('planner.title')} />

      <TextField
        label={t('planner.origin')}
        icon="map-marker-outline"
        placeholder={t('planner.originPlaceholder')}
        value={originQuery || origin?.label || ''}
        onChangeText={(v) => {
          setOriginQuery(v);
          setEditingOrigin(true);
          setOrigin(null);
          setOriginError('');
        }}
        onFocus={() => setEditingOrigin(true)}
        error={originError || undefined}
        accessibilityLabel={t('planner.origin')}
      />
      {editingOrigin && originResults.length > 0 ? (
        <View style={[styles.resultsBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {originResults.map((r, i) => (
            <ResultRow key={i} result={r} onPress={() => pickOriginResult(r)} />
          ))}
        </View>
      ) : null}
      {editingOrigin && location ? (
        <Pressable onPress={useMyLocation} style={styles.useLocationRow} accessibilityRole="button">
          <Icon name="crosshairs-gps" size={18} color={colors.primaryText} />
          <AppText variant="bodySm" tone="primary">
            {t('planner.useMyLocation')}
          </AppText>
        </Pressable>
      ) : null}

      <TextField
        label={t('planner.destination')}
        icon="map-marker"
        placeholder={t('planner.destinationPlaceholder')}
        value={destQuery}
        onChangeText={(v) => {
          setDestQuery(v);
          setEditingDest(true);
          setDestination(null);
          setError('');
        }}
        onFocus={() => setEditingDest(true)}
        error={error || undefined}
        accessibilityLabel={t('planner.destination')}
      />
      {editingDest && destResults.length > 0 ? (
        <View style={[styles.resultsBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {destResults.map((r, i) => (
            <ResultRow key={i} result={r} onPress={() => pickDestResult(r)} />
          ))}
        </View>
      ) : null}

      <AppText variant="label" style={styles.sectionLabel}>
        {t('planner.chooseTime')}
      </AppText>
      <View style={styles.timeRow}>
        <TimeChip label={t('planner.departNow')} active={timeMode === 'now'} onPress={() => openTimePicker('now')} />
        <TimeChip
          label={timeMode === 'departAt' ? timeLabel() : t('planner.departAtShort')}
          active={timeMode === 'departAt'}
          onPress={() => openTimePicker('departAt')}
        />
        <TimeChip
          label={timeMode === 'arriveBy' ? timeLabel() : t('planner.arriveByShort')}
          active={timeMode === 'arriveBy'}
          onPress={() => openTimePicker('arriveBy')}
        />
      </View>

      <View style={styles.switchRow}>
        <AppText variant="bodySm" style={styles.flex}>
          {t('planner.onlyAccessible')}
        </AppText>
        <Switch value={onlyAccessible} onValueChange={setOnlyAccessible} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} accessibilityLabel={t('planner.onlyAccessible')} />
      </View>
      <View style={styles.switchRow}>
        <AppText variant="bodySm" style={styles.flex}>
          {t('planner.lessWalking')}
        </AppText>
        <Switch value={lessWalking} onValueChange={setLessWalking} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} accessibilityLabel={t('planner.lessWalking')} />
      </View>

      <Button title={t('planner.submit')} onPress={handleSubmit} loading={submitting} style={styles.submit} />

      <TimePicker
        visible={pickerOpen}
        initialHour={new Date().getHours()}
        initialMinute={new Date().getMinutes()}
        onCancel={() => setPickerOpen(false)}
        onConfirm={(hour, minute) => {
          setChosenTime({ hour, minute });
          setPickerOpen(false);
        }}
      />
    </Screen>
  );
}

function ResultRow({ result, onPress }: { result: GeocodeResult; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={result.label} style={styles.resultRow}>
      <Icon name="map-marker-outline" size={18} color={colors.textSecondary} />
      <AppText variant="bodySm" numberOfLines={1} style={styles.flex}>
        {result.label}
      </AppText>
    </Pressable>
  );
}

function TimeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surfaceAlt, borderColor: colors.border }]}
    >
      <AppText variant="caption" color={active ? colors.onPrimary : colors.text} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  resultsBox: { borderWidth: 1, borderRadius: radii.sm, marginTop: -spacing.md, marginBottom: spacing.lg, overflow: 'hidden' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 48 },
  useLocationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: -spacing.md, marginBottom: spacing.lg, minHeight: 44 },
  sectionLabel: { marginBottom: spacing.sm },
  timeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  chip: { flex: 1, borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: spacing.sm, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md, minHeight: 44 },
  flex: { flex: 1 },
  submit: { marginTop: spacing.lg, marginBottom: spacing.xxl },
});
