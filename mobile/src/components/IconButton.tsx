import { StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { useTheme } from '../contexts/ThemeContext';
import { radii, sizes } from '../tokens';
import { Icon, IconName } from './Icon';
import { PressableScale } from './PressableScale';

type Props = {
  name: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  variant?: 'ghost' | 'soft' | 'filled';
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

// Alvo de toque sempre >= 48dp (`sizes.iconButton`), mesmo quando o ícone em si é menor.
export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  variant = 'ghost',
  size = 22,
  color,
  style,
}: Props) {
  const { colors } = useTheme();

  const bg = variant === 'filled' ? colors.primary : variant === 'soft' ? colors.primarySoft : 'transparent';
  const fg = color ?? (variant === 'filled' ? colors.onPrimary : colors.text);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={[styles.button, { backgroundColor: bg }, style]}
    >
      <Icon name={name} size={size} color={fg} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: sizes.iconButton,
    height: sizes.iconButton,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
