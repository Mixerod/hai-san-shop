# Phase 8 — Batch Preparation (Chuẩn bị hàng)

## Mục tiêu
Màn hình gom các đơn hàng đang active (pending/confirmed) thành "mẻ" chuẩn bị, group theo khách, tổng hợp số lượng từng sản phẩm, lọc theo loại/kg, copy nội dung để gửi Zalo.

## Prerequisites
- Phase 1, 2, 3 đã hoàn thành

## Supabase Context
```
Lấy đơn hàng status IN ('pending', 'confirmed')
JOIN order_items → products (name, unit, price)
JOIN profiles (full_name, phone)

Group theo khách (phone hoặc name)
Aggregate: SUM(quantity) theo product_name
Filter: 
  - Sản phẩm cụ thể
  - Tối thiểu X kg  
  - Loại giao hàng (company/ship, parse từ note)
  - Từ khóa tìm kiếm
```

## Bước 1 — Thay thế màn hình Batch

Thay toàn bộ `/home/user/hai-san-shop/admin-app/app/(tabs)/batch.tsx`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, ScrollView, Clipboard,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ClipboardCopy, RefreshCcw, Filter, Package, Scale,
  Truck, Building2, ChevronDown, ChevronUp,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types';

interface CustomerBatch {
  key: string; // phone hoặc name
  name: string;
  phone: string;
  address: string;
  deliveryType: 'ship' | 'company' | 'unknown';
  note: string;
  items: { name: string; quantity: number; unit: string; price: number }[];
  totalWeight: number;
  totalAmount: number;
  orderIds: string[];
}

interface ProductSummary {
  name: string;
  unit: string;
  totalQty: number;
  customerCount: number;
}

// Detect delivery type từ note
function detectDelivery(note: string | null): 'ship' | 'company' | 'unknown' {
  if (!note) return 'unknown';
  const n = note.toLowerCase();
  if (n.includes('tại công ty') || n.includes('tai cong ty') || n.includes('company')) return 'company';
  if (n.includes('viettel') || n.includes('ship') || n.includes('giao tận') || n.includes('giao tan')) return 'ship';
  return 'unknown';
}

