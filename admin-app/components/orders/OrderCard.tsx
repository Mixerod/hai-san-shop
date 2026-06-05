import { useState, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, MapPin, Package, ExternalLink, Scale } from 'lucide-react-native';
import { Order, OrderStatus } from '@/types';
import { formatDateTime } from '@/lib/formatDate';
import { parseCustomerInfo } from '@/lib/parseCustomer';

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

function OrderCard({ order, onUpdateStatus }: Props) {
  const [expanded, setExpanded] = useState(false);
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

  return (
    <View style={styles.card}>
      {/* Header Row (Always Visible) */}
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.customerName}>{customerName}</Text>
          <View style={styles.metaRow}>
            {customerPhone !== '—' && (
              <Text style={styles.customerPhone}>📞 {customerPhone}</Text>
            )}
            <Text style={styles.orderDate}>{formattedDate}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, { backgroundColor: config.color + '22', borderColor: config.color }]}>
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
          {expanded ? <ChevronUp color="#9ca3af" size={18} /> : <ChevronDown color="#9ca3af" size={18} />}
        </View>
      </TouchableOpacity>

      {/* Items Summary & Total Weight (Always Visible) */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryLeft}>
          <Package color="#9ca3af" size={14} style={styles.summaryIcon} />
          <Text style={styles.summaryText} numberOfLines={2}>{itemsSummary}</Text>
        </View>
        {totalWeight > 0 && (
          <View style={styles.weightBadge}>
            <Scale color="#a78bfa" size={12} />
            <Text style={styles.weightText}>{totalWeight.toFixed(1)} kg</Text>
          </View>
        )}
      </View>

      {/* Price & Payment info (Always Visible) */}
      <View style={styles.priceRow}>
        <View style={styles.priceLeft}>
          <Text style={styles.amountLabel}>Tổng:</Text>
          <Text style={styles.amount}>{order.total_amount.toLocaleString('vi-VN')}đ</Text>
        </View>
        <Text style={styles.paymentMethod}>
          💳 {PAYMENT_LABEL[order.payment_method] ?? order.payment_method}
        </Text>
        <Text style={styles.orderIdMuted}>#{order.id.slice(-6).toUpperCase()}</Text>
      </View>

      {/* Expanded Details */}
      {expanded && (
        <View style={styles.detailSection}>
          {order.profiles?.address ? (
            <View style={styles.detailRow}>
              <MapPin color="#9ca3af" size={14} style={{ marginTop: 2 }} />
              <Text style={styles.detailText}>{order.profiles.address}</Text>
            </View>
          ) : null}
          {order.note ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>📝 {order.note}</Text>
            </View>
          ) : null}

          <Text style={styles.breakdownTitle}>Chi tiết các món:</Text>
          {order.order_items.map((item) => (
            <View key={item.id} style={styles.breakdownItem}>
              <Text style={styles.breakdownName}>{item.products?.name ?? 'Sản phẩm đã xoá'}</Text>
              <Text style={styles.breakdownQty}>
                {item.quantity} {item.products?.unit ?? ''}
              </Text>
              <Text style={styles.breakdownPrice}>
                {(item.price_at_time * item.quantity).toLocaleString('vi-VN')}đ
              </Text>
            </View>
          ))}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.detailBtn}
              onPress={() => router.push({ pathname: '/order-detail', params: { id: order.id } })}
            >
              <ExternalLink color="#9ca3af" size={14} />
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
