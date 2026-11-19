import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button } from '../../components';
import { useI18n } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { radii, sizes, spacing } from '../../tokens';
import { Language, languageNames, LANGUAGES } from '../../i18n';

export function WelcomeScreen() {
  const router = useRouter();
  const { t, language, setLanguage } = useI18n();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.languageRow}>
        {LANGUAGES.map((lng) => (
          <LanguageChip key={lng} language={lng} active={lng === language} onPress={() => setLanguage(lng)} />
        ))}
      </View>

      <View style={styles.content}>
        <Image
          source={require('../../../assets/logo-sbp.png')}
          style={styles.logo}
          accessible
          accessibilityLabel={t('common.appName')}
          resizeMode="contain"
        />
        <AppText variant="hero" align="center" style={styles.title}>
          {t('welcome.title')}
        </AppText>
        <AppText variant="body" tone="secondary" align="center" style={styles.subtitle}>
          {t('welcome.subtitle')}
        </AppText>
      </View>

      <View style={styles.actions}>
        <Button title={t('welcome.login')} onPress={() => router.push('/(auth)/login')} />
        <Button title={t('welcome.register')} variant="outline" onPress={() => router.push('/(auth)/register')} />
      </View>
    </View>
  );
}

function LanguageChip({ language, active, onPress }: { language: Language; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const key = language === 'pt' ? 'welcome.languagePt' : language === 'en' ? 'welcome.languageEn' : 'welcome.languageEs';
  const { t } = useI18n();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={languageNames[language]}
      accessibilityState={{ selected: active }}
      style={[
        styles.languageChip,
        { backgroundColor: active ? colors.primary : 'transparent', borderColor: colors.border },
      ]}
    >
      <AppText variant="label" color={active ? colors.onPrimary : colors.textSecondary}>
        {t(key)}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screen },
  languageRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xl },
  languageChip: {
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    minWidth: sizes.iconButton,
    minHeight: sizes.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 120, height: 120, marginBottom: spacing.xxl },
  title: { marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  subtitle: { paddingHorizontal: spacing.lg },
  actions: { gap: spacing.md, paddingBottom: spacing.xxl },
});
