import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Icon, Screen, ScreenHeader } from '../components';
import { TranslationKey } from '../i18n';
import { useI18n } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { createReport, getRecentReports, Report } from '../services/api';
import { radii, spacing } from '../tokens';
import { tap } from '../utils/haptics';

const CROWDING_VALUES = ['empty', 'medium', 'full'] as const;
const PROBLEM_VALUES = ['no_show', 'not_accessible', 'delay'] as const;

// t() exige chaves literais (verificadas em tempo de compilação) — por isso um mapa explícito
// em vez de montar a chave com template string a partir do valor salvo no relato.
const REPORT_VALUE_KEY: Record<string, TranslationKey> = {
  'crowding:empty': 'report.crowding.empty',
  'crowding:medium': 'report.crowding.medium',
  'crowding:full': 'report.crowding.full',
  'problem:no_show': 'report.problem.no_show',
  'problem:not_accessible': 'report.problem.not_accessible',
  'problem:delay': 'report.problem.delay',
};

function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function ReportScreen() {
  const { stopCode, line } = useLocalSearchParams<{ stopCode?: string; line?: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const showToast = useToast();

  const [crowding, setCrowding] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [recent, setRecent] = useState<Report[]>([]);
  const [sending, setSending] = useState(false);

  const load = () => {
    getRecentReports({ stopCode, line }).then(setRecent);
  };
  useEffect(load, [stopCode, line]);

  const handleSubmit = async () => {
    if (!crowding && !problem) return;
    tap('medium');
    setSending(true);
    try {
      if (crowding) await createReport({ stopCode, line, type: 'crowding', value: crowding });
      if (problem) await createReport({ stopCode, line, type: 'problem', value: problem });
      showToast({ message: t('report.sent'), icon: 'check-circle', tone: 'success' });
      setCrowding(null);
      setProblem(null);
      load();
      router.back();
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader onBack={router.back} title={t('report.title')} />

      <AppText variant="label" style={styles.sectionLabel}>
        {t('report.crowdingTitle')}
      </AppText>
      <View style={styles.optionsRow}>
        {CROWDING_VALUES.map((value) => (
          <OptionChip key={value} label={t(`report.crowding.${value}`)} active={crowding === value} onPress={() => setCrowding((c) => (c === value ? null : value))} />
        ))}
      </View>

      <AppText variant="label" style={styles.sectionLabel}>
        {t('report.problemTitle')}
      </AppText>
      <View style={styles.optionsRow}>
        {PROBLEM_VALUES.map((value) => (
          <OptionChip key={value} label={t(`report.problem.${value}`)} active={problem === value} onPress={() => setProblem((p) => (p === value ? null : value))} />
        ))}
      </View>

      <AppText variant="caption" tone="tertiary" style={styles.anonymousNote}>
        {t('report.anonymousNote')}
      </AppText>

      <Button title={t('report.submit')} onPress={handleSubmit} loading={sending} disabled={!crowding && !problem} style={styles.submit} />

      <AppText variant="label" tone="secondary" style={styles.sectionLabel}>
        {t('report.recentTitle')}
      </AppText>
      <FlatList
        data={recent}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={[styles.recentRow, { borderBottomColor: colors.border }]}>
            <Icon name={item.type === 'crowding' ? 'account-group-outline' : 'alert-outline'} size={16} color={colors.textSecondary} />
            <AppText variant="bodySm" style={styles.flex}>
              {t(REPORT_VALUE_KEY[`${item.type}:${item.value}`] ?? 'report.title')}
            </AppText>
            <AppText variant="caption" tone="tertiary">
              {formatClock(item.createdAt)}
            </AppText>
          </View>
        )}
        ListEmptyComponent={
          <AppText variant="bodySm" tone="tertiary">
            {t('report.noRecent')}
          </AppText>
        }
      />
    </Screen>
  );
}

function OptionChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surfaceAlt, borderColor: colors.border }]}
    >
      <AppText variant="label" color={active ? colors.onPrimary : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, minHeight: 44, borderRadius: radii.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  anonymousNote: { marginTop: spacing.lg },
  submit: { marginTop: spacing.lg, marginBottom: spacing.xl },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  flex: { flex: 1 },
});
