import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from '../contexts/ThemeContext';
import { radii, shadows, spacing } from '../tokens';
import { PressableScale } from './PressableScale';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  padded?: boolean;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Cartão com bastante respiro interno (padrão do app). Quando `onPress` é passado, vira um
// alvo de toque acessível; senão é só um contêiner visual.
export function Card({ children, onPress, accessibilityLabel, accessibilityHint, padded = true, elevated, style }: Props) {
  const { colors } = useTheme();
  const base = [
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.border },
    padded && styles.padded,
    elevated && shadows.md,
    elevated && { shadowColor: colors.shadow },
    style,
  ];

  if (onPress) {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        style={base}
      >
        {children}
      </PressableScale>
    );
  }

  return <View style={base}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: 1 },
  padded: { padding: spacing.lg },
});