export default function BatchScreen() {
  const [batches, setBatches] = useState<CustomerBatch[]>([]);
  const [productSummary, setProductSummary] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterDelivery, setFilterDelivery] = useState<'all' | 'ship' | 'company'>('all');
  const [minWeight, setMinWeight] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [showSummary, setShowSummary] = useState(false);

  async function fetchBatches() {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id, total_amount, note, status,
        profiles(full_name, phone, address),
        order_items(quantity, price_at_time, products(name, unit, price))
      `)
      .in('status', ['pending', 'confirmed'])
      .order('created_at', { ascending: true });

    if (error || !orders) return;

    // Group by phone or name
    const map = new Map<string, CustomerBatch>();

    for (const order of orders as any[]) {
      const phone = order.profiles?.phone ?? '';
      const name = order.profiles?.full_name ?? 'Khách vãng lai';
      const key = phone || name;
      const delivery = detectDelivery(order.note);

      if (!map.has(key)) {
        map.set(key, {
          key,
          name,
          phone,
          address: order.profiles?.address ?? '',
          deliveryType: delivery,
          note: order.note ?? '',
          items: [],
          totalWeight: 0,
          totalAmount: 0,
          orderIds: [],
        });
      }

      const batch = map.get(key)!;
      batch.orderIds.push(order.id);
      batch.totalAmount += order.total_amount;

      for (const item of order.order_items ?? []) {
        const productName = item.products?.name ?? 'Sản phẩm không rõ';
        const unit = item.products?.unit ?? 'kg';
        const price = item.price_at_time;
        const qty = item.quantity;

        const existing = batch.items.find(i => i.name === productName);
        if (existing) {
          existing.quantity += qty;
        } else {
          batch.items.push({ name: productName, quantity: qty, unit, price });
        }

        if (unit === 'kg') batch.totalWeight += qty;
      }
    }

    const batchList = Array.from(map.values());

    // Build product summary
    const prodMap = new Map<string, ProductSummary>();
    for (const batch of batchList) {
      for (const item of batch.items) {
        if (!prodMap.has(item.name)) {
          prodMap.set(item.name, { name: item.name, unit: item.unit, totalQty: 0, customerCount: 0 });
        }
        const ps = prodMap.get(item.name)!;
        ps.totalQty += item.quantity;
        ps.customerCount++;
      }
    }

    setBatches(batchList);
    setProductSummary(Array.from(prodMap.values()).sort((a, b) => b.totalQty - a.totalQty));
  }

  useEffect(() => {
    fetchBatches().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBatches();
    setRefreshing(false);
  }, []);

  function toggleExpand(key: string) {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function copyBatch(batch: CustomerBatch) {
    const lines = [
      `👤 ${batch.name}${batch.phone ? ' - ' + batch.phone : ''}`,
      batch.address ? `📍 ${batch.address}` : null,
      batch.deliveryType === 'ship' ? '🚚 Giao ViettelPost' : batch.deliveryType === 'company' ? '🏢 Tại công ty' : null,
      '',
      '📦 Đơn hàng:',
      ...batch.items.map(i => `  • ${i.name}: ${i.quantity} ${i.unit}`),
      '',
      `💰 Tổng: ${batch.totalAmount.toLocaleString('vi-VN')}đ`,
      batch.note ? `📝 ${batch.note}` : null,
    ].filter(Boolean).join('\n');

    Clipboard.setString(lines);
    Alert.alert('Đã copy', 'Nội dung đã sao chép vào clipboard');
  }

  // Filtering
  const filtered = batches.filter(batch => {
    if (filterDelivery !== 'all' && batch.deliveryType !== filterDelivery) return false;
    if (minWeight && batch.totalWeight < parseFloat(minWeight)) return false;
    if (filterProduct) {
      const hasProduct = batch.items.some(i =>
        i.name.toLowerCase().includes(filterProduct.toLowerCase())
      );
      if (!hasProduct) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      if (!batch.name.toLowerCase().includes(s) &&
          !batch.phone.includes(s) &&
          !batch.note.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#38bdf8" size="large" /></View>;
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Chuẩn bị hàng</Text>
        <Text style={s.headerCount}>{filtered.length} khách</Text>
        <TouchableOpacity onPress={() => { setLoading(true); fetchBatches().finally(() => setLoading(false)); }}>
          <RefreshCcw color="#6b7280" size={20} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={s.filters}>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm tên, SĐT..."
          placeholderTextColor="#4b5563"
        />
        <TextInput
          style={s.filterInput}
          value={filterProduct}
          onChangeText={setFilterProduct}
          placeholder="Lọc sản phẩm..."
          placeholderTextColor="#4b5563"
        />
        <View style={s.filterRow}>
          <TextInput
            style={[s.filterInput, { flex: 1 }]}
            value={minWeight}
            onChangeText={setMinWeight}
            placeholder="Min kg..."
            placeholderTextColor="#4b5563"
            keyboardType="numeric"
          />
          {(['all', 'ship', 'company'] as const).map(d => (
            <TouchableOpacity
              key={d}
              onPress={() => setFilterDelivery(d)}
              style={[s.deliveryChip, filterDelivery === d && s.deliveryChipActive]}
            >
              {d === 'ship' ? <Truck color={filterDelivery === d ? '#38bdf8' : '#6b7280'} size={14} /> :
               d === 'company' ? <Building2 color={filterDelivery === d ? '#38bdf8' : '#6b7280'} size={14} /> :
               <Filter color={filterDelivery === d ? '#38bdf8' : '#6b7280'} size={14} />}
              <Text style={[s.deliveryChipText, filterDelivery === d && { color: '#38bdf8' }]}>
                {d === 'all' ? 'Tất cả' : d === 'ship' ? 'Ship' : 'Công ty'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Product summary toggle */}
      <TouchableOpacity style={s.summaryToggle} onPress={() => setShowSummary(!showSummary)}>
        <Package color="#a78bfa" size={16} />
        <Text style={s.summaryToggleText}>Tổng hợp sản phẩm ({productSummary.length} loại)</Text>
        {showSummary ? <ChevronUp color="#6b7280" size={16} /> : <ChevronDown color="#6b7280" size={16} />}
      </TouchableOpacity>

      {showSummary && (
        <View style={s.summaryBox}>
          {productSummary.map(p => (
            <View key={p.name} style={s.summaryRow}>
              <Text style={s.summaryName} numberOfLines={1}>{p.name}</Text>
              <Text style={s.summaryQty}>{p.totalQty.toFixed(1)} {p.unit}</Text>
              <Text style={s.summaryCount}>{p.customerCount} đơn</Text>
            </View>
          ))}
        </View>
      )}

      {/* Batch list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.key}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>Không có đơn hàng cần chuẩn bị</Text>
          </View>
        }
        renderItem={({ item }) => {
          const expanded = expandedKeys.has(item.key);
          return (
            <View style={s.card}>
              <TouchableOpacity onPress={() => toggleExpand(item.key)} style={s.cardHeader}>
                <View style={s.cardHeaderLeft}>
                  <Text style={s.customerName}>{item.name}</Text>
                  {item.phone ? <Text style={s.customerPhone}>{item.phone}</Text> : null}
                </View>
                <View style={s.cardHeaderRight}>
                  {item.deliveryType === 'ship' && <Truck color="#38bdf8" size={16} />}
                  {item.deliveryType === 'company' && <Building2 color="#a78bfa" size={16} />}
                  {item.totalWeight > 0 && (
                    <View style={s.weightBadge}>
                      <Scale color="#f59e0b" size={12} />
                      <Text style={s.weightText}>{item.totalWeight.toFixed(1)}kg</Text>
                    </View>
                  )}
                  {expanded ? <ChevronUp color="#6b7280" size={18} /> : <ChevronDown color="#6b7280" size={18} />}
                </View>
              </TouchableOpacity>

              {expanded && (
                <View style={s.cardDetail}>
                  {item.address ? <Text style={s.detailAddress}>📍 {item.address}</Text> : null}
                  {item.note ? <Text style={s.detailNote}>📝 {item.note}</Text> : null}

                  {item.items.map((i, idx) => (
                    <View key={idx} style={s.itemRow}>
                      <Text style={s.itemName}>{i.name}</Text>
                      <Text style={s.itemQty}>{i.quantity} {i.unit}</Text>
                    </View>
                  ))}

                  <View style={s.cardActions}>
                    <Text style={s.totalAmount}>{item.totalAmount.toLocaleString('vi-VN')}đ</Text>
                    <TouchableOpacity onPress={() => copyBatch(item)} style={s.copyBtn}>
                      <ClipboardCopy color="#38bdf8" size={16} />
                      <Text style={s.copyBtnText}>Copy Zalo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#030712' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937', gap: 8 },
  headerTitle: { color: '#f9fafb', fontSize: 20, fontWeight: '700', flex: 1 },
  headerCount: { color: '#6b7280', fontSize: 14 },
  filters: { padding: 12, gap: 8 },
  searchInput: { backgroundColor: '#1f2937', borderRadius: 10, borderWidth: 1, borderColor: '#374151', color: '#f9fafb', paddingHorizontal: 14, paddingVertical: 9, fontSize: 14 },
  filterInput: { backgroundColor: '#1f2937', borderRadius: 10, borderWidth: 1, borderColor: '#374151', color: '#f9fafb', paddingHorizontal: 14, paddingVertical: 9, fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  deliveryChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#374151' },
  deliveryChipActive: { borderColor: '#38bdf8', backgroundColor: '#0ea5e922' },
  deliveryChipText: { color: '#6b7280', fontSize: 13 },
  summaryToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#1f2937', gap: 8 },
  summaryToggleText: { color: '#a78bfa', fontSize: 14, flex: 1 },
  summaryBox: { backgroundColor: '#0f172a', padding: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937', gap: 6 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryName: { color: '#d1d5db', fontSize: 13, flex: 1 },
  summaryQty: { color: '#38bdf8', fontSize: 13, fontWeight: '600', minWidth: 70, textAlign: 'right' },
  summaryCount: { color: '#6b7280', fontSize: 12, minWidth: 50, textAlign: 'right' },
  list: { padding: 12, gap: 8 },
  empty: { padding: 48, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 16 },
  card: { backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1f2937' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  cardHeaderLeft: { flex: 1 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customerName: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
  customerPhone: { color: '#9ca3af', fontSize: 13 },
  weightBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f59e0b22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  weightText: { color: '#f59e0b', fontSize: 13, fontWeight: '600' },
  cardDetail: { borderTopWidth: 1, borderTopColor: '#1f2937', padding: 12, gap: 6 },
  detailAddress: { color: '#9ca3af', fontSize: 13 },
  detailNote: { color: '#d1d5db', fontSize: 13, backgroundColor: '#1f2937', padding: 8, borderRadius: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  itemName: { color: '#d1d5db', fontSize: 14, flex: 1 },
  itemQty: { color: '#a78bfa', fontSize: 14, fontWeight: '600' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1f2937' },
  totalAmount: { color: '#38bdf8', fontSize: 16, fontWeight: '700' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0ea5e922', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  copyBtnText: { color: '#38bdf8', fontSize: 13, fontWeight: '500' },
});
```

## Bước 2 — Commit & Push

```bash
cd /home/user/hai-san-shop
git add admin-app/
git commit -m "feat: batch preparation screen with filters and Zalo copy"
git push -u origin claude/seafood-admin-app-Gd7JI
```

## Verification
- Danh sách khách group theo phone/tên
- Tổng hợp sản phẩm hiện đúng số lượng
- Filter giao hàng/ship/công ty hoạt động
- Filter sản phẩm cụ thể hoạt động
- Copy Zalo tạo đúng format text

## NEXT: Phase 9
Sau khi xong, đọc `PHASE_9_BROADCAST.md` và thực thi.
