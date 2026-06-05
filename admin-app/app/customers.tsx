import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Phone, MapPin, ShoppingCart, DollarSign, Search } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import ErrorView from '@/components/ErrorView';
import { formatDateTime } from '@/lib/formatDate';

interface Customer {
  id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string | null;
}

export default function CustomersScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function fetchCustomers() {
    // Single joined query instead of 2 separate queries
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, address, orders(total_amount, status, created_at)');

    if (error) {
      setFetchError('Không thể tải danh sách khách hàng.');
      return;
    }

    setFetchError(null);

    const list: Customer[] = (data ?? [])
      .map(p => {
        const profileOrders = (p.orders as Array<{ total_amount: number; status: string; created_at: string }>) ?? [];
        if (profileOrders.length === 0) return null;
        return {
          id: p.id,
          full_name: p.full_name,
          phone: p.phone,
          address: p.address,
          totalOrders: profileOrders.length,
          totalSpent: profileOrders.filter(o => o.status === 'paid').reduce((s, o) => s + o.total_amount, 0),
          lastOrderDate: profileOrders.reduce<string | null>((latest, o) =>
            !latest || o.created_at > latest ? o.created_at : latest, null),
        } satisfies Customer;
      })
      .filter((c): c is Customer => c !== null)
      .sort((a, b) => b.totalSpent - a.totalSpent);

    setCustomers(list);
  }

  useEffect(() => {
    fetchCustomers().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  }, []);

  const filtered = customers.filter(c => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (c.full_name ?? '').toLowerCase().includes(s) || (c.phone ?? '').includes(s);
  });

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#38bdf8" size="large" /></View>;
  }

  if (fetchError) {
    return <ErrorView message={fetchError} onRetry={() => { setLoading(true); fetchCustomers().finally(() => setLoading(false)); }} />;
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft color="#9ca3af" size={22} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Khách hàng</Text>
        <Text style={s.headerCount}>{filtered.length} người</Text>
      </View>

      <View style={s.searchBox}>
        <Search color="#6b7280" size={16} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm tên, SĐT..."
          placeholderTextColor="#4b5563"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <User color="#374151" size={48} />
            <Text style={s.emptyText}>Chưa có khách hàng nào</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {(item.full_name ?? item.phone ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={s.content}>
              <Text style={s.name}>{item.full_name ?? 'Khách vãng lai'}</Text>
              {item.phone && (
                <View style={s.row}>
                  <Phone color="#6b7280" size={13} />
                  <Text style={s.sub}>{item.phone}</Text>
                </View>
              )}
              {item.address && (
                <View style={s.row}>
                  <MapPin color="#6b7280" size={13} />
                  <Text style={s.sub} numberOfLines={1}>{item.address}</Text>
                </View>
              )}
              <View style={s.statsRow}>
                <View style={s.statChip}>
                  <ShoppingCart color="#38bdf8" size={13} />
                  <Text style={s.statText}>{item.totalOrders} đơn</Text>
                </View>
                <View style={s.statChip}>
                  <DollarSign color="#22c55e" size={13} />
                  <Text style={[s.statText, { color: '#22c55e' }]}>
                    {item.totalSpent.toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              </View>
              {item.lastOrderDate && (
                <Text style={s.lastOrder}>
                  Đơn cuối: {formatDateTime(item.lastOrderDate)}
                </Text>
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#030712' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1f2937',
  },
  backBtn: { padding: 6 },
  headerTitle: { color: '#f9fafb', fontSize: 18, fontWeight: '700', flex: 1 },
  headerCount: { color: '#6b7280', fontSize: 14 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', margin: 12,
    backgroundColor: '#1f2937', borderRadius: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#374151',
  },
  searchInput: { flex: 1, color: '#f9fafb', paddingVertical: 10, marginLeft: 8, fontSize: 14 },
  list: { padding: 12, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 64, gap: 12 },
  emptyText: { color: '#6b7280', fontSize: 15 },
  card: {
    backgroundColor: '#111827', borderRadius: 12, borderWidth: 1,
    borderColor: '#1f2937', padding: 12, flexDirection: 'row', gap: 12,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#1f293766', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#374151',
  },
  avatarText: { color: '#38bdf8', fontSize: 20, fontWeight: '700' },
  content: { flex: 1, gap: 4 },
  name: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sub: { color: '#9ca3af', fontSize: 13, flex: 1 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: '#38bdf8', fontSize: 13, fontWeight: '600' },
  lastOrder: { color: '#4b5563', fontSize: 12 },
});
