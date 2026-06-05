import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { registerForPushNotifications, setupNotificationListeners } from '@/lib/notifications';

export default function RootLayout() {
  const { session, isAdmin, setSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const inLogin = segments[0] === 'login';
    if (!session && !inLogin) {
      router.replace('/login');
    } else if (session && !isAdmin && !inLogin) {
      supabase.auth.signOut();
      router.replace('/login');
    } else if (session && isAdmin && inLogin) {
      router.replace('/(tabs)/orders');
    }
  }, [session, isAdmin, segments]);

  useEffect(() => {
    if (!session?.user) return;

    registerForPushNotifications().catch(console.error);

    const cleanup = setupNotificationListeners(
      undefined,
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.type === 'new_order') {
          router.push('/(tabs)/orders');
        }
      }
    );

    return cleanup;
  }, [session]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
