import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button, Icon, PasswordStrength, Screen, ScreenHeader, TextField } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { radii, spacing } from '../../tokens';
import { tap } from '../../utils/haptics';
import { validateEmail, validateName, validatePassword } from '../../utils/validation';

export function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const nameError = validateName(name);
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password, { name, email });

  const handleSubmit = async () => {
    setSubmitted(true);
    setAuthError('');
    if (nameError || emailError || passwordError) {
      tap('medium');
      return;
    }
    if (!consent) {
      tap('medium');
      setAuthError(t('register.consentRequired'));
      return;
    }
    setLoading(true);
    const result = await signUp(name, email, password, consent);
    setLoading(false);
    if (!result.ok) {
      tap('medium');
      setAuthError(result.error);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader onBack={router.back} title={t('register.title')} subtitle={t('register.subtitle')} />

      <TextField
        label={t('auth.name')}
        icon="account-outline"
        placeholder={t('register.namePlaceholder')}
        value={name}
        onChangeText={setName}
        error={submitted ? (nameError ?? undefined) : undefined}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        inputRef={emailRef}
        label={t('auth.email')}
        icon="email-outline"
        placeholder={t('auth.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        error={submitted ? (emailError ?? undefined) : undefined}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        inputRef={passwordRef}
        label={t('auth.password')}
        icon="lock-outline"
        placeholder={t('login.passwordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        error={submitted ? (passwordError ?? undefined) : undefined}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />
      <PasswordStrength password={password} />

      <Pressable
        onPress={() => setConsent((c) => !c)}
        style={styles.consentRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consent }}
        accessibilityLabel={t('register.consent')}
      >
        <View
          style={[
            styles.checkbox,
            { borderColor: consent ? colors.primary : colors.border, backgroundColor: consent ? colors.primary : 'transparent' },
          ]}
        >
          {consent ? <Icon name="check-bold" size={14} color={colors.onPrimary} /> : null}
        </View>
        <AppText variant="bodySm" tone="secondary" style={styles.flex}>
          {t('register.consent')}
        </AppText>
      </Pressable>

      {authError ? (
        <View style={[styles.authError, { backgroundColor: colors.dangerSoft }]} accessibilityLiveRegion="polite">
          <Icon name="alert-circle-outline" size={18} color={colors.dangerText} />
          <AppText variant="bodySm" tone="danger" style={styles.flex}>
            {authError}
          </AppText>
        </View>
      ) : null}

      <Button title={t('register.submit')} onPress={handleSubmit} loading={loading} style={styles.submit} />

      <View style={styles.footer}>
        <AppText variant="body" tone="secondary">
          {t('register.hasAccount')}
        </AppText>
        <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8} accessibilityRole="button">
          <AppText variant="label" tone="primary">
            {t('register.signIn')}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.lg, minHeight: 48 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  authError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  submit: {},
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxl,
    paddingTop: spacing.lg,
  },
});
