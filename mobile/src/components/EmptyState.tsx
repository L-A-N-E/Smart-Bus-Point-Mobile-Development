import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../tokens';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';

type Props = {
  icon: IconName;
  title: string;
  description?: string;
  children?: ReactNode; // ex.: um Button de ação ou sugestões
};

export function EmptyState({ icon, title, description, children }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container} accessibilityRole="text">
      <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
        <Icon name={icon} size={32} color={colors.primaryText} />
      </View>
      <AppText variant="h3" align="center" style={styles.title}>
        {title}
      </AppText>
      {description ? (
        <AppText variant="body" tone="secondary" align="center" style={styles.description}>
          {description}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.lg },
  iconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { marginBottom: spacing.sm },
  description: { marginBottom: spacing.lg },
});
