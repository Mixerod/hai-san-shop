import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';
import OrderCard from '@/components/orders/OrderCard';
import StatusFilterBar from '@/components/orders/StatusFilterBar';
import ErrorView from '@/components/ErrorView';
import { useDebounce } from '@/hooks/useDebounce';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const channelId = useRef(`orders-${Math.random().toString(36).slice(2)}`);

  async function fetchOrders() {
    let query = supabase
      .from('orders')
      .select(`*, profiles(full_name, phone, address), order_items(*, products(name, unit, price))`)
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;
    if (error) {
      setFetchError('Không thể tải đơn hàng. Kiểm tra kết nối mạng.');
    } else if (data) {
      setFetchError(null);
      setOrders(data as Order[]);
    }
  }

  useEffect(() => {
    fetchOrders().finally(() => setLoading(false));

    const channel = supabase
      .channel(channelId.current)
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

  const debouncedSearch = useDebounce(search);

  const filteredOrders = useMemo(() => orders.filter(order => {
    if (!debouncedSearch.trim()) return true;
    const s = debouncedSearch.toLowerCase();
    const name = order.profiles?.full_name?.toLowerCase() ?? '';
    const phone = order.profiles?.phone ?? '';
    const note = order.note?.toLowerCase() ?? '';
    return name.includes(s) || phone.includes(s) || note.includes(s);
  }), [orders, debouncedSearch]);

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

  if (fetchError) {
    return <ErrorView message={fetchError} onRetry={() => { setLoading(true); fetchOrders().finally(() => setLoading(false)); }} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đơn hàng</Text>
        <Text style={styles.headerCount}>{filteredOrders.length} đơn</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm tên, SĐT, ghi chú..."
          placeholderTextColor="#4b5563"
        />
      </View>

      <StatusFilterBar selected={filterStatus} onSelect={setFilterStatus} />

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
        removeClippedSubviews
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={10}
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
  listContent: { padding: 12, paddingTop: 0, paddingBottom: 100, gap: 8 },
  empty: { padding: 48, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 16 },
});
