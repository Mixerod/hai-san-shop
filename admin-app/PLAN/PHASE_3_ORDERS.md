# Phase 3 — Quản lý Đơn hàng

## Mục tiêu
Màn hình danh sách đơn hàng với filter trạng thái, chi tiết đơn, cập nhật trạng thái, Supabase Realtime subscription, và pull-to-refresh.

## Prerequisites
- Phase 1 & 2 đã hoàn thành

## Supabase Context
```
Table: orders
  id, user_id, total_amount, status, payment_method, note, created_at
  → profiles (full_name, phone, address)
  → order_items (quantity, price_at_time, product_id)
     → products (name, unit, price)

Order statuses: pending | confirmed | delivering | done | paid | cancelled
Payment: cod | bank
```

## Query chính
```typescript
const { data } = await supabase
  .from('orders')
  .select(`
    *,
    profiles(full_name, phone, address),
    order_items(*, products(name, unit, price))
  `)
  .order('created_at', { ascending: false });
```

## Bước 1 — Tạo màn hình Orders chính

Thay thế toàn bộ `/home/user/hai-san-shop/admin-app/app/(tabs)/orders.tsx`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';
import OrderCard from '@/components/orders/OrderCard';
import StatusFilterBar from '@/components/orders/StatusFilterBar';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  async function fetchOrders() {
    let query = supabase
      .from('orders')
      .select(`*, profiles(full_name, phone, address), order_items(*, products(name, unit, price))`)
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;
    if (!error && data) setOrders(data as Order[]);
  }

  useEffect(() => {
    fetchOrders().finally(() => setLoading(false));

    // Realtime subscription
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [filterStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [filterStatus]);

  const filteredOrders = orders.filter(order => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const name = order.profiles?.full_name?.toLowerCase() ?? '';
    const phone = order.profiles?.phone ?? '';
    const note = order.note?.toLowerCase() ?? '';
    return name.includes(s) || phone.includes(s) || note.includes(s);
  });

  async function updateStatus(orderId: string, newStatus: OrderStatus) {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
    if (error) Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    else fetchOrders();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#38bdf8" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đơn hàng</Text>
        <Text style={styles.headerCount}>{filteredOrders.length} đơn</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm tên, SĐT, ghi chú..."
          placeholderTextColor="#4b5563"
        />
      </View>

      {/* Status filter */}
      <StatusFilterBar selected={filterStatus} onSelect={setFilterStatus} />

      {/* Orders list */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard order={item} onUpdateStatus={updateStatus} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Không có đơn hàng</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#030712' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerTitle: { color: '#f9fafb', fontSize: 20, fontWeight: '700' },
  headerCount: { color: '#6b7280', fontSize: 14 },
  searchContainer: { padding: 12 },
  searchInput: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    color: '#f9fafb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  listContent: { padding: 12, paddingTop: 0, gap: 8 },
  empty: { padding: 48, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 16 },
});
```

## Bước 2 — Tạo StatusFilterBar component

Tạo file `/home/user/hai-san-shop/admin-app/components/orders/StatusFilterBar.tsx`:

```typescript
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { OrderStatus } from '@/types';

const STATUSES: { value: OrderStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'Tất cả', color: '#6b7280' },
  { value: 'pending', label: 'Chờ xác nhận', color: '#f59e0b' },
  { value: 'confirmed', label: 'Đã xác nhận', color: '#3b82f6' },
  { value: 'delivering', label: 'Đang giao', color: '#8b5cf6' },
  { value: 'done', label: 'Đã giao', color: '#10b981' },
  { value: 'paid', label: 'Đã thanh toán', color: '#22c55e' },
  { value: 'cancelled', label: 'Đã huỷ', color: '#ef4444' },
];

interface Props {
  selected: OrderStatus | 'all';
  onSelect: (status: OrderStatus | 'all') => void;
}

