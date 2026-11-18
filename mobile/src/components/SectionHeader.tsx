import { StyleSheet, View } from 'react-native';

import { spacing } from '../tokens';
import { AppText } from './AppText';

type Props = {
  title: string;
  action?: { label: string; onPress: () => void };
};

export function SectionHeader({ title, action }: Props) {
  return (
    <View style={styles.row}>
      <AppText variant="h3">{title}</AppText>
      {action ? (
        <AppText
          variant="label"
          tone="primary"
          onPress={action.onPress}
          accessibilityRole="button"
          suppressHighlighting
        >
          {action.label}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
});
