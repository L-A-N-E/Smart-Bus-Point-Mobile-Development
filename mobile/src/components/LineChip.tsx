import { StyleSheet, View } from 'react-native';

import { useTheme } from '../contexts/ThemeContext';
import { radii, spacing } from '../tokens';
import { AppText } from './AppText';

export function LineChip({ label, size = 'md' }: { label: string; size?: 'md' | 'sm' }) {
  const { colors } = useTheme();
  const small = size === 'sm';

  return (
    <View style={[styles.chip, small && styles.chipSm, { backgroundColor: colors.text }]}>
      <AppText variant={small ? 'caption' : 'label'} color={colors.textInverse}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: radii.xs, paddingHorizontal: spacing.sm, paddingVertical: 4, alignSelf: 'flex-start' },
  chipSm: { paddingHorizontal: 6, paddingVertical: 2 },
});
