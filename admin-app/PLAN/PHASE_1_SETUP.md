# Phase 1 — Setup & Cấu trúc dự án

## Mục tiêu
Khởi tạo Expo app, cài dependencies, cấu hình Supabase client, tạo tab navigation shell rỗng.

## Prerequisites
- Không cần phase nào trước
- Working directory: `/home/user/hai-san-shop/`
- Branch: `claude/seafood-admin-app-Gd7JI`

## Bước 1 — Tạo Expo project

```bash
cd /home/user/hai-san-shop
npx create-expo-app@latest admin-app --template blank-typescript
```

Nếu lệnh trên thất bại (môi trường sandbox), tạo thủ công:

```bash
mkdir -p admin-app
cd admin-app
```

## Bước 2 — Tạo package.json

Tạo file `/home/user/hai-san-shop/admin-app/package.json`:

```json
{
  "name": "hai-san-admin",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~52.0.46",
    "expo-router": "~4.0.20",
    "expo-status-bar": "~2.0.1",
    "expo-notifications": "~0.29.14",
    "expo-device": "~7.0.3",
    "expo-constants": "~17.0.8",
    "expo-image-picker": "~16.0.6",
    "expo-file-system": "~18.0.12",
    "react": "18.3.2",
    "react-native": "0.76.9",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.4.0",
    "react-native-gesture-handler": "~2.20.2",
    "react-native-reanimated": "~3.16.7",
    "@react-native-async-storage/async-storage": "1.23.1",
    "@supabase/supabase-js": "^2.48.1",
    "react-native-url-polyfill": "^2.0.0",
    "zustand": "^5.0.3",
    "@react-native-community/netinfo": "11.4.1"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@types/react": "~18.3.12",
    "typescript": "^5.3.3"
  }
}
```

## Bước 3 — Tạo app.json

Tạo file `/home/user/hai-san-shop/admin-app/app.json`:

```json
{
  "expo": {
    "name": "Hải Sản Admin",
    "slug": "hai-san-admin",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "scheme": "hai-san-admin",
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#0f172a",
          "sounds": []
        }
      ]
    ],
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0f172a"
      },
      "package": "com.haisanshop.admin",
      "googleServicesFile": "./google-services.json",
      "permissions": ["RECEIVE_BOOT_COMPLETED"]
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.haisanshop.admin"
    },
    "web": {
      "bundler": "metro"
    },
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

## Bước 4 — Tạo tsconfig.json

Tạo file `/home/user/hai-san-shop/admin-app/tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## Bước 5 — Tạo babel.config.js

Tạo file `/home/user/hai-san-shop/admin-app/babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

## Bước 6 — Tạo file .env

Tạo file `/home/user/hai-san-shop/admin-app/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=<lấy từ Supabase dashboard>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<lấy từ Supabase dashboard>
```

**Cách lấy:** Vào Supabase dashboard → Settings → API → copy Project URL và anon key.
Hoặc kiểm tra trong môi trường CI/CD nếu đã có sẵn env vars.

## Bước 7 — Tạo Supabase client

Tạo file `/home/user/hai-san-shop/admin-app/lib/supabase.ts`:

```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

## Bước 8 — Tạo TypeScript types

Tạo file `/home/user/hai-san-shop/admin-app/types/index.ts`:

```typescript
export type OrderStatus = 'pending' | 'confirmed' | 'delivering' | 'done' | 'paid' | 'cancelled';
export type PaymentMethod = 'cod' | 'bank';
export type ProductTag = 'none' | 'new' | 'best_seller' | 'rare' | 'premium';
export type NotificationType = 'general' | 'new_product' | 'price_change';

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  username: string | null;
  email: string | null;
}

export interface OrderItem {
  id: string;
  quantity: number;
  price_at_time: number;
  product_id: string;
  products: {
    name: string;
    unit: string;
    price: number | null;
  } | null;
}

export interface Order {
  id: string;
  user_id: string | null;
  total_amount: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  note: string | null;
  created_at: string;
  profiles: Profile | null;
  order_items: OrderItem[];
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  unit: string;
  image_url: string | null;
  in_stock: boolean;
  category: string;
  tag: ProductTag;
  note: string | null;
  total_sold: number;
  created_at: string;
}

export interface Feedback {
  id: string;
  title: string | null;
  content: string;
  rating: number | null;
  is_read: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  created_at: string;
}
```

## Bước 9 — Tạo Auth store (Zustand)

Tạo file `/home/user/hai-san-shop/admin-app/store/auth.ts`:

```typescript
import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  setSession: (session: Session | null) => void;
  clear: () => void;
}

const ADMIN_EMAIL = 'minhquyet08122003@gmail.com';

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isAdmin: false,
  setSession: (session) => set({
    session,
    user: session?.user ?? null,
    isAdmin: session?.user?.email === ADMIN_EMAIL,
  }),
  clear: () => set({ session: null, user: null, isAdmin: false }),
}));
```

## Bước 10 — Tạo Root Layout

