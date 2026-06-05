import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, Switch, Alert, ActivityIndicator, Modal, ScrollView,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Product, ProductTag } from '@/types';
import ErrorView from '@/components/ErrorView';

const CATEGORIES = ['haisan','cá tươi','cá khô','tôm','cua','mực','chả','nước mắm','khác'];
const TAGS: { value: ProductTag; label: string }[] = [
  { value: 'none', label: 'Thường' },
  { value: 'new', label: 'Mới' },
  { value: 'best_seller', label: 'Bán chạy' },
  { value: 'rare', label: 'Hiếm' },
  { value: 'premium', label: 'Cao cấp' },
];
const TAG_COLORS: Record<ProductTag, string> = {
  none: '#6b7280', new: '#3b82f6', best_seller: '#f59e0b', rare: '#8b5cf6', premium: '#f472b6',
};

const EMPTY_FORM = {
  name: '', description: '', price: '', original_price: '', unit: 'kg',
  category: 'haisan', tag: 'none' as ProductTag, note: '', in_stock: true,
};

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setFetchError('Không thể tải sản phẩm. Kiểm tra kết nối mạng.');
    } else if (data) {
      setFetchError(null);
      setProducts(data as Product[]);
    }
  }

  useEffect(() => {
    fetchProducts().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageUri(null);
    setShowModal(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? '',
      price: String(product.price),
      original_price: String(product.original_price ?? ''),
      unit: product.unit,
      category: product.category,
      tag: product.tag,
      note: product.note ?? '',
      in_stock: product.in_stock,
    });
    setImageUri(product.image_url);
    setShowModal(true);
  }

  async function toggleStock(product: Product) {
    const { error } = await supabase
      .from('products')
      .update({ in_stock: !product.in_stock })
      .eq('id', product.id);
    if (!error) fetchProducts();
  }

  async function deleteProduct(product: Product) {
    Alert.alert('Xoá sản phẩm', `Xoá "${product.name}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive',
        onPress: async () => {
          await supabase.from('products').delete().eq('id', product.id);
          fetchProducts();
        },
      },
    ]);
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Cần quyền truy cập ảnh'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function uploadImage(uri: string): Promise<string | null> {
    try {
      const filename = `products/${Date.now()}_${uri.split('/').pop()}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const { error } = await supabase.storage
        .from('haisanshop')
        .upload(filename, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('haisanshop').getPublicUrl(filename);
      return data.publicUrl;
    } catch (e) {
      console.error('Upload error:', e);
      return null;
    }
  }

  async function saveProduct() {
    if (!form.name.trim() || !form.price) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên và giá sản phẩm');
      return;
    }
    setSaving(true);
    try {
      let imageUrl = editing?.image_url ?? null;

      if (imageUri && imageUri !== editing?.image_url) {
        imageUrl = await uploadImage(imageUri);
      }

      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        price: parseFloat(form.price),
        original_price: form.original_price ? parseFloat(form.original_price) : null,
        unit: form.unit,
        category: form.category,
        tag: form.tag,
        note: form.note || null,
        in_stock: form.in_stock,
        image_url: imageUrl,
      };

      if (editing) {
        await supabase.from('products').update(payload).eq('id', editing.id);
      } else {
        await supabase.from('products').insert(payload);
      }

      setShowModal(false);
      fetchProducts();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu sản phẩm');
    } finally {
      setSaving(false);
    }
  }

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#38bdf8" size="large" /></View>;
  }

  if (fetchError) {
    return <ErrorView message={fetchError} onRetry={() => { setLoading(true); fetchProducts().finally(() => setLoading(false)); }} />;
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Sản phẩm</Text>
        <TouchableOpacity onPress={openAdd} style={s.addBtn}>
          <Plus color="#fff" size={20} />
        </TouchableOpacity>
      </View>

      <View style={s.searchBox}>
        <Search color="#6b7280" size={16} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm sản phẩm..."
          placeholderTextColor="#4b5563"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={s.card}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={s.thumb} />
            ) : (
              <View style={[s.thumb, s.thumbPlaceholder]}>
                <Package color="#4b5563" size={24} />
              </View>
            )}
            <View style={s.cardContent}>
              <View style={s.cardTop}>
                <Text style={s.productName} numberOfLines={1}>{item.name}</Text>
                <View style={[s.tagBadge, { backgroundColor: TAG_COLORS[item.tag] + '22' }]}>
                  <Text style={[s.tagText, { color: TAG_COLORS[item.tag] }]}>
                    {TAGS.find(t => t.value === item.tag)?.label}
                  </Text>
                </View>
              </View>
              <View style={s.priceRow}>
                <Text style={s.price}>{item.price.toLocaleString('vi-VN')}đ/{item.unit}</Text>
                {item.original_price ? (
                  <Text style={s.originalPrice}>{item.original_price.toLocaleString('vi-VN')}đ</Text>
                ) : null}
              </View>
              <View style={s.cardBottom}>
                <Switch
                  value={item.in_stock}
                  onValueChange={() => toggleStock(item)}
                  trackColor={{ false: '#374151', true: '#22c55e44' }}
                  thumbColor={item.in_stock ? '#22c55e' : '#6b7280'}
                />
                <Text style={[s.stockText, { color: item.in_stock ? '#22c55e' : '#6b7280' }]}>
                  {item.in_stock ? 'Còn hàng' : 'Hết hàng'}
                </Text>
                <TouchableOpacity onPress={() => openEdit(item)} style={s.iconBtn}>
                  <Edit2 color="#38bdf8" size={18} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteProduct(item)} style={s.iconBtn}>
                  <Trash2 color="#ef4444" size={18} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <SafeAreaView style={s.modal} edges={['top', 'bottom']}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={s.cancelBtn}>Huỷ</Text>
              </TouchableOpacity>
              <Text style={s.modalTitle}>{editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</Text>
              <TouchableOpacity onPress={saveProduct} disabled={saving}>
                {saving ? <ActivityIndicator color="#38bdf8" /> : <Text style={s.saveBtn}>Lưu</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalContent}>
              <TouchableOpacity onPress={pickImage} style={s.imagePicker}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={s.imagePreview} />
                ) : (
                  <Text style={s.imagePickerText}>+ Chọn ảnh</Text>
                )}
              </TouchableOpacity>

              <FormField label="Tên sản phẩm *" value={form.name}
                onChangeText={(v: string) => setForm(f => ({ ...f, name: v }))} />
              <FormField label="Mô tả" value={form.description} multiline
                onChangeText={(v: string) => setForm(f => ({ ...f, description: v }))} />
              <FormField label="Giá (đ) *" value={form.price} keyboardType="numeric"
                onChangeText={(v: string) => setForm(f => ({ ...f, price: v }))} />
              <FormField label="Giá gốc (đ)" value={form.original_price} keyboardType="numeric"
                onChangeText={(v: string) => setForm(f => ({ ...f, original_price: v }))} />
              <FormField label="Đơn vị" value={form.unit}
                onChangeText={(v: string) => setForm(f => ({ ...f, unit: v }))} />

              <Text style={s.fieldLabel}>Danh mục</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {CATEGORIES.map(c => (
                    <TouchableOpacity key={c}
                      onPress={() => setForm(f => ({ ...f, category: c }))}
                      style={[s.chip, form.category === c && s.chipActive]}>
                      <Text style={[s.chipText, form.category === c && s.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={s.fieldLabel}>Tag</Text>
              <View style={s.tagRow}>
                {TAGS.map(t => (
                  <TouchableOpacity key={t.value}
                    onPress={() => setForm(f => ({ ...f, tag: t.value }))}
                    style={[s.chip, form.tag === t.value && { backgroundColor: TAG_COLORS[t.value] + '33', borderColor: TAG_COLORS[t.value] }]}>
                    <Text style={[s.chipText, form.tag === t.value && { color: TAG_COLORS[t.value] }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.stockRow}>
                <Text style={s.fieldLabel}>Còn hàng</Text>
                <Switch value={form.in_stock} onValueChange={(v) => setForm(f => ({ ...f, in_stock: v }))}
                  trackColor={{ false: '#374151', true: '#22c55e44' }}
                  thumbColor={form.in_stock ? '#22c55e' : '#6b7280'} />
              </View>

              <FormField label="Ghi chú nội bộ" value={form.note}
                onChangeText={(v: string) => setForm(f => ({ ...f, note: v }))} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function FormField({ label, value, onChangeText, multiline, keyboardType }: {
  label: string; value: string; onChangeText: (v: string) => void;
  multiline?: boolean; keyboardType?: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType as any ?? 'default'}
        placeholderTextColor="#4b5563"
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#030712' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  headerTitle: { color: '#f9fafb', fontSize: 20, fontWeight: '700' },
  addBtn: { backgroundColor: '#0ea5e9', borderRadius: 8, padding: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#1f2937', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#374151' },
  searchInput: { flex: 1, color: '#f9fafb', paddingVertical: 10, marginLeft: 8, fontSize: 14 },
  list: { padding: 12, gap: 8 },
  card: { backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1f2937', flexDirection: 'row', padding: 12, gap: 12 },
  thumb: { width: 60, height: 60, borderRadius: 8 },
  thumbPlaceholder: { backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  productName: { color: '#f9fafb', fontSize: 15, fontWeight: '600', flex: 1 },
  tagBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  tagText: { fontSize: 11, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { color: '#38bdf8', fontSize: 14, fontWeight: '600' },
  originalPrice: { color: '#6b7280', fontSize: 13, textDecorationLine: 'line-through' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockText: { fontSize: 12, flex: 1 },
  iconBtn: { padding: 6 },
  modal: { flex: 1, backgroundColor: '#030712' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  modalTitle: { color: '#f9fafb', fontSize: 17, fontWeight: '600' },
  cancelBtn: { color: '#9ca3af', fontSize: 16 },
  saveBtn: { color: '#38bdf8', fontSize: 16, fontWeight: '600' },
  modalContent: { padding: 16 },
  imagePicker: { backgroundColor: '#1f2937', borderRadius: 12, height: 140, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#374151', borderStyle: 'dashed' },
  imagePreview: { width: '100%', height: 140, borderRadius: 12 },
  imagePickerText: { color: '#6b7280', fontSize: 16 },
  fieldLabel: { color: '#9ca3af', fontSize: 13, marginBottom: 6 },
  input: { backgroundColor: '#1f2937', borderRadius: 10, borderWidth: 1, borderColor: '#374151', color: '#f9fafb', paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#374151' },
  chipActive: { backgroundColor: '#0ea5e922', borderColor: '#0ea5e9' },
  chipText: { color: '#6b7280', fontSize: 13 },
  chipTextActive: { color: '#38bdf8' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
});
