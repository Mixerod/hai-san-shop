# Phase 4 — Push Notifications

## Mục tiêu
Khi có đơn hàng mới trong bảng `orders`, admin nhận push notification trên điện thoại ngay lập tức.

## Architecture
```
Khách đặt hàng
  → INSERT into orders (Supabase)
    → Database Webhook fires
      → Supabase Edge Function: send-push-notification
        → Đọc admin_push_tokens table
          → Gọi Expo Push API
            → Thiết bị admin nhận notification
```

## Prerequisites
- Phase 1 & 2 đã hoàn thành
- Có tài khoản Supabase với quyền tạo Edge Functions và Webhooks

## Bước 1 — Tạo bảng admin_push_tokens trên Supabase

Chạy SQL này trong Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS admin_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: chỉ admin được đọc/ghi
ALTER TABLE admin_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only" ON admin_push_tokens
  USING (auth.jwt() ->> 'email' = 'minhquyet08122003@gmail.com');
```

**Lưu ý:** Nếu không muốn dùng RLS, có thể dùng Service Role Key trong Edge Function.

## Bước 2 — Cài expo-notifications trong admin-app

```bash
cd /home/user/hai-san-shop/admin-app
npm install expo-notifications expo-device expo-constants
```

## Bước 3 — Tạo hook usePushNotifications

Tạo file `/home/user/hai-san-shop/admin-app/lib/notifications.ts`:

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Cấu hình hiển thị notification khi app đang mở
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications chỉ hoạt động trên thiết bị thật');
    return null;
  }

  // Xin quyền
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Không được cấp quyền push notification');
    return null;
  }

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Đơn hàng mới',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#38bdf8',
      sound: 'default',
    });
  }

  // Lấy Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('Thiếu EAS projectId trong app.json');
    // Thử lấy token không có projectId (dev mode)
  }

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const token = tokenData.data;

  // Lưu token vào Supabase
  await saveTokenToSupabase(token);

  return token;
}

async function saveTokenToSupabase(token: string) {
  const { error } = await supabase
    .from('admin_push_tokens')
    .upsert({ token }, { onConflict: 'token' });

  if (error) console.error('Lỗi lưu push token:', error);
  else console.log('Push token đã lưu:', token);
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
```

## Bước 4 — Gọi registerForPushNotifications khi đăng nhập

Cập nhật `/home/user/hai-san-shop/admin-app/app/_layout.tsx`, thêm vào useEffect sau khi có session:

```typescript
// Thêm import
import { registerForPushNotifications, setupNotificationListeners } from '@/lib/notifications';
import { useRouter } from 'expo-router';

// Trong component, thêm useEffect này sau useEffect auth:
useEffect(() => {
  if (!session?.user) return;

  // Đăng ký push notification
  registerForPushNotifications().catch(console.error);

  // Listen notification khi app đang mở
  const cleanup = setupNotificationListeners(
    undefined,
    (response) => {
      // Tap vào notification → mở tab orders
      const data = response.notification.request.content.data;
      if (data?.type === 'new_order') {
        router.push('/(tabs)/orders');
      }
    }
  );

  return cleanup;
}, [session]);
```

## Bước 5 — Tạo Supabase Edge Function

### 5a. Cấu trúc file

Tạo file `/home/user/hai-san-shop/supabase/functions/send-push-notification/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  try {
    // Verify webhook secret (nếu có)
    // const secret = req.headers.get('x-webhook-secret');
    // if (secret !== Deno.env.get('WEBHOOK_SECRET')) return new Response('Unauthorized', { status: 401 });

    const payload = await req.json();
    const record = payload.record; // New order data

    if (!record) {
      return new Response('No record', { status: 400 });
    }

    // Khởi tạo Supabase với Service Role Key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Lấy thông tin đơn hàng và khách hàng
    const { data: order } = await supabase
      .from('orders')
      .select('*, profiles(full_name, phone)')
      .eq('id', record.id)
      .single();

    // Lấy tất cả push tokens của admin
    const { data: tokens } = await supabase
      .from('admin_push_tokens')
      .select('token');

    if (!tokens || tokens.length === 0) {
      return new Response('No tokens', { status: 200 });
    }

    const customerName = order?.profiles?.full_name ?? 'Khách vãng lai';
    const amount = record.total_amount?.toLocaleString('vi-VN') ?? '0';

    // Gửi notification đến tất cả thiết bị admin
    const messages = tokens.map(({ token }) => ({
      to: token,
      channelId: 'orders',
      title: '🛒 Đơn hàng mới!',
      body: `${customerName} vừa đặt đơn ${amount}đ`,
      data: { type: 'new_order', orderId: record.id },
      sound: 'default',
      priority: 'high',
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('Push result:', JSON.stringify(result));

    return new Response(JSON.stringify({ success: true, sent: messages.length }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### 5b. Deploy Edge Function

Nếu có Supabase CLI:
```bash
cd /home/user/hai-san-shop
supabase functions deploy send-push-notification --no-verify-jwt
```

**Hoặc** deploy thủ công qua Supabase Dashboard:
1. Vào Supabase Dashboard → Edge Functions
2. New Function → tên: `send-push-notification`
3. Copy nội dung file trên vào editor
4. Deploy

## Bước 6 — Tạo Database Webhook trên Supabase

Vào Supabase Dashboard → Database → Webhooks → Create Webhook:

```
Name: notify-new-order
Table: orders
Events: INSERT
URL: https://<your-project-ref>.supabase.co/functions/v1/send-push-notification
Method: POST
Headers:
  Authorization: Bearer <your-service-role-key>
  Content-Type: application/json
```

**Lưu ý:** Thay `<your-project-ref>` bằng project ID thực từ Supabase dashboard.

## Bước 7 — Test notification

Sau khi deploy xong, thử tạo một đơn hàng từ web → kiểm tra xem admin app có nhận được notification không.

Để test thủ công Edge Function:
```bash
curl -X POST 'https://<project>.supabase.co/functions/v1/send-push-notification' \
  -H 'Authorization: Bearer <anon-key>' \
  -H 'Content-Type: application/json' \
  -d '{"record": {"id": "test-id", "total_amount": 150000}}'
```

## Bước 8 — Thêm EAS Project ID vào app.json (nếu dùng EAS Build)

Cập nhật `/home/user/hai-san-shop/admin-app/app.json`, trong phần `expo`:
```json
{
  "expo": {
    "...": "...",
    "extra": {
      "eas": {
        "projectId": "<your-eas-project-id>"
      }
    }
  }
}
```

**Lưu ý:** Để nhận push notification trên thiết bị thật, cần build với EAS Build (`eas build`). Expo Go chỉ hỗ trợ trên một số trường hợp.

## Bước 9 — Commit & Push

```bash
cd /home/user/hai-san-shop
git add admin-app/ supabase/
git commit -m "feat: push notifications for new orders via Expo + Supabase Edge Function"
git push -u origin claude/seafood-admin-app-Gd7JI
```

## Verification
- Đăng nhập vào admin app → granted notification permission
- Token được lưu trong bảng `admin_push_tokens`
- Tạo đơn hàng mới từ web → admin nhận notification
- Tap notification → mở tab Orders

## NEXT: Phase 5
Sau khi xong, đọc `PHASE_5_DASHBOARD.md` và thực thi.
