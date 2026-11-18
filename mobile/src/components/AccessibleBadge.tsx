import { StyleSheet, View } from 'react-native';

import { useI18n } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';

// `accessible` null = não informado (comum em horários programados do GTFS, sem esse dado).
export function AccessibleBadge({ accessible, compact }: { accessible: boolean | null; compact?: boolean }) {
  const { colors } = useTheme();
  const { t } = useI18n();

  if (accessible === null) {
    return (
      <View style={styles.row}>
        <Icon name="help-circle-outline" size={15} color={colors.textTertiary} />
        {!compact ? (
          <AppText variant="caption" tone="tertiary">
            {t('accessible.unknown')}
          </AppText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Icon
        name={accessible ? 'wheelchair-accessibility' : 'close-circle-outline'}
        size={15}
        color={accessible ? colors.successText : colors.textTertiary}
      />
      {!compact ? (
        <AppText variant="caption" tone={accessible ? 'success' : 'tertiary'}>
          {t(accessible ? 'accessible.yes' : 'accessible.no')}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
