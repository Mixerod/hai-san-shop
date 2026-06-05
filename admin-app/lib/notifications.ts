import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications only work on a real device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Đơn hàng mới',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#38bdf8',
      sound: 'default',
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ?? (Constants as any).easConfig?.projectId;

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const token = tokenData.data;

  await saveTokenToSupabase(token);
  return token;
}

async function saveTokenToSupabase(token: string) {
  const { error } = await supabase
    .from('admin_push_tokens')
    .upsert({ token }, { onConflict: 'token' });

  if (error) console.error('Error saving push token:', error);
  else console.log('Push token saved:', token);
}

export function setupNotificationListeners(
  onNotification?: (notification: Notifications.Notification) => void,
  onResponse?: (response: Notifications.NotificationResponse) => void
) {
  const notifSub = Notifications.addNotificationReceivedListener((notification) => {
    onNotification?.(notification);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    onResponse?.(response);
  });

  return () => {
    notifSub.remove();
    responseSub.remove();
  };
}
