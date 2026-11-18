import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { darkColors, radii, shadows, spacing } from '../tokens';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';

export type ToastTone = 'default' | 'success' | 'danger';

export type ToastData = {
  message: string;
  icon?: IconName;
  tone?: ToastTone;
  action?: { label: string; onPress: () => void };
};

type Props = {
  toast: ToastData;
  anim: Animated.Value;
  onActionPress: () => void;
};

// A pílula do toast é sempre escura, nos dois temas (como um "cartão" próprio) — assim os tons
// de texto/ícone usados dentro dela são sempre os do tema escuro, independente do tema do app.
const PILL_BG = '#1C2423';
const PILL_TEXT = darkColors.text;
const PILL_BORDER = darkColors.border;

export function Toast({ toast, anim, onActionPress }: Props) {
  const insets = useSafeAreaInsets();

  const iconColor =
    toast.tone === 'danger' ? darkColors.dangerText : toast.tone === 'success' ? darkColors.successText : darkColors.primaryText;

  return (
    <View pointerEvents={toast.action ? 'box-none' : 'none'} style={[styles.wrapper, { top: insets.top + spacing.sm }]}>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[
          styles.toast,
          shadows.lg,
          {
            backgroundColor: PILL_BG,
            shadowColor: '#000000',
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          },
        ]}
      >
        <Icon name={toast.icon ?? 'check-circle'} size={20} color={iconColor} />
        <AppText variant="label" color={PILL_TEXT} style={styles.text}>
          {toast.message}
        </AppText>
        {toast.action ? (
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            onPress={onActionPress}
            style={[styles.action, { borderLeftColor: PILL_BORDER }]}
          >
            <AppText variant="label" color={darkColors.primaryText}>
              {toast.action.label}
            </AppText>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: spacing.screen, right: spacing.screen, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: 420,
  },
  text: { flexShrink: 1 },
  action: { marginLeft: spacing.sm, paddingLeft: spacing.md, borderLeftWidth: 1 },
});
