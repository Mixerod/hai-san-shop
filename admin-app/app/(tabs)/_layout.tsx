import { Tabs } from 'expo-router';
import { ShoppingCart, Package, MessageSquare, BarChart2, ClipboardList } from 'lucide-react-native';
import { useBadgeStore } from '@/store/badges';

export default function TabsLayout() {
  const { pendingOrders, unreadChat } = useBadgeStore();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#111827', borderTopColor: '#1f2937' },
        tabBarActiveTintColor: '#38bdf8',
        tabBarInactiveTintColor: '#6b7280',
        tabBarBadgeStyle: { backgroundColor: '#ef4444', color: '#fff', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Đơn hàng',
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
          tabBarBadge: pendingOrders > 0 ? pendingOrders : undefined,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Sản phẩm',
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
          tabBarBadge: unreadChat > 0 ? unreadChat : undefined,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Thống kê',
          tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="batch"
        options={{
          title: 'Chuẩn bị',
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
