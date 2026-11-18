import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useTheme } from '../contexts/ThemeContext';
import { fonts, radii, sizes, spacing } from '../tokens';
import { Icon, IconName } from './Icon';
import { PressableScale } from './PressableScale';

type Variant = 'primary' | 'success' | 'danger' | 'secondary' | 'outline' | 'ghost';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading,
  disabled,
  accessibilityHint,
  style,
}: Props) {
  const { colors } = useTheme();

  const look: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    success: { bg: colors.success, fg: colors.onSuccess },
    danger: { bg: colors.danger, fg: colors.onDanger },
    secondary: { bg: colors.surfaceAlt, fg: colors.text },
    outline: { bg: 'transparent', fg: colors.text, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.primaryText },
  };
  const { bg, fg, border } = look[variant];
  const small = size === 'sm';

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        small && styles.small,
        { backgroundColor: bg, opacity: disabled ? 0.5 : 1 },
        border ? { borderWidth: 1, borderColor: border } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={[styles.content, iconPosition === 'right' && styles.contentReverse]}>
          {icon ? <Icon name={icon} size={small ? 16 : 20} color={fg} /> : null}
          <Text style={[styles.title, small && styles.titleSmall, { color: fg }]}>{title}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    // `minHeight` (não `height` fixo) para a fonte do sistema em 200% ter espaço de crescer
    // sem cortar o texto — por isso também não usamos `numberOfLines` no título.
    minHeight: sizes.button,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
  },
  small: { minHeight: sizes.buttonSm, paddingHorizontal: spacing.lg },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  contentReverse: { flexDirection: 'row-reverse' },
  title: { fontFamily: fonts.bold, fontSize: 15, textAlign: 'center' },
  titleSmall: { fontSize: 13 },
});
