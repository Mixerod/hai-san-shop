import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, User, Phone, MapPin, Package, ExternalLink } from 'lucide-react-native';
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
  const router = useRouter();
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
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.topRow}>
        <View>
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

      <View style={styles.customerRow}>
        <User color="#9ca3af" size={14} />
        <Text style={styles.customerName}>{order.profiles?.full_name ?? 'Khách vãng lai'}</Text>
        <Phone color="#9ca3af" size={14} />
        <Text style={styles.customerPhone}>{order.profiles?.phone ?? '—'}</Text>
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amount}>
          {order.total_amount.toLocaleString('vi-VN')}đ
        </Text>
        {totalWeight > 0 && (
          <Text style={styles.weight}>{totalWeight.toFixed(1)} kg</Text>
        )}
        <Text style={styles.payment}>{PAYMENT_LABEL[order.payment_method] ?? order.payment_method}</Text>
      </View>

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

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.detailBtn}
              onPress={() => router.push({ pathname: '/order-detail', params: { id: order.id } })}
            >
              <ExternalLink color="#6b7280" size={14} />
              <Text style={styles.detailBtnText}>Chi tiết</Text>
            </TouchableOpacity>
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
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#374151' },
  detailBtnText: { color: '#6b7280', fontSize: 13 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontWeight: '500' },
});
