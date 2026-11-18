import { StyleSheet, View } from 'react-native';

import { useI18n } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';

type Props = {
  title: string;
  description?: string;
  onRetry?: () => void;
  // Mostra o aviso de "dados de X min atrás" quando há cache disponível em vez de um erro puro.
  cacheAgeLabel?: string;
};

export function ErrorState({ title, description, onRetry, cacheAgeLabel }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Icon name="wifi-off" size={32} color={colors.dangerText} />
      <AppText variant="h3" align="center" style={styles.title}>
        {title}
      </AppText>
      {description ? (
        <AppText variant="body" tone="secondary" align="center" style={styles.description}>
          {description}
        </AppText>
      ) : null}
      {cacheAgeLabel ? (
        <AppText variant="caption" tone="tertiary" align="center" style={styles.description}>
          {cacheAgeLabel}
        </AppText>
      ) : null}
      {onRetry ? <Button title={t('common.retry')} variant="secondary" icon="refresh" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.sm },
  title: { marginTop: spacing.sm },
  description: {},
});
