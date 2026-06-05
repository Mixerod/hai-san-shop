import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MessageSquare, ChevronRight, Send, ArrowLeft,
  Star, Trash2, CheckCheck,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface Conversation {
  identifier: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  rating: number | null;
}

interface Message {
  id: string;
  title: string;
  content: string;
  rating: number | null;
  is_read: boolean;
  created_at: string;
  isAdmin: boolean;
}

const ADMIN_PREFIX = '[ADMIN]';
const POLL_INTERVAL = 4000;

export default function ChatScreen() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentIdentifier, setCurrentIdentifier] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const listRef = useRef<FlatList>(null);
  // isFetching guard: prevent overlapping poll calls
  const isFetchingRef = useRef(false);

  // ─── Fetch functions ──────────────────────────────────────────────────────

  async function fetchConversations() {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('title, content, rating, is_read, created_at')
        .order('created_at', { ascending: false });

      if (error) { setChatError('Không thể tải tin nhắn.'); return; }
      if (!data) return;

      setChatError(null);
      const map = new Map<string, Conversation>();
      for (const row of data) {
        const id = row.title ?? 'unknown';
        if (id.startsWith(ADMIN_PREFIX)) continue;
        if (!map.has(id)) {
          map.set(id, {
            identifier: id,
            lastMessage: row.content,
            lastTime: row.created_at,
            unreadCount: 0,
            rating: row.rating,
          });
        }
        if (!row.is_read) {
          const conv = map.get(id)!;
          conv.unreadCount++;
        }
      }
      const list = Array.from(map.values());
      setConversations(list);
      setTotalUnread(list.reduce((acc, c) => acc + c.unreadCount, 0));
    } finally {
      isFetchingRef.current = false;
    }
  }

  async function fetchMessages(identifier: string) {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .or(`title.eq.${identifier},title.eq.${ADMIN_PREFIX}${identifier}`)
        .order('created_at', { ascending: true });
      if (error || !data) {
        setChatError('Không thể tải tin nhắn.');
        return;
      }
      setChatError(null);
      setMessages(data.map(row => ({
        ...row,
        isAdmin: row.title?.startsWith(ADMIN_PREFIX) ?? false,
      })));
    } finally {
      isFetchingRef.current = false;
    }
  }

  // ─── Single polling useEffect — switches target based on view ─────────────

  useEffect(() => {
    let mounted = true;

    async function poll() {
      if (!mounted) return;
      if (view === 'list') {
        await fetchConversations();
      } else {
        await fetchMessages(currentIdentifier);
      }
    }

    poll().finally(() => { if (mounted && loading) setLoading(false); });
    const timer = setInterval(poll, POLL_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentIdentifier]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (view === 'list') await fetchConversations();
    else await fetchMessages(currentIdentifier);
    setRefreshing(false);
  }, [view, currentIdentifier]);

  async function openConversation(identifier: string) {
    setCurrentIdentifier(identifier);
    // Mark read then switch view (polling useEffect picks up the new identifier)
    await supabase
      .from('feedbacks')
      .update({ is_read: true })
      .eq('title', identifier)
      .eq('is_read', false);
    setView('detail');
  }

  async function markAllRead(identifier: string) {
    const { error } = await supabase
      .from('feedbacks')
      .update({ is_read: true })
      .eq('title', identifier)
      .eq('is_read', false);
    if (!error) await fetchConversations();
  }

  async function sendReply() {
    if (!replyText.trim()) return;
    setSending(true);
    const { error } = await supabase.from('feedbacks').insert({
      title: ADMIN_PREFIX + currentIdentifier,
      content: replyText.trim(),
      is_read: true,
    });
    if (!error) {
      setReplyText('');
      await fetchMessages(currentIdentifier);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } else {
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
    }
    setSending(false);
  }

  async function deleteConversation(identifier: string) {
    Alert.alert('Xoá hội thoại', `Xoá toàn bộ tin nhắn với "${identifier}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('feedbacks')
            .delete()
            .or(`title.eq.${identifier},title.eq.${ADMIN_PREFIX}${identifier}`);
          if (error) Alert.alert('Lỗi', 'Không thể xoá hội thoại');
          else await fetchConversations();
        },
      },
    ]);
  }

  function goBack() {
    setMessages([]);
    setView('list'); // triggers polling useEffect to switch back to list poll
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#38bdf8" size="large" /></View>;
  }

  if (view === 'detail') {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.chatHeader}>
          <TouchableOpacity onPress={goBack} style={s.backBtn}>
            <ArrowLeft color="#9ca3af" size={22} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.chatTitle} numberOfLines={1}>{currentIdentifier}</Text>
          </View>
          <TouchableOpacity onPress={() => markAllRead(currentIdentifier)} style={s.iconBtn}>
            <CheckCheck color="#38bdf8" size={20} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          removeClippedSubviews
          renderItem={({ item }) => (
            <View style={[s.bubble, item.isAdmin ? s.bubbleAdmin : s.bubbleCustomer]}>
              {item.rating != null && (
                <View style={s.ratingRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n}
                      color={n <= item.rating! ? '#f59e0b' : '#374151'} size={14}
                      fill={n <= item.rating! ? '#f59e0b' : 'transparent'} />
                  ))}
                </View>
              )}
              <Text style={[s.bubbleText, item.isAdmin && s.bubbleTextAdmin]}>
                {item.content}
              </Text>
              <Text style={s.bubbleTime}>
                {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.inputRow}>
            <TextInput
              style={s.replyInput}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Trả lời..."
              placeholderTextColor="#4b5563"
              multiline
            />
            <TouchableOpacity onPress={sendReply} disabled={sending || !replyText.trim()} style={s.sendBtn}>
              {sending ? <ActivityIndicator color="#fff" size="small" /> : <Send color="#fff" size={18} />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Chat & Feedback</Text>
        {totalUnread > 0 && (
          <View style={s.unreadBadge}>
            <Text style={s.unreadBadgeText}>{totalUnread}</Text>
          </View>
        )}
      </View>

      {chatError && (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>{chatError}</Text>
        </View>
      )}

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.identifier}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
        contentContainerStyle={s.list}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        initialNumToRender={15}
        ListEmptyComponent={
          <View style={s.empty}>
            <MessageSquare color="#374151" size={48} />
            <Text style={s.emptyText}>Chưa có tin nhắn</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.convCard} onPress={() => openConversation(item.identifier)}>
            <View style={[s.avatar, item.unreadCount > 0 && { backgroundColor: '#0ea5e922' }]}>
              <Text style={s.avatarText}>{item.identifier.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={s.convContent}>
              <View style={s.convTop}>
                <Text style={[s.convName, item.unreadCount > 0 && { color: '#f9fafb', fontWeight: '700' }]}>
                  {item.identifier}
                </Text>
                <Text style={s.convTime}>
                  {new Date(item.lastTime).toLocaleDateString('vi-VN')}
                </Text>
              </View>
              <View style={s.convBottom}>
                <Text style={s.convPreview} numberOfLines={1}>{item.lastMessage}</Text>
                {item.unreadCount > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
              {item.rating != null && (
                <View style={s.ratingRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n}
                      color={n <= item.rating! ? '#f59e0b' : '#374151'} size={12}
                      fill={n <= item.rating! ? '#f59e0b' : 'transparent'} />
                  ))}
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => deleteConversation(item.identifier)} style={s.deleteBtn}>
              <Trash2 color="#ef4444" size={16} />
            </TouchableOpacity>
            <ChevronRight color="#374151" size={18} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#030712' },
  errorBanner: { backgroundColor: '#7f1d1d', padding: 10, paddingHorizontal: 16 },
  errorText: { color: '#fca5a5', fontSize: 13 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937', gap: 10 },
  headerTitle: { color: '#f9fafb', fontSize: 20, fontWeight: '700', flex: 1 },
  unreadBadge: { backgroundColor: '#ef4444', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  unreadBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  list: { padding: 12, paddingBottom: 100, gap: 8 },
  convCard: { backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1f2937', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#9ca3af', fontSize: 18, fontWeight: '700' },
  convContent: { flex: 1, gap: 4 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between' },
  convName: { color: '#d1d5db', fontSize: 15 },
  convTime: { color: '#6b7280', fontSize: 12 },
  convBottom: { flexDirection: 'row', alignItems: 'center' },
  convPreview: { color: '#6b7280', fontSize: 13, flex: 1 },
  badge: { backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 1 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  deleteBtn: { padding: 6 },
  empty: { alignItems: 'center', paddingTop: 64, gap: 12 },
  emptyText: { color: '#6b7280', fontSize: 16 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1f2937', gap: 8 },
  backBtn: { padding: 6 },
  chatTitle: { color: '#f9fafb', fontSize: 16, fontWeight: '600' },
  iconBtn: { padding: 6 },
  messageList: { padding: 16, gap: 8 },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 12, gap: 4 },
  bubbleCustomer: { backgroundColor: '#1f2937', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleAdmin: { backgroundColor: '#0ea5e933', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleText: { color: '#d1d5db', fontSize: 14, lineHeight: 20 },
  bubbleTextAdmin: { color: '#bae6fd' },
  bubbleTime: { color: '#6b7280', fontSize: 11, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#1f2937', gap: 10 },
  replyInput: { flex: 1, backgroundColor: '#1f2937', borderRadius: 20, borderWidth: 1, borderColor: '#374151', color: '#f9fafb', paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 120 },
  sendBtn: { backgroundColor: '#0ea5e9', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
});
