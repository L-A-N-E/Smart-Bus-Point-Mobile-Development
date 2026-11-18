import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Switch, View } from 'react-native';

import { AppText, Card, Dialog, Icon, Screen, SectionHeader } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useI18n } from '../contexts/LanguageContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useSavedRoutes } from '../contexts/SavedRoutesContext';
import { ThemePreference, useTheme } from '../contexts/ThemeContext';
import { Language, languageNames, LANGUAGES } from '../i18n';
import { spacing } from '../tokens';
import { formatWeight } from '../utils/co2';
import { getTripStats, TripStats } from '../utils/stats';

export function ProfileScreen() {
  const { user, signOut, deleteAccount } = useAuth();
  const { t, tn, language, setLanguage } = useI18n();
  const { colors, preference, setPreference, highContrast, setHighContrast } = useTheme();
  const { preferences, setPreference: setAppPreference } = usePreferences();
  const { favoriteCodes } = useFavorites();
  const { routes: savedRoutes } = useSavedRoutes();

  const [signOutOpen, setSignOutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [stats, setStats] = useState<TripStats>({ trips: 0, co2Grams: 0 });

  useEffect(() => {
    if (user) getTripStats(user.id).then(setStats);
  }, [user]);

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: t('profile.themeLight') },
    { value: 'dark', label: t('profile.themeDark') },
    { value: 'system', label: t('profile.themeSystem') },
  ];

  const handleExport = async () => {
    const data = {
      account: user,
      favorites: favoriteCodes,
      savedRoutes,
      preferences,
      stats,
      exportedAt: new Date().toISOString(),
    };
    await Share.share({ message: JSON.stringify(data, null, 2) });
  };

  const handleDeleteAccount = () => {
    setDeleteOpen(false);
    deleteAccount();
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <Icon name="account" size={28} color={colors.primaryText} />
        </View>
        <View>
          <AppText variant="h2">{user?.name}</AppText>
          <AppText variant="bodySm" tone="secondary">
            {user?.email}
          </AppText>
        </View>
      </View>

      <SectionHeader title={t('profile.statsTitle')} />
      <Card style={styles.section}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Icon name="map-marker-path" size={22} color={colors.primaryText} />
            <AppText variant="bodySm" style={styles.statText}>
              {tn('profile.statsTrips', stats.trips)}
            </AppText>
          </View>
          <View style={styles.statItem}>
            <Icon name="leaf" size={22} color={colors.successText} />
            <AppText variant="bodySm" style={styles.statText}>
              {t('profile.statsCo2', { amount: formatWeight(stats.co2Grams) })}
            </AppText>
          </View>
        </View>
      </Card>

      <SectionHeader title={t('profile.language')} />
      <Card style={styles.section}>
        <View style={styles.optionRow}>
          {LANGUAGES.map((lng) => (
            <OptionChip key={lng} label={languageNames[lng]} active={lng === language} onPress={() => setLanguage(lng)} />
          ))}
        </View>
      </Card>

      <SectionHeader title={t('profile.theme')} />
      <Card style={styles.section}>
        <View style={styles.optionRow}>
          {themeOptions.map((opt) => (
            <OptionChip key={opt.value} label={opt.label} active={preference === opt.value} onPress={() => setPreference(opt.value)} />
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <AppText variant="title">{t('profile.highContrast')}</AppText>
            <AppText variant="bodySm" tone="secondary">
              {t('profile.highContrastHint')}
            </AppText>
          </View>
          <Switch
            value={highContrast}
            onValueChange={setHighContrast}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityLabel={t('profile.highContrast')}
            accessibilityHint={t('profile.highContrastHint')}
          />
        </View>
      </Card>

      <SectionHeader title={t('profile.preferencesTitle')} />
      <Card style={styles.section}>
        <PreferenceSwitch
          label={t('profile.accessibleDefault')}
          value={preferences.onlyAccessible}
          onValueChange={(v) => setAppPreference('onlyAccessible', v)}
        />
        <PreferenceSwitch label={t('profile.voiceEnabled')} value={preferences.voiceEnabled} onValueChange={(v) => setAppPreference('voiceEnabled', v)} />
        <PreferenceSwitch
          label={t('profile.descentAlerts')}
          value={preferences.descentAlerts}
          onValueChange={(v) => setAppPreference('descentAlerts', v)}
        />
        <PreferenceSwitch label={t('profile.rainAlerts')} value={preferences.rainAlerts} onValueChange={(v) => setAppPreference('rainAlerts', v)} last />
      </Card>

      <SectionHeader title={t('profile.privacyTitle')} />
      <Card style={styles.section}>
        <Pressable onPress={() => setPolicyOpen(true)} style={styles.linkRow} accessibilityRole="button">
          <Icon name="shield-check-outline" size={20} color={colors.text} />
          <AppText variant="body" style={styles.flex}>
            {t('profile.privacyPolicy')}
          </AppText>
          <Icon name="chevron-right" size={20} color={colors.textTertiary} />
        </Pressable>
        <Pressable onPress={handleExport} style={[styles.linkRow, styles.linkRowBorder, { borderTopColor: colors.border }]} accessibilityRole="button">
          <Icon name="export-variant" size={20} color={colors.text} />
          <AppText variant="body" style={styles.flex}>
            {t('profile.exportData')}
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => setDeleteOpen(true)}
          style={[styles.linkRow, styles.linkRowBorder, { borderTopColor: colors.border }]}
          accessibilityRole="button"
        >
          <Icon name="delete-forever-outline" size={20} color={colors.dangerText} />
          <AppText variant="body" tone="danger" style={styles.flex}>
            {t('profile.deleteAccount')}
          </AppText>
        </Pressable>
      </Card>

      <Pressable onPress={() => setSignOutOpen(true)} accessibilityRole="button" style={[styles.signOut, { borderColor: colors.border }]}>
        <Icon name="logout" size={20} color={colors.dangerText} />
        <AppText variant="label" tone="danger">
          {t('profile.signOut')}
        </AppText>
      </Pressable>

      <Dialog
        visible={signOutOpen}
        icon="logout"
        title={t('profile.signOutConfirmTitle')}
        message={t('profile.signOutConfirmMessage')}
        confirmLabel={t('profile.signOut')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={() => {
          setSignOutOpen(false);
          signOut();
        }}
        onCancel={() => setSignOutOpen(false)}
      />

      <Dialog
        visible={deleteOpen}
        icon="delete-forever-outline"
        title={t('profile.deleteAccountConfirmTitle')}
        message={t('profile.deleteAccountConfirmMessage')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteOpen(false)}
      />

      <Dialog
        visible={policyOpen}
        icon="shield-check-outline"
        title={t('profile.privacyPolicy')}
        message={t('profile.privacyPolicyText')}
        cancelLabel={t('common.close')}
        onCancel={() => setPolicyOpen(false)}
      />
    </Screen>
  );
}

function PreferenceSwitch({ label, value, onValueChange, last }: { label: string; value: boolean; onValueChange: (v: boolean) => void; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.switchRow, !last && styles.switchRowSpacing]}>
      <AppText variant="bodySm" style={styles.flex}>
        {label}
      </AppText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.surface}
        accessibilityLabel={label}
      />
    </View>
  );
}

function OptionChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
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
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: spacing.xl },
  statsRow: { flexDirection: 'row', gap: spacing.xl },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  statText: { flexShrink: 1 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, minHeight: 48, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  switchRowSpacing: { marginBottom: spacing.sm },
  flex: { flex: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, paddingVertical: spacing.sm },
  linkRowBorder: { borderTopWidth: 1, marginTop: spacing.xs },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: spacing.md,
    marginBottom: spacing.xxxl,
  },
});
