import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DollarSign,
  ShoppingCart,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  Megaphone,
  UserCircle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import ErrorView from '@/components/ErrorView';
import { useResponsive } from '@/hooks/useResponsive';

interface Stats {
  totalRevenue: number;
  pendingCount: number;
  pendingAmount: number;
  processingCount: number;
  totalOrders: number;
  uniqueCustomers: number;
  todayOrders: number;
  todayRevenue: number;
}

type Period = 'today' | 'week' | 'month' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hôm nay',
  week: 'Tuần này',
  month: 'Tháng này',
  all: 'Tất cả',
};

function getPeriodStart(period: Period): string | null {
  const now = new Date();
  switch (period) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return start.toISOString();
    }
    case 'week': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      return start.toISOString();
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return start.toISOString();
    }
    case 'all':
      return null;
  }
}

export default function DashboardScreen() {
  const router = useRouter();
  const { isTablet, fs } = useResponsive();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('month');
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function fetchStats() {
    const periodStart = getPeriodStart(period);

    let query = supabase
      .from('orders')
      .select('total_amount, status, payment_method, created_at, profiles(phone)');

    if (periodStart) {
      query = query.gte('created_at', periodStart);
    }

    const { data: orders, error } = await query;
    if (error) { setFetchError('Không thể tải thống kê. Kiểm tra kết nối mạng.'); return; }
    if (!orders) return;
    setFetchError(null);

    const todayStart = getPeriodStart('today')!;
    const todayOrders = orders.filter(o => o.created_at >= todayStart);

    const uniquePhones = new Set(
      orders.map(o => (o.profiles as any)?.phone).filter(Boolean)
    );

    setStats({
      totalRevenue: orders
        .filter(o => o.status === 'paid')
        .reduce((sum, o) => sum + o.total_amount, 0),
      pendingCount: orders.filter(o => o.status === 'pending').length,
      pendingAmount: orders
        .filter(o => ['done', 'delivering'].includes(o.status))
        .reduce((sum, o) => sum + o.total_amount, 0),
      processingCount: orders
        .filter(o => ['confirmed', 'delivering', 'done'].includes(o.status)).length,
      totalOrders: orders.length,
      uniqueCustomers: uniquePhones.size,
      todayOrders: todayOrders.length,
      todayRevenue: todayOrders
        .filter(o => o.status === 'paid')
        .reduce((sum, o) => sum + o.total_amount, 0),
    });
  }

  useEffect(() => {
    fetchStats().finally(() => setLoading(false));
  }, [period]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#38bdf8" size="large" />
      </View>
    );
  }

  if (fetchError) {
    return <ErrorView message={fetchError} onRetry={() => { setLoading(true); fetchStats().finally(() => setLoading(false)); }} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thống kê</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
        contentContainerStyle={styles.content}
      >
        {/* Period selector */}
        <View style={styles.periodRow}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => { setPeriod(p); setLoading(true); }}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            >
              <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today highlight */}
        <View style={styles.todayRow}>
          <View style={styles.todayCard}>
            <Text style={styles.todayLabel}>Hôm nay</Text>
            <Text style={styles.todayValue}>{stats?.todayOrders ?? 0} đơn</Text>
          </View>
          <View style={styles.todayCard}>
            <Text style={styles.todayLabel}>Thu hôm nay</Text>
            <Text style={[styles.todayValue, { color: '#22c55e' }]}>
              {(stats?.todayRevenue ?? 0).toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>

        {/* Stats grid — 3 cols on tablet, 2 on phone */}
        <View style={[styles.grid, isTablet && styles.gridTablet]}>
          <StatCard
            icon={<DollarSign color="#22c55e" size={22} />}
            label="Doanh thu"
            value={(stats?.totalRevenue ?? 0).toLocaleString('vi-VN') + 'đ'}
            color="#22c55e"
          />
          <StatCard
            icon={<AlertCircle color="#f59e0b" size={22} />}
            label="Chờ xác nhận"
            value={`${stats?.pendingCount ?? 0} đơn`}
            color="#f59e0b"
          />
          <StatCard
            icon={<TrendingUp color="#8b5cf6" size={22} />}
            label="Chưa thu tiền"
            value={(stats?.pendingAmount ?? 0).toLocaleString('vi-VN') + 'đ'}
            color="#8b5cf6"
          />
          <StatCard
            icon={<Clock color="#3b82f6" size={22} />}
            label="Đang xử lý"
            value={`${stats?.processingCount ?? 0} đơn`}
            color="#3b82f6"
          />
          <StatCard
            icon={<ShoppingCart color="#38bdf8" size={22} />}
            label="Tổng đơn"
            value={`${stats?.totalOrders ?? 0} đơn`}
            color="#38bdf8"
          />
          <StatCard
            icon={<Users color="#f472b6" size={22} />}
            label="Khách unique"
            value={`${stats?.uniqueCustomers ?? 0} người`}
            color="#f472b6"
          />
        </View>

        {/* Broadcast button */}
        <TouchableOpacity
          style={broadcastBtnStyle}
          onPress={() => router.push('/broadcast')}
        >
          <Megaphone color="#f59e0b" size={20} />
          <Text style={{ color: '#f9fafb', fontSize: 15, fontWeight: '600' }}>
            Gửi thông báo cho khách
          </Text>
        </TouchableOpacity>

        {/* Customers button */}
        <TouchableOpacity
          style={customersBtnStyle}
          onPress={() => router.push('/customers')}
        >
          <UserCircle color="#f472b6" size={20} />
          <Text style={{ color: '#f9fafb', fontSize: 15, fontWeight: '600' }}>
            Danh sách khách hàng
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const broadcastBtnStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 10,
  backgroundColor: '#111827',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#f59e0b44',
  paddingVertical: 14,
  marginTop: 8,
};

const customersBtnStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 10,
  backgroundColor: '#111827',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#f472b644',
  paddingVertical: 14,
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <View style={[statStyles.card, { borderColor: color + '33' }]}>
      <View style={[statStyles.iconBox, { backgroundColor: color + '22' }]}>
        {icon}
      </View>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    flexGrow: 1,
    flexBasis: '45%',   // ≥2 per row on phone, more on tablet via gridTablet
    gap: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: { color: '#9ca3af', fontSize: 13 },
  value: { fontSize: 18, fontWeight: '700' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#030712' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerTitle: { color: '#f9fafb', fontSize: 20, fontWeight: '700' },
  content: { padding: 16, gap: 16 },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },
  periodBtnActive: { backgroundColor: '#0ea5e922', borderColor: '#0ea5e9' },
  periodBtnText: { color: '#6b7280', fontSize: 13, fontWeight: '500' },
  periodBtnTextActive: { color: '#38bdf8' },
  todayRow: { flexDirection: 'row', gap: 12 },
  todayCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 4,
  },
  todayLabel: { color: '#6b7280', fontSize: 13 },
  todayValue: { color: '#f9fafb', fontSize: 22, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridTablet: { gap: 16 }, // tablet: more spacing, cards fill 3-per-row via flexBasis
});