export default function StatusFilterBar({ selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {STATUSES.map((s) => (
        <TouchableOpacity
          key={s.value}
          onPress={() => onSelect(s.value)}
          style={[
            styles.chip,
            { borderColor: s.color },
            selected === s.value && { backgroundColor: s.color + '33' },
          ]}
        >
          <Text style={[styles.chipText, { color: s.color }]}>{s.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
});
```

## Bước 3 — Tạo OrderCard component

Tạo file `/home/user/hai-san-shop/admin-app/components/orders/OrderCard.tsx`:

```typescript
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { ChevronDown, ChevronUp, User, Phone, MapPin, Package } from 'lucide-react-native';
import { Order, OrderStatus } from '@/types';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  pending:    { label: 'Chờ xác nhận', color: '#f59e0b' },
  confirmed:  { label: 'Đã xác nhận',  color: '#3b82f6' },
  delivering: { label: 'Đang giao',    color: '#8b5cf6' },
  done:       { label: 'Đã giao',      color: '#10b981' },
  paid:       { label: 'Đã thanh toán', color: '#22c55e' },
  cancelled:  { label: 'Đã huỷ',       color: '#ef4444' },
};

const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['delivering', 'cancelled'],
  delivering: ['done'],
  done:       ['paid'],
};

const PAYMENT_LABEL: Record<string, string> = {
  cod: 'Tiền mặt (COD)',
  bank: 'Chuyển khoản',
};

interface Props {
  order: Order;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
}

export default function OrderCard({ order, onUpdateStatus }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const config = STATUS_CONFIG[order.status];
  const nextStatuses = NEXT_STATUSES[order.status] ?? [];

  const totalWeight = order.order_items
    .filter(i => i.products?.unit === 'kg')
    .reduce((acc, i) => acc + i.quantity, 0);

  const formattedDate = new Date(order.created_at).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={styles.card}>
      {/* Top row */}
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.orderDate}>{formattedDate}</Text>
        </View>
        <View style={styles.topRight}>
          <View style={[styles.statusBadge, { backgroundColor: config.color + '22', borderColor: config.color }]}>
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
          {expanded ? <ChevronUp color="#6b7280" size={18} /> : <ChevronDown color="#6b7280" size={18} />}
        </View>
      </TouchableOpacity>

      {/* Customer info */}
      <View style={styles.customerRow}>
        <User color="#9ca3af" size={14} />
        <Text style={styles.customerName}>{order.profiles?.full_name ?? 'Khách vãng lai'}</Text>
        <Phone color="#9ca3af" size={14} />
        <Text style={styles.customerPhone}>{order.profiles?.phone ?? '—'}</Text>
      </View>

      {/* Amount row */}
      <View style={styles.amountRow}>
        <Text style={styles.amount}>
          {order.total_amount.toLocaleString('vi-VN')}đ
        </Text>
        {totalWeight > 0 && (
          <Text style={styles.weight}>{totalWeight.toFixed(1)} kg</Text>
        )}
        <Text style={styles.payment}>{PAYMENT_LABEL[order.payment_method] ?? order.payment_method}</Text>
      </View>

      {/* Expanded detail */}
      {expanded && (
        <View style={styles.detail}>
          {order.profiles?.address ? (
            <View style={styles.detailRow}>
              <MapPin color="#9ca3af" size={14} />
              <Text style={styles.detailText}>{order.profiles.address}</Text>
            </View>
          ) : null}
          {order.note ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>📝 {order.note}</Text>
            </View>
          ) : null}

          <Text style={styles.itemsTitle}>Sản phẩm:</Text>
          {order.order_items.map((item) => (
            <View key={item.id} style={styles.item}>
              <Package color="#6b7280" size={14} />
              <Text style={styles.itemName}>{item.products?.name ?? 'Sản phẩm đã xoá'}</Text>
              <Text style={styles.itemQty}>
                {item.quantity} {item.products?.unit ?? ''}
              </Text>
              <Text style={styles.itemPrice}>
                {(item.price_at_time * item.quantity).toLocaleString('vi-VN')}đ
              </Text>
            </View>
          ))}

          {/* Status update buttons */}
          {nextStatuses.length > 0 && (
            <View style={styles.actionRow}>
              {nextStatuses.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.actionBtn, { borderColor: STATUS_CONFIG[s].color }]}
                  onPress={() => onUpdateStatus(order.id, s)}
                >
                  <Text style={[styles.actionBtnText, { color: STATUS_CONFIG[s].color }]}>
                    → {STATUS_CONFIG[s].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 12,
    marginBottom: 8,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  topLeft: {},
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderId: { color: '#e5e7eb', fontSize: 14, fontWeight: '600' },
  orderDate: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  statusText: { fontSize: 12, fontWeight: '600' },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  customerName: { color: '#d1d5db', fontSize: 14, flex: 1 },
  customerPhone: { color: '#9ca3af', fontSize: 13 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amount: { color: '#38bdf8', fontSize: 15, fontWeight: '700' },
  weight: { color: '#a78bfa', fontSize: 13 },
  payment: { color: '#6b7280', fontSize: 12, marginLeft: 'auto' },
  detail: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#1f2937', paddingTop: 12, gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  detailText: { color: '#9ca3af', fontSize: 13, flex: 1 },
  noteBox: { backgroundColor: '#1f2937', borderRadius: 8, padding: 8 },
  noteText: { color: '#d1d5db', fontSize: 13 },
  itemsTitle: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { color: '#d1d5db', fontSize: 13, flex: 1 },
  itemQty: { color: '#a78bfa', fontSize: 13 },
  itemPrice: { color: '#38bdf8', fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontWeight: '500' },
});
```

## Bước 4 — Tạo thư mục components

```bash
mkdir -p /home/user/hai-san-shop/admin-app/components/orders
mkdir -p /home/user/hai-san-shop/admin-app/components/products
mkdir -p /home/user/hai-san-shop/admin-app/components/chat
```

## Bước 5 — Commit & Push

```bash
cd /home/user/hai-san-shop
git add admin-app/
git commit -m "feat: orders list with realtime, filter, status update"
git push -u origin claude/seafood-admin-app-Gd7JI
```

## Verification
- Danh sách đơn hàng hiện ra sau khi đăng nhập
- Filter theo trạng thái hoạt động
- Tap vào đơn hàng để expand xem chi tiết
- Nút cập nhật trạng thái hoạt động
- Pull-to-refresh load lại dữ liệu

## NEXT: Phase 4
Sau khi xong, đọc `PHASE_4_PUSH_NOTIF.md` và thực thi.
