import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, User, Phone, MapPin, Package, DollarSign,
  Clock, CheckCircle, Truck, XCircle,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';
import ErrorView from '@/components/ErrorView';
import { formatDateTime } from '@/lib/formatDate';
import { parseCustomerInfo } from '@/lib/parseCustomer';
import { useResponsive } from '@/hooks/useResponsive';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:    { label: 'Chờ xác nhận', color: '#f59e0b', icon: <Clock color="#f59e0b" size={16} /> },
  confirmed:  { label: 'Đã xác nhận',  color: '#3b82f6', icon: <CheckCircle color="#3b82f6" size={16} /> },
  delivering: { label: 'Đang giao',    color: '#8b5cf6', icon: <Truck color="#8b5cf6" size={16} /> },
  done:       { label: 'Đã giao',      color: '#10b981', icon: <CheckCircle color="#10b981" size={16} /> },
  paid:       { label: 'Đã thanh toán', color: '#22c55e', icon: <DollarSign color="#22c55e" size={16} /> },
  cancelled:  { label: 'Đã huỷ',       color: '#ef4444', icon: <XCircle color="#ef4444" size={16} /> },
};

const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['delivering', 'cancelled'],
  delivering: ['done'],
  done:       ['paid'],
};

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const { fs } = useResponsive();

  async function fetchOrder() {
    if (!id) return;
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles(full_name, phone, address), order_items(*, products(name, unit, price))')
      .eq('id', id)
      .single();

    if (error) {
      setFetchError('Không thể tải chi tiết đơn hàng.');
    } else {
      setFetchError(null);
      setOrder(data as Order);
    }
  }

  useEffect(() => {
    fetchOrder().finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(newStatus: OrderStatus) {
    if (!order) return;
    setUpdating(true);
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
    if (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    } else {
      await fetchOrder();
      Alert.alert('Đã cập nhật', `Trạng thái: ${STATUS_CONFIG[newStatus].label}`);
    }
    setUpdating(false);
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#38bdf8" size="large" /></View>;
  }

  if (fetchError || !order) {
    return <ErrorView message={fetchError ?? 'Không tìm thấy đơn hàng'} onRetry={() => { setLoading(true); fetchOrder().finally(() => setLoading(false)); }} />;
  }

  const config = STATUS_CONFIG[order.status];
  const nextStatuses = NEXT_STATUSES[order.status] ?? [];
  const totalWeight = order.order_items
    .filter(i => i.products?.unit === 'kg')
    .reduce((sum, i) => sum + i.quantity, 0);

  const { name: customerName, phone: customerPhone } = parseCustomerInfo(
    order.note,
    order.profiles?.full_name ?? null,
    order.profiles?.phone ?? null
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft color="#9ca3af" size={22} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { fontSize: fs(16) }]}>#{order.id.slice(-8).toUpperCase()}</Text>
          <Text style={[s.headerDate, { fontSize: fs(12) }]}>
            {formatDateTime(order.created_at)}
          </Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: config.color + '22', borderColor: config.color }]}>
          {config.icon}
          <Text style={[s.statusText, { color: config.color, fontSize: fs(12) }]}>{config.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Customer info */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { fontSize: fs(13) }]}>Khách hàng</Text>
          <View style={s.infoCard}>
            <InfoRow icon={<User color="#9ca3af" size={15} />} text={customerName} />
            {customerPhone !== '—' && <InfoRow icon={<Phone color="#9ca3af" size={15} />} text={customerPhone} />}
            {order.profiles?.address && <InfoRow icon={<MapPin color="#9ca3af" size={15} />} text={order.profiles.address} />}
          </View>
        </View>

        {/* Order items */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { fontSize: fs(13) }]}>Sản phẩm ({order.order_items.length} loại)</Text>
          <View style={s.infoCard}>
            {order.order_items.map((item) => (
              <View key={item.id} style={s.itemRow}>
                <Package color="#6b7280" size={14} />
                <Text style={[s.itemName, { fontSize: fs(14) }]} numberOfLines={1}>{item.products?.name ?? 'Sản phẩm đã xoá'}</Text>
                <Text style={[s.itemQty, { fontSize: fs(13) }]}>{item.quantity} {item.products?.unit ?? ''}</Text>
                <Text style={[s.itemPrice, { fontSize: fs(13) }]}>{(item.price_at_time * item.quantity).toLocaleString('vi-VN')}đ</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Payment summary */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { fontSize: fs(13) }]}>Thanh toán</Text>
          <View style={s.infoCard}>
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, { fontSize: fs(14) }]}>Hình thức</Text>
              <Text style={[s.summaryValue, { fontSize: fs(14) }]}>{order.payment_method === 'cod' ? 'Tiền mặt (COD)' : 'Chuyển khoản'}</Text>
            </View>
            {totalWeight > 0 && (
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { fontSize: fs(14) }]}>Tổng kg</Text>
                <Text style={[s.summaryValue, { color: '#a78bfa', fontSize: fs(14) }]}>{totalWeight.toFixed(1)} kg</Text>
              </View>
            )}
            <View style={[s.summaryRow, s.totalRow]}>
              <Text style={[s.totalLabel, { fontSize: fs(16) }]}>Tổng tiền</Text>
              <Text style={[s.totalValue, { fontSize: fs(20) }]}>{order.total_amount.toLocaleString('vi-VN')}đ</Text>
            </View>
          </View>
        </View>

        {/* Note */}
        {order.note && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { fontSize: fs(13) }]}>Ghi chú</Text>
            <View style={[s.infoCard, { padding: 12 }]}>
              <Text style={[s.noteText, { fontSize: fs(14) }]}>{order.note}</Text>
            </View>
          </View>
        )}

        {/* Actions */}
        {nextStatuses.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { fontSize: fs(13) }]}>Cập nhật trạng thái</Text>
            <View style={s.actionRow}>
              {nextStatuses.map((ns) => {
                const nc = STATUS_CONFIG[ns];
                return (
                  <TouchableOpacity
                    key={ns}
                    style={[s.actionBtn, { borderColor: nc.color, backgroundColor: nc.color + '11' }]}
                    onPress={() => updateStatus(ns)}
                    disabled={updating}
                  >
                    {updating ? <ActivityIndicator color={nc.color} size="small" /> : nc.icon}
                    <Text style={[s.actionBtnText, { color: nc.color, fontSize: fs(15) }]}>→ {nc.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  const { fs } = useResponsive();
  return (
    <View style={s.infoRow}>
      {icon}
      <Text style={[s.infoText, { fontSize: fs(14) }]}>{text}</Text>
    </View>
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
  headerTitle: { color: '#f9fafb', fontSize: 16, fontWeight: '700' },
  headerDate: { color: '#6b7280', fontSize: 12, marginTop: 1 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  content: { padding: 16, gap: 20 },
  section: { gap: 10 },
  sectionTitle: { color: '#9ca3af', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoCard: {
    backgroundColor: '#111827', borderRadius: 12, borderWidth: 1,
    borderColor: '#1f2937', overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937',
  },
  infoText: { color: '#d1d5db', fontSize: 14, flex: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  itemName: { color: '#d1d5db', fontSize: 14, flex: 1 },
  itemQty: { color: '#a78bfa', fontSize: 13 },
  itemPrice: { color: '#38bdf8', fontSize: 13, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  summaryLabel: { color: '#9ca3af', fontSize: 14 },
  summaryValue: { color: '#d1d5db', fontSize: 14 },
  totalRow: { borderBottomWidth: 0 },
  totalLabel: { color: '#f9fafb', fontSize: 16, fontWeight: '700' },
  totalValue: { color: '#38bdf8', fontSize: 20, fontWeight: '700' },
  noteText: { color: '#d1d5db', fontSize: 14, lineHeight: 22 },
  actionRow: { gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12, borderWidth: 1,
  },
  actionBtnText: { fontSize: 15, fontWeight: '600' },
});