Tạo file `/home/user/hai-san-shop/admin-app/app/_layout.tsx`:

```typescript
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

export default function RootLayout() {
  const { session, setSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const inLoginPage = segments[0] === 'login';
    if (!session && !inLoginPage) {
      router.replace('/login');
    } else if (session && inLoginPage) {
      router.replace('/(tabs)/orders');
    }
  }, [session, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
```

## Bước 11 — Tạo màn hình Login placeholder

Tạo file `/home/user/hai-san-shop/admin-app/app/login.tsx`:

```typescript
import { View, Text, StyleSheet } from 'react-native';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Login Screen — Phase 2</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#030712' },
  text: { color: '#e5e7eb', fontSize: 18 },
});
```

## Bước 12 — Tạo Tab Layout

Tạo file `/home/user/hai-san-shop/admin-app/app/(tabs)/_layout.tsx`:

```typescript
import { Tabs } from 'expo-router';
import { ShoppingCart, Package, MessageSquare, BarChart2, ClipboardList } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#111827', borderTopColor: '#1f2937' },
        tabBarActiveTintColor: '#38bdf8',
        tabBarInactiveTintColor: '#6b7280',
      }}
    >
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Đơn hàng',
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Sản phẩm',
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Thống kê',
          tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="batch"
        options={{
          title: 'Chuẩn bị',
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
```

## Bước 13 — Tạo placeholder screens

Tạo 5 file placeholder (thay thế bằng nội dung thực ở các phase sau):

**`app/(tabs)/orders.tsx`**:
```typescript
import { View, Text, StyleSheet } from 'react-native';
export default function OrdersScreen() {
  return <View style={s.c}><Text style={s.t}>Orders — Phase 3</Text></View>;
}
const s = StyleSheet.create({ c: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#030712' }, t: { color:'#e5e7eb', fontSize:18 } });
```

**`app/(tabs)/products.tsx`**:
```typescript
import { View, Text, StyleSheet } from 'react-native';
export default function ProductsScreen() {
  return <View style={s.c}><Text style={s.t}>Products — Phase 6</Text></View>;
}
const s = StyleSheet.create({ c: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#030712' }, t: { color:'#e5e7eb', fontSize:18 } });
```

**`app/(tabs)/chat.tsx`**:
```typescript
import { View, Text, StyleSheet } from 'react-native';
export default function ChatScreen() {
  return <View style={s.c}><Text style={s.t}>Chat — Phase 7</Text></View>;
}
const s = StyleSheet.create({ c: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#030712' }, t: { color:'#e5e7eb', fontSize:18 } });
```

**`app/(tabs)/dashboard.tsx`**:
```typescript
import { View, Text, StyleSheet } from 'react-native';
export default function DashboardScreen() {
  return <View style={s.c}><Text style={s.t}>Dashboard — Phase 5</Text></View>;
}
const s = StyleSheet.create({ c: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#030712' }, t: { color:'#e5e7eb', fontSize:18 } });
```

**`app/(tabs)/batch.tsx`**:
```typescript
import { View, Text, StyleSheet } from 'react-native';
export default function BatchScreen() {
  return <View style={s.c}><Text style={s.t}>Batch — Phase 8</Text></View>;
}
const s = StyleSheet.create({ c: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#030712' }, t: { color:'#e5e7eb', fontSize:18 } });
```

## Bước 14 — Tạo thư mục assets

```bash
mkdir -p /home/user/hai-san-shop/admin-app/assets
# Tạo placeholder icon (solid dark background)
# Dùng convert nếu có ImageMagick, hoặc copy từ parent project nếu có
cp /home/user/hai-san-shop/public/favicon.ico /home/user/hai-san-shop/admin-app/assets/icon.png 2>/dev/null || true
```

## Bước 15 — Install dependencies

```bash
cd /home/user/hai-san-shop/admin-app
npm install
```

## Bước 16 — Cài lucide-react-native (icons)

```bash
cd /home/user/hai-san-shop/admin-app
npm install lucide-react-native react-native-svg
```

## Bước 17 — Thêm .gitignore

Tạo file `/home/user/hai-san-shop/admin-app/.gitignore`:
```
node_modules/
.expo/
dist/
.env
google-services.json
*.jks
*.p8
*.p12
*.key
*.mobileprovision
npm-debug.*
yarn-debug.*
yarn-error.*
```

## Bước 18 — Commit & Push

```bash
cd /home/user/hai-san-shop
git add admin-app/
git commit -m "feat: init expo admin app scaffold with tab navigation"
git push -u origin claude/seafood-admin-app-Gd7JI
```

## Verification
- File structure exists: `ls admin-app/app/(tabs)/`
- `npm install` hoàn thành không lỗi
- Có thể run `npx expo start` từ trong thư mục admin-app (có thể bị lỗi env nếu thiếu Supabase keys — bình thường)

## NEXT: Phase 2
Sau khi xong, đọc `PHASE_2_AUTH.md` và thực thi.
