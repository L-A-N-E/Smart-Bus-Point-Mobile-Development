import { Image, StyleSheet, View } from 'react-native';

import { useI18n } from '../contexts/LanguageContext';
import { spacing } from '../tokens';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  // Mostra a marca do app ao lado do título — reservado para as telas raiz das abas (sem botão
  // de voltar), onde a logo reforça a identidade do app em vez de competir com a navegação.
  logo?: boolean;
};

export function ScreenHeader({ title, subtitle, onBack, logo }: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      {onBack ? (
        <IconButton
          name="arrow-left"
          accessibilityLabel={t('a11y.backButton')}
          onPress={onBack}
          style={styles.back}
        />
      ) : null}
      <View style={styles.titleRow}>
        {logo ? <Image source={require('../../assets/logo-sbp.png')} style={styles.logo} /> : null}
        <AppText variant="h1" style={styles.title}>
          {title}
        </AppText>
      </View>
      {subtitle ? (
        <AppText variant="body" tone="secondary" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.xl },
  back: { marginLeft: -spacing.sm, marginBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 32, height: 32 },
  title: { marginBottom: spacing.xs },
  subtitle: {},
});
