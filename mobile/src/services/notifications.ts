import { isRunningInExpoGo } from 'expo';
import type * as NotificationsModule from 'expo-notifications';
import { Platform } from 'react-native';

// Alerta de descida: notificação local do sistema quando possível, alerta dentro do app quando não.
//
// Desde o SDK 53, o expo-notifications lança erro já ao ser importado no Expo Go do Android
// (o recurso de push foi removido de lá). Por isso o módulo só é carregado onde funciona:
// iOS e builds próprios do app (development build / APK). No web também não há suporte.
export const notificationsSupported = Platform.OS !== 'web' && !(Platform.OS === 'android' && isRunningInExpoGo());

const Notifications: typeof NotificationsModule | null = notificationsSupported
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('expo-notifications') as typeof NotificationsModule)
  : null;

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = 'descida';

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Alertas de descida',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

// Devolve true se a notificação do sistema foi enviada; false se o chamador deve mostrar um
// alerta dentro do app (notificationsSupported === false, ou permissão negada).
export async function notifyDescent(title: string, body: string): Promise<boolean> {
  if (!Notifications || !(await ensureNotificationPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
  });
  return true;
}
