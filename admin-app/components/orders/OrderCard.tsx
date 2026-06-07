import { useState, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, MapPin, Package, ExternalLink, Scale } from 'lucide-react-native';
import { Order, OrderStatus } from '@/types';
import { formatDateTime } from '@/lib/formatDate';
import { parseCustomerInfo } from '@/lib/parseCustomer';
import { useResponsive } from '@/hooks/useResponsive';

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
  onUpdateStatus: (id: string, status: OrderStatus) => Promise<void> | void;
}

function OrderCard({ order, onUpdateStatus }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { fs } = useResponsive();
  const router = useRouter();
  const config = STATUS_CONFIG[order.status];
  const nextStatuses = NEXT_STATUSES[order.status] ?? [];

  const totalWeight = order.order_items
    .filter(i => i.products?.unit === 'kg')
    .reduce((acc, i) => acc + i.quantity, 0);

  const formattedDate = formatDateTime(order.created_at);

  const { name: customerName, phone: customerPhone } = parseCustomerInfo(
    order.note,
    order.profiles?.full_name ?? null,
    order.profiles?.phone ?? null
  );

  const itemsSummary = order.order_items
    .map(item => `${item.products?.name ?? 'SP'} (${item.quantity}${item.products?.unit ?? ''})`)
    .join(', ');

  async function handleUpdateStatus(status: OrderStatus) {
    if (updating) return;
    setUpdating(true);
    try {
      await onUpdateStatus(order.id, status);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <View style={styles.card}>
      {/* Header Row (Always Visible) */}
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={[styles.customerName, { fontSize: fs(16) }]}>{customerName}</Text>
          <View style={styles.metaRow}>
            {customerPhone !== '—' && (
              <Text style={[styles.customerPhone, { fontSize: fs(13) }]}>📞 {customerPhone}</Text>
            )}
            <Text style={[styles.orderDate, { fontSize: fs(12) }]}>{formattedDate}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, { backgroundColor: config.color + '22', borderColor: config.color }]}>
            <Text style={[styles.statusText, { color: config.color, fontSize: fs(12) }]}>{config.label}</Text>
          </View>
          {expanded ? <ChevronUp color="#9ca3af" size={18} /> : <ChevronDown color="#9ca3af" size={18} />}
        </View>
      </TouchableOpacity>

      {/* Items Summary & Total Weight (Always Visible) */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryLeft}>
          <Package color="#9ca3af" size={14} style={styles.summaryIcon} />
          <Text style={[styles.summaryText, { fontSize: fs(13) }]} numberOfLines={2}>{itemsSummary}</Text>
        </View>
        {totalWeight > 0 && (
          <View style={styles.weightBadge}>
            <Scale color="#a78bfa" size={12} />
            <Text style={[styles.weightText, { fontSize: fs(12) }]}>{totalWeight.toFixed(1)} kg</Text>
          </View>
        )}
      </View>

      {/* Price & Payment info (Always Visible) */}
      <View style={styles.priceRow}>
        <View style={styles.priceLeft}>
          <Text style={[styles.amountLabel, { fontSize: fs(12) }]}>Tổng:</Text>
          <Text style={[styles.amount, { fontSize: fs(16) }]}>{order.total_amount.toLocaleString('vi-VN')}đ</Text>
        </View>
        <Text style={[styles.paymentMethod, { fontSize: fs(12) }]}>
          💳 {PAYMENT_LABEL[order.payment_method] ?? order.payment_method}
        </Text>
        <Text style={[styles.orderIdMuted, { fontSize: fs(11) }]}>#{order.id.slice(-6).toUpperCase()}</Text>
      </View>

      {/* Expanded Details */}
      {expanded && (
        <View style={styles.detailSection}>
          {order.profiles?.address ? (
            <View style={styles.detailRow}>
              <MapPin color="#9ca3af" size={14} style={{ marginTop: 2 }} />
              <Text style={[styles.detailText, { fontSize: fs(13) }]}>{order.profiles.address}</Text>
            </View>
          ) : null}
          {order.note ? (
            <View style={styles.noteBox}>
              <Text style={[styles.noteText, { fontSize: fs(13) }]}>📝 {order.note}</Text>
            </View>
          ) : null}

          <Text style={[styles.breakdownTitle, { fontSize: fs(13) }]}>Chi tiết các món:</Text>
          {order.order_items.map((item) => (
            <View key={item.id} style={styles.breakdownItem}>
              <Text style={[styles.breakdownName, { fontSize: fs(13) }]}>{item.products?.name ?? 'Sản phẩm đã xoá'}</Text>
              <Text style={[styles.breakdownQty, { fontSize: fs(13) }]}>
                {item.quantity} {item.products?.unit ?? ''}
              </Text>
              <Text style={[styles.breakdownPrice, { fontSize: fs(13) }]}>
                {(item.price_at_time * item.quantity).toLocaleString('vi-VN')}đ
              </Text>
            </View>
          ))}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.detailBtn, { opacity: updating ? 0.6 : 1 }]}
              onPress={() => router.push({ pathname: '/order-detail', params: { id: order.id } })}
              disabled={updating}
            >
              <ExternalLink color="#9ca3af" size={14} />
              <Text style={[styles.detailBtnText, { fontSize: fs(13) }]}>Chi tiết</Text>
            </TouchableOpacity>
            {nextStatuses.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.actionBtn, { borderColor: STATUS_CONFIG[s].color }, updating && { opacity: 0.5 }]}
                onPress={() => handleUpdateStatus(s)}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color={STATUS_CONFIG[s].color} />
                ) : (
                  <Text style={[styles.actionBtnText, { color: STATUS_CONFIG[s].color, fontSize: fs(13) }]}>
                    → {STATUS_CONFIG[s].label}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export default memo(OrderCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 14,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  customerName: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerPhone: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
  },
  orderDate: {
    color: '#6b7280',
    fontSize: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
    gap: 10,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryIcon: {
    marginRight: 6,
  },
  summaryText: {
    color: '#d1d5db',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  weightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#a78bfa22',
    borderColor: '#a78bfa44',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  weightText: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  priceLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  amountLabel: {
    color: '#9ca3af',
    fontSize: 12,
  },
  amount: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '700',
  },
  paymentMethod: {
    color: '#6b7280',
    fontSize: 12,
  },
  orderIdMuted: {
    color: '#374151',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  detailSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    paddingTop: 12,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  detailText: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  noteBox: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 10,
  },
  noteText: {
    color: '#d1d5db',
    fontSize: 13,
    lineHeight: 20,
  },
  breakdownTitle: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  breakdownName: {
    color: '#d1d5db',
    fontSize: 13,
    flex: 1,
  },
  breakdownQty: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '500',
  },
  breakdownPrice: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  detailBtnText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
