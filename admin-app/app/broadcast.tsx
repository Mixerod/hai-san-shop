import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Megaphone, Send, Trash2, Bell } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Notification, NotificationType } from '@/types';

const TYPES: { value: NotificationType; label: string; desc: string; color: string }[] = [
  { value: 'general', label: 'Thông báo chung', desc: 'Thông tin, chính sách, v.v.', color: '#38bdf8' },
  { value: 'new_product', label: 'Sản phẩm mới', desc: 'Giới thiệu sản phẩm vừa về', color: '#22c55e' },
  { value: 'price_change', label: 'Thay đổi giá', desc: 'Cập nhật bảng giá', color: '#f59e0b' },
];

export default function BroadcastScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('general');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Notification[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  async function fetchHistory() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setHistory(data as Notification[]);
  }

  useEffect(() => {
    fetchHistory().finally(() => setLoadingHistory(false));
  }, []);

  async function sendBroadcast() {
    if (!message.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung thông báo');
      return;
    }

    Alert.alert(
      'Xác nhận gửi',
      `Gửi thông báo đến tất cả khách hàng?\n\n"${message.trim()}"`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Gửi', style: 'default',
          onPress: async () => {
            setSending(true);
            const { error } = await supabase.from('notifications').insert({
              message: message.trim(),
              type,
            });

            if (error) {
              Alert.alert('Lỗi', 'Không thể gửi thông báo: ' + error.message);
            } else {
              setMessage('');
              await fetchHistory();
              Alert.alert('Thành công', 'Thông báo đã được gửi đến tất cả khách hàng!');
            }
            setSending(false);
          },
        },
      ]
    );
  }

  async function deleteNotification(id: string) {
    Alert.alert('Xoá thông báo', 'Xoá thông báo này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive',
        onPress: async () => {
          await supabase.from('notifications').delete().eq('id', id);
          fetchHistory();
        },
      },
    ]);
  }

  const selectedType = TYPES.find(t => t.value === type)!;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft color="#9ca3af" size={22} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Broadcast</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Megaphone color="#f59e0b" size={18} />
            <Text style={s.sectionTitle}>Soạn thông báo</Text>
          </View>

          <Text style={s.label}>Loại thông báo</Text>
          <View style={s.typeRow}>
            {TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                onPress={() => setType(t.value)}
                style={[s.typeChip, type === t.value && { backgroundColor: t.color + '22', borderColor: t.color }]}
              >
                <Text style={[s.typeChipText, type === t.value && { color: t.color }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.typeDesc}>{selectedType.desc}</Text>

          <Text style={s.label}>Nội dung</Text>
          <TextInput
            style={s.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder={
              type === 'new_product' ? 'Ví dụ: Hôm nay có Tôm hùm tươi 🦞 giá đặc biệt...' :
              type === 'price_change' ? 'Ví dụ: Cập nhật bảng giá tuần này...' :
              'Nhập nội dung thông báo...'
            }
            placeholderTextColor="#4b5563"
            multiline
            maxLength={500}
          />
          <Text style={s.charCount}>{message.length}/500</Text>

          <TouchableOpacity
            style={[s.sendBtn, (!message.trim() || sending) && s.sendBtnDisabled]}
            onPress={sendBroadcast}
            disabled={!message.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Send color="#fff" size={18} />
                <Text style={s.sendBtnText}>Gửi thông báo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Bell color="#38bdf8" size={18} />
            <Text style={s.sectionTitle}>Lịch sử gửi</Text>
          </View>

          {loadingHistory ? (
            <ActivityIndicator color="#38bdf8" />
          ) : history.length === 0 ? (
            <Text style={s.emptyText}>Chưa có thông báo nào</Text>
          ) : (
            history.map(notif => {
              const typeConfig = TYPES.find(t => t.value === notif.type) ?? TYPES[0];
              return (
                <View key={notif.id} style={s.historyItem}>
                  <View style={[s.typeDot, { backgroundColor: typeConfig.color }]} />
                  <View style={s.historyContent}>
                    <Text style={s.historyMessage}>{notif.message}</Text>
                    <View style={s.historyMeta}>
                      <Text style={[s.historyType, { color: typeConfig.color }]}>
                        {typeConfig.label}
                      </Text>
                      <Text style={s.historyTime}>
                        {new Date(notif.created_at).toLocaleDateString('vi-VN', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => deleteNotification(notif.id)} style={s.deleteBtn}>
                    <Trash2 color="#ef444466" size={16} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1f2937', gap: 8 },
  backBtn: { padding: 6 },
  headerTitle: { color: '#f9fafb', fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 20 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: '#f9fafb', fontSize: 16, fontWeight: '600' },
  label: { color: '#9ca3af', fontSize: 13 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#374151' },
  typeChipText: { color: '#6b7280', fontSize: 13, fontWeight: '500' },
  typeDesc: { color: '#4b5563', fontSize: 12, fontStyle: 'italic' },
  messageInput: {
    backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#374151',
    color: '#f9fafb', padding: 14, fontSize: 15, minHeight: 120,
    textAlignVertical: 'top', lineHeight: 22,
  },
  charCount: { color: '#374151', fontSize: 12, textAlign: 'right' },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0ea5e9', borderRadius: 12, paddingVertical: 14, gap: 8,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emptyText: { color: '#4b5563', fontSize: 14, textAlign: 'center', padding: 20 },
  historyItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#111827', borderRadius: 10, padding: 12, gap: 10,
    borderWidth: 1, borderColor: '#1f2937',
  },
  typeDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  historyContent: { flex: 1, gap: 4 },
  historyMessage: { color: '#d1d5db', fontSize: 14, lineHeight: 20 },
  historyMeta: { flexDirection: 'row', gap: 10 },
  historyType: { fontSize: 12, fontWeight: '500' },
  historyTime: { color: '#6b7280', fontSize: 12 },
  deleteBtn: { padding: 4 },
});
