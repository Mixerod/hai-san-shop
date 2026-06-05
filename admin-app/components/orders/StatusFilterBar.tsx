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
