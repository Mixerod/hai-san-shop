# Phase 2 — Authentication

## Mục tiêu
Xây dựng màn hình đăng nhập admin hoàn chỉnh với Supabase Auth, kiểm tra quyền admin, session persistence, và tự động redirect.

## Prerequisites
- Phase 1 đã hoàn thành
- File `lib/supabase.ts` đã tồn tại
- File `store/auth.ts` đã tồn tại

## Supabase Auth Context
- Method: `supabase.auth.signInWithPassword({ email, password })`
- Admin email: `minhquyet08122003@gmail.com`
- Nếu đăng nhập đúng email admin → vào tabs
- Nếu đăng nhập sai email (không phải admin) → báo lỗi "Tài khoản không có quyền admin"

## Bước 1 — Cập nhật màn hình Login

Thay thế toàn bộ nội dung file `/home/user/hai-san-shop/admin-app/app/login.tsx`:

```typescript
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAIL = 'minhquyet08122003@gmail.com';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        Alert.alert('Đăng nhập thất bại', error.message);
        return;
      }

      if (data.user?.email !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        Alert.alert('Không có quyền', 'Tài khoản này không có quyền admin.');
        return;
      }
      // Auth store sẽ được cập nhật tự động qua onAuthStateChange trong _layout.tsx
      // và router sẽ tự redirect sang /(tabs)/orders
    } catch (err) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>🐟</Text>
        <Text style={styles.title}>Hải Sản Shop</Text>
        <Text style={styles.subtitle}>Admin Dashboard</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="admin@example.com"
            placeholderTextColor="#4b5563"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#4b5563"
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    color: '#f9fafb',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  label: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    color: '#f9fafb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  button: {
    backgroundColor: '#0ea5e9',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

## Bước 2 — Cập nhật Root Layout với auth guard chắc chắn hơn

Cập nhật `/home/user/hai-san-shop/admin-app/app/_layout.tsx` để xử lý cả trường hợp isAdmin:

```typescript
import { useEffect, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

const ADMIN_EMAIL = 'minhquyet08122003@gmail.com';

export default function RootLayout() {
  const { session, isAdmin, setSession } = useAuthStore();
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
    } else if (session && !isAdmin && !inLoginPage) {
      // Đăng nhập nhưng không phải admin
      supabase.auth.signOut();
      router.replace('/login');
    } else if (session && isAdmin && inLoginPage) {
      router.replace('/(tabs)/orders');
    }
  }, [session, isAdmin, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
```

## Bước 3 — Thêm nút Logout vào Header (shared component)

Tạo file `/home/user/hai-san-shop/admin-app/components/AdminHeader.tsx`:

```typescript
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface Props {
  title: string;
  rightElement?: React.ReactNode;
}

export default function AdminHeader({ title, rightElement }: Props) {
  const insets = useSafeAreaInsets();

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>
        {rightElement}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut color="#ef4444" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  title: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoutBtn: {
    padding: 6,
  },
});
```

## Bước 4 — Commit & Push

```bash
cd /home/user/hai-san-shop
git add admin-app/
git commit -m "feat: admin login screen with Supabase auth and admin guard"
git push -u origin claude/seafood-admin-app-Gd7JI
```

## Verification
- Màn hình login hiện ra khi chưa đăng nhập
- Đăng nhập sai email → báo "Không có quyền"
- Đăng nhập đúng email admin → chuyển sang tab Orders
- Logout → về màn hình login

## NEXT: Phase 3
Sau khi xong, đọc `PHASE_3_ORDERS.md` và thực thi.
