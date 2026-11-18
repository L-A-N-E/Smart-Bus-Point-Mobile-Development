import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type TapStyle = 'light' | 'medium' | 'heavy';

const styles: Record<TapStyle, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

// Vibração de feedback curta. Sem efeito no web (expo-haptics não tem suporte lá).
export function tap(style: TapStyle = 'light') {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(styles[style]).catch(() => {});
}

export function notifySuccess() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function notifyWarning() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
