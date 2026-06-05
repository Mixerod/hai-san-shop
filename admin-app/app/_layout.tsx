import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useBadgeStore } from '@/store/badges';
import { registerForPushNotifications, setupNotificationListeners } from '@/lib/notifications';

export default function RootLayout() {
  const { session, isAdmin, setSession } = useAuthStore();
  const { setBadges } = useBadgeStore();
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

    async function refreshBadges() {
      const [ordersRes, chatRes] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('feedbacks').select('*', { count: 'exact', head: true })
          .eq('is_read', false)
          .not('title', 'like', '[ADMIN]%'),
      ]);
      setBadges({
        pendingOrders: ordersRes.count ?? 0,
        unreadChat: chatRes.count ?? 0,
      });
    }

    refreshBadges();

    const channel = supabase
      .channel('badge-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refreshBadges)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks' }, refreshBadges)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

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
