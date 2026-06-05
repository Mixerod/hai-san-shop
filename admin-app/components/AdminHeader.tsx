import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface Props {
  title: string;
  rightElement?: React.ReactNode;
}

export default function AdminHeader({ title, rightElement }: Props) {
  const insets = useSafeAreaInsets();

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>
        {rightElement}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut color="#ef4444" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  title: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoutBtn: {
    padding: 6,
  },
});
