"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  Package,
  Loader2,
  RefreshCcw,
  Download,
  DollarSign,
  Users,
  ShoppingCart,
  Calendar as CalendarIcon,
  Filter,
  Copy,
  CheckCircle2,
  Trash2,
  Megaphone,
  Send,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  UploadCloud,
  Image as ImageIcon,
  MessageSquare,
  Star,
  Fish,
  Phone,
  User,
  MapPin,
  AlertCircle,
  ClipboardList,
  ClipboardCopy,
  X,
  Menu,
  Check,
  Home,
  Sun,
  Moon,
  Scale,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  Plus
} from "lucide-react";

type OrderItem = {
  id: string;
  quantity: number;
  price_at_time: number;
  products: {
    name: string;
    unit: string;
  };
};

type Order = {
  id: string;
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  note: string;
  profiles: {
    full_name: string;
    phone: string;
  } | null;
  order_items: OrderItem[];
};

// Cấu hình mã màu Badge Trạng Thái chuyên nghiệp
const STATUSES = [
  {
    value: "pending",
    label: "Chờ xử lý",
    badge: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  },
  {
    value: "confirmed",
    label: "Đã xác nhận",
    badge: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  },
  {
    value: "delivering",
    label: "Đang giao",
    badge: "bg-sky-500/10 text-sky-400 border border-sky-500/30",
  },
  {
    value: "done",
    label: "Đã giao đến",
    badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
  },
  {
    value: "paid",
    label: "Đã thanh toán",
    badge: "bg-teal-500/10 text-teal-400 border border-teal-500/30",
  },
  {
    value: "cancelled",
    label: "Đã hủy",
    badge: "bg-red-500/10 text-red-400 border border-red-500/30",
  },
];

// Helper functions for delivery type and customer name parsing
const getCleanCustomerName = (order: Order) => {
  if (order.profiles?.full_name) return order.profiles.full_name;
  if (order.note) {
    const nameMatch = order.note.match(/Tên:\s*([^\n\r]+)/i);
    if (nameMatch && nameMatch[1]) return nameMatch[1].trim();
  }
  return 'Khách vãng lai';
};

// Trích xuất SĐT: ưu tiên profiles.phone, fallback parse từ note ("SĐT: 0xxx" hoặc bare phone)
const getCustomerPhone = (order: Order): string => {
  if (order.profiles?.phone) return order.profiles.phone;
  const note = order.note || '';
  if (!note) return '';
  // Match "SĐT: ..." / "SDT: ..." / "ĐT: ..." labels
  const labelled = note.match(/(?:SĐT|SDT|Đ?T|Phone|SĐt|Sđt)\s*[:\-]?\s*(\+?\d[\d\s.\-]{8,14})/i);
  if (labelled && labelled[1]) {
    const cleaned = labelled[1].replace(/[\s.\-]+/g, '').trim();
    if (/^(?:0|\+?84)\d{8,10}$/.test(cleaned)) return cleaned;
  }
  // Fallback: any Vietnamese-like phone (0 + 9 or 10 digits)
  const bare = note.match(/\b(0\d{9,10})\b/);
  if (bare && bare[1]) return bare[1];
  return '';
};

// Note đã loại bỏ phần Tên + SĐT để hiển thị sạch trong tooltip
const getDisplayNote = (order: Order): string => {
  if (!order.note) return '';
  return order.note
    .replace(/Tên\s*:[^\n\r]*/gi, '')
    .replace(/(?:SĐT|SDT|Đ?T|Phone)\s*[:\-]?\s*\+?\d[\d\s.\-]{8,14}/gi, '')
    .replace(/\b0\d{9,10}\b/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const getOrderWeight = (order: Order) => {
  return order.order_items.reduce((acc, item) => {
    const u = (item.products?.unit || "").toLowerCase();
    if (
      u.includes("kg") ||
      u.includes("ký") ||
      u.includes("ky") ||
      u.includes("kg/")
    ) {
      return acc + item.quantity;
    }
    return acc;
  }, 0);
};

const getDeliveryType = (order: Order) => {
  const noteLower = (order.note || '').toLowerCase();
  if (noteLower.includes('tại công ty') || noteLower.includes('tai cong ty')) {
    return 'company';
  }
  if (
    noteLower.includes('viettel post') || 
    noteLower.includes('giao nội thành tphcm') || 
    noteLower.includes('giao noi thanh tphcm') || 
    noteLower.includes('giao tận nơi') || 
    noteLower.includes('giao tan noi') || 
    noteLower.includes('sđt nhận') ||
    noteLower.includes('đc:') ||
    noteLower.includes('địa chỉ')
  ) {
    return 'ship';
  }
  return 'ship';
};

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Custom UI alert & confirm states
  const [adminAlert, setAdminAlert] = useState<{ title: string; message: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteFeedbackId, setConfirmDeleteFeedbackId] = useState<string | null>(null);
  const [confirmBulkUpdate, setConfirmBulkUpdate] = useState(false);

  // Bulk update states
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("confirmed");
  const [updatingBulk, setUpdatingBulk] = useState(false);

  // Column visibility states
  const [visibleFields, setVisibleFields] = useState({
    id: false,        // Mặc định ẩn Mã đơn
    details: true,
    phone: true,      // Tự động ẩn khi không có dữ liệu (linh hoạt)
    delivery: false,  // Mặc định ẩn cột Giao
    note: true,
    weight: true,
    payment: false,   // Mặc định ẩn cột COD/CK (tách thành cột riêng)
    date: true,
  });
  const [showFieldsDropdown, setShowFieldsDropdown] = useState(false);
  const isAnyColumnHidden = !visibleFields.details || !visibleFields.phone || !visibleFields.delivery || !visibleFields.note || !visibleFields.id || !visibleFields.weight || !visibleFields.payment || !visibleFields.date;

  // Multi-level sort & advanced filter (Excel-like)
  type SortKey = 'status' | 'name' | 'date' | 'total' | 'weight' | 'payment';
  type SortDir = 'asc' | 'desc';
  const [sortRules, setSortRules] = useState<{ key: SortKey; dir: SortDir }[]>([
    { key: 'status', dir: 'asc' },
    { key: 'name', dir: 'asc' },
  ]);
  const [advFilter, setAdvFilter] = useState({
    customerSearch: '',
    productSearch: '',
    paymentMethod: 'all' as 'all' | 'cod' | 'bank',
    deliveryType: 'all' as 'all' | 'company' | 'ship',
    minAmount: 0,
    hasNote: 'all' as 'all' | 'yes' | 'no',
  });
  const [showSortFilter, setShowSortFilter] = useState(false);
  const isAdvFilterActive = !!(
    advFilter.customerSearch ||
    advFilter.productSearch ||
    advFilter.paymentMethod !== 'all' ||
    advFilter.deliveryType !== 'all' ||
    advFilter.minAmount > 0 ||
    advFilter.hasNote !== 'all'
  );
  const isCustomSort = !(sortRules.length === 2 && sortRules[0].key === 'status' && sortRules[0].dir === 'asc' && sortRules[1].key === 'name' && sortRules[1].dir === 'asc');

  // Copy/Print source mode (sidebar): mẻ làm hàng vs đơn đang tick
  const [copySourceMode, setCopySourceMode] = useState<'prep' | 'selected'>('prep');

  // Theme toggle (dark / light) — persisted to localStorage
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('admin-theme') : null;
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch {}
  }, []);
  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { window.localStorage.setItem('admin-theme', next); } catch {}
      return next;
    });
  };

  // UI state for Mobile Drawer / Bottom Sheet
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Collapsible order cards
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const toggleExpandOrder = (id: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Preparation stats states
  const [activeTab, setActiveTab] = useState<"orders" | "products" | "feedbacks">("orders");
  const [subTab, setSubTab] = useState<'list' | 'preparation'>('list');
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const [prepLimit, setPrepLimit] = useState<number>(20);
  const [prepProductFilter, setPrepProductFilter] = useState<string>("all");
  const [showCustomerNames, setShowCustomerNames] = useState(true);
  const [prepMinWeight, setPrepMinWeight] = useState<number>(0);
  const [prepKeyword, setPrepKeyword] = useState<string>("");
  const [prepDeliveryFilter, setPrepDeliveryFilter] = useState<"all" | "company" | "ship">("all");
  const [isCompactMode, setIsCompactMode] = useState<boolean>(false);

  // Global Broadcast states
  const [globalMessage, setGlobalMessage] = useState("");
  const [globalType, setGlobalType] = useState<
    "general" | "new_product" | "price_change"
  >("general");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [showGlobalPanel, setShowGlobalPanel] = useState(false); // Collapsed by default on mobile

  const showAdminAlert = (title: string, message: string) => {
    setAdminAlert({ title, message });
  };

  async function handleSendNotification(messageText: string, typeVal: string) {
    if (!messageText.trim()) return;

    setSendingBroadcast(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        message: messageText,
        type: typeVal,
        created_at: new Date().toISOString(),
      });

      if (error) {
        if (
          error.message.includes("relation") &&
          error.message.includes("does not exist")
        ) {
          showAdminAlert(
            "Hướng dẫn cài đặt bảng notifications",
            '💡 Chào Quyết! Tính năng gửi thông báo yêu cầu có bảng "notifications" trong database.\n\nBạn vui lòng mở Supabase Dashboard -> SQL Editor và chạy đoạn code sau để tạo bảng:\n\nCREATE TABLE public.notifications (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  message text NOT NULL,\n  type text DEFAULT \'general\',\n  created_at timestamptz DEFAULT now() NOT NULL\n);\nALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Allow anon select" ON public.notifications FOR SELECT USING (true);\nCREATE POLICY "Allow admin all" ON public.notifications FOR ALL USING (true);'
          );
          return;
        }
        throw error;
      }

      showToast("Đã phát thông báo thành công! ⚡");
      setGlobalMessage("");
    } catch (err: any) {
      console.error(err);
      showAdminAlert("Lỗi gửi thông báo", err.message);
    } finally {
      setSendingBroadcast(false);
    }
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // -------------------------------------------------------------
  // Add Product states & logic
  // -------------------------------------------------------------
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    unit: 'kg',
    image_url: '',
    total_sold: 0,
    in_stock: true,
    note: '',
    category: 'haisan',
    original_price: null as number | null,
    tag: 'none'
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      // Loại bỏ dấu câu và khoảng trắng khỏi tên file, thêm timestamp để không bị trùng
      const safeName = file.name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
      const fileName = `${Date.now()}_${safeName}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('haisanshop')
        .upload(fileName, file);

      if (error) {
        if (error.message.includes('Bucket not found')) {
          throw new Error('Chưa tạo bucket "haisanshop" trên Supabase Storage. Hãy vào Storage tạo bucket "haisanshop" ở chế độ Public.');
        }
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from('haisanshop')
        .getPublicUrl(fileName);

      setNewProduct(prev => ({ ...prev, image_url: publicUrlData.publicUrl }));
      showToast('Đã tải ảnh lên thành công!');
    } catch (err: any) {
      console.error(err);
      if (err.message?.toLowerCase().includes('row-level security') || err.message?.toLowerCase().includes('violates row-level security')) {
        showAdminAlert(
          "Hướng dẫn RLS Storage",
          '💡 Chào Quyết! Tải ảnh không thành công do chính sách bảo mật (RLS) trên Supabase Storage của bạn đang chặn quyền ghi.\n\nVui lòng mở Supabase Dashboard -> SQL Editor và chạy đoạn lệnh sau để mở quyền cho bucket "haisanshop":\n\n' +
          'CREATE POLICY "Allow public select on haisanshop" ON storage.objects FOR SELECT TO public USING (bucket_id = \'haisanshop\');\n' +
          'CREATE POLICY "Allow public insert on haisanshop" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = \'haisanshop\');\n' +
          'CREATE POLICY "Allow public update on haisanshop" ON storage.objects FOR UPDATE TO public USING (bucket_id = \'haisanshop\') WITH CHECK (bucket_id = \'haisanshop\');\n' +
          'CREATE POLICY "Allow public delete on haisanshop" ON storage.objects FOR DELETE TO public USING (bucket_id = \'haisanshop\');'
        );
      } else {
        showAdminAlert("Lỗi tải ảnh", err.message);
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || newProduct.price <= 0) {
      showAdminAlert("Nhập dữ liệu lỗi", "Vui lòng nhập tên và giá sản phẩm hợp lệ!");
      return;
    }

    setAddingProduct(true);
    try {
      const { error } = await supabase
        .from('products')
        .insert([newProduct]);

      if (error) throw error;

      showToast('Đã thêm sản phẩm thành công!');
      setNewProduct({
        name: '',
        description: '',
        price: 0,
        unit: 'kg',
        image_url: '',
        total_sold: 0,
        in_stock: true,
        note: '',
        category: 'haisan',
        original_price: null,
        tag: 'none'
      });
      // Refresh danh sách sản phẩm sau khi thêm
      fetchProductsList();
    } catch (err: any) {
      console.error(err);
      if (err.message?.toLowerCase().includes('original_price') || err.message?.toLowerCase().includes('tag') || err.message?.toLowerCase().includes('column')) {
        showAdminAlert(
          "Cấu hình bảng products",
          '💡 Chào Quyết! Lỗi xảy ra do bảng "products" trong database của bạn chưa có hai cột "original_price" (giá gốc để hiển thị giá cũ gạch ngang) và "tag" (nhãn lấp lánh như bán chạy, hàng mới...).\n\nVui lòng mở Supabase Dashboard -> SQL Editor và chạy đoạn lệnh sau để thêm hai cột này vào database:\n\n' +
          'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_price numeric DEFAULT NULL;\n' +
          'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tag text DEFAULT \'none\';'
        );
      } else if (err.message?.toLowerCase().includes('row-level security') || err.message?.toLowerCase().includes('violates row-level security')) {
        showAdminAlert(
          "Chính sách bảo mật RLS",
          '💡 Chào Quyết! Thêm sản phẩm không thành công do chính sách bảo mật (RLS) trên bảng "products" của bạn đang chặn quyền ghi.\n\nVui lòng mở Supabase Dashboard -> SQL Editor và chạy dòng lệnh sau để mở quyền thêm sản phẩm:\n\n' +
          'CREATE POLICY "Allow public insert products" ON public.products FOR INSERT WITH CHECK (true);\n' +
          'CREATE POLICY "Allow public select products" ON public.products FOR SELECT USING (true);'
        );
      } else {
        showAdminAlert("Lỗi thêm sản phẩm", err.message);
      }
    } finally {
      setAddingProduct(false);
    }
  };

  const copyZaloMessage = (order: Order) => {
    const name = order.profiles?.full_name || "bạn";
    const shortId = order.id.slice(0, 8).toUpperCase();
    const total = order.total_amount.toLocaleString("vi-VN");
    const message = `Xin chào ${name}, đơn hàng hải sản của bạn (Mã đơn: ${shortId}) đã được giao đến nơi an toàn. Tổng chi phí cho đơn hàng này là ${total}đ. Bạn vui lòng sắp xếp thời gian để nhận hàng nhé. Xin cảm ơn bạn đã đặt hàng!\n(Đây là tin nhắn tự động từ hệ thống Hải Sản Sạch)`;

    navigator.clipboard.writeText(message);
    showToast("Đã copy mẫu tin nhắn!");
  };

  // Bộ lọc
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  // Product management states
  type ProductRow = {
    id: string;
    name: string;
    category: string | null;
    price: number;
    original_price: number | null;
    image_url: string | null;
    unit: string | null;
    description: string | null;
    note: string | null;
    tag: string | null;
    in_stock: boolean;
    created_at?: string;
  };
  const [productsList, setProductsList] = useState<ProductRow[]>([]);
  const [loadingProductsList, setLoadingProductsList] = useState(false);
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    fetchOrders();
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    if (activeTab === 'feedbacks') {
      fetchFeedbacks();
      const interval = setInterval(fetchFeedbacks, 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProductsList();
    }
  }, [activeTab]);

  async function fetchProductsList() {
    setLoadingProductsList(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProductsList((data as ProductRow[]) || []);
    } catch (err: any) {
      console.error('Lỗi tải sản phẩm:', err);
      showAdminAlert('Lỗi tải sản phẩm', err?.message || 'Không thể tải danh sách sản phẩm.');
    } finally {
      setLoadingProductsList(false);
    }
  }

  async function handleDeleteProduct(productId: string) {
    setDeletingProductId(productId);
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      setProductsList(prev => prev.filter(p => p.id !== productId));
      showToast('Đã xoá sản phẩm!');
    } catch (err: any) {
      console.error('Lỗi xoá sản phẩm:', err);
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('row-level security') || msg.includes('violates row-level security') || msg.includes('policy')) {
        showAdminAlert(
          'RLS chặn xoá sản phẩm',
          '💡 Chính sách bảo mật RLS trên bảng "products" đang chặn quyền XOÁ.\n\nVui lòng mở Supabase Dashboard → SQL Editor và chạy lệnh sau:\n\nCREATE POLICY "Allow public delete products" ON public.products FOR DELETE USING (true);\nCREATE POLICY "Allow public update products" ON public.products FOR UPDATE USING (true) WITH CHECK (true);'
        );
      } else if (msg.includes('foreign key') || msg.includes('violates foreign')) {
        showAdminAlert(
          'Sản phẩm đang được dùng trong đơn hàng',
          '💡 Sản phẩm này đang được tham chiếu trong bảng order_items. Không thể xoá trực tiếp.\n\nCách xử lý:\n1. Đánh dấu sản phẩm "Hết hàng" (toggle in_stock = false) thay vì xoá; HOẶC\n2. Cho phép xoá cascade — chạy lệnh sau trong Supabase:\n\nALTER TABLE public.order_items\n  DROP CONSTRAINT IF EXISTS order_items_product_id_fkey,\n  ADD CONSTRAINT order_items_product_id_fkey\n    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;'
        );
      } else {
        showAdminAlert('Lỗi xoá sản phẩm', err?.message || 'Không thể xoá sản phẩm.');
      }
    } finally {
      setDeletingProductId(null);
      setConfirmDeleteProductId(null);
    }
  }

  async function handleToggleProductStock(productId: string, newValue: boolean) {
    try {
      const { error } = await supabase.from('products').update({ in_stock: newValue }).eq('id', productId);
      if (error) throw error;
      setProductsList(prev => prev.map(p => p.id === productId ? { ...p, in_stock: newValue } : p));
      showToast(newValue ? 'Đã đánh dấu còn hàng' : 'Đã đánh dấu hết hàng');
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('row-level security') || msg.includes('policy')) {
        showAdminAlert(
          'RLS chặn cập nhật',
          '💡 Cần thêm policy UPDATE cho bảng products. Chạy trong Supabase SQL Editor:\n\nCREATE POLICY "Allow public update products" ON public.products FOR UPDATE USING (true) WITH CHECK (true);'
        );
      } else {
        showAdminAlert('Lỗi cập nhật', err?.message || 'Không thể cập nhật.');
      }
    }
  }

  async function fetchFeedbacks() {
    try {
      const { data, error } = await supabase
        .from("feedbacks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setFeedbacks(data);
    } catch (err) {
      console.error("Lỗi fetch feedbacks:", err);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedChatUser || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      // Lưu identifier vào title, message vào content; admin trả lời tự động đánh dấu đã đọc
      const { error } = await supabase
        .from('feedbacks')
        .insert({
          title: `[Reply] ${selectedChatUser}`,
          content: replyMessage.trim(),
          is_read: true,
        });

      if (error) throw error;
      setReplyMessage("");
      fetchFeedbacks();
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('column') || msg.includes('schema cache') || msg.includes('is_read') || msg.includes('title')) {
        showAdminAlert(
          'Bảng feedbacks thiếu cột',
          '💡 Vui lòng mở Supabase Dashboard → SQL Editor và chạy:\n\nALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS title text;\nALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS rating integer;\nALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;\n\nCREATE POLICY "Allow public update feedbacks" ON public.feedbacks FOR UPDATE USING (true) WITH CHECK (true);\nCREATE POLICY "Allow public delete feedbacks" ON public.feedbacks FOR DELETE USING (true);'
        );
      } else {
        showAdminAlert("Lỗi gửi phản hồi", err.message);
      }
    } finally {
      setSendingReply(false);
    }
  }

  // Đánh dấu tất cả tin nhắn của 1 khách thành "đã đọc"
  async function markChatAsRead(user: string) {
    try {
      const { error } = await supabase
        .from('feedbacks')
        .update({ is_read: true })
        .eq('title', `[Chat] ${user}`)
        .eq('is_read', false);
      if (error) throw error;
      // Cập nhật local state để UI phản hồi ngay
      setFeedbacks(prev => prev.map(f =>
        f.title === `[Chat] ${user}` && !f.is_read ? { ...f, is_read: true } : f
      ));
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('column') || msg.includes('is_read')) {
        showAdminAlert(
          'Thiếu cột is_read',
          '💡 Chạy trong Supabase SQL Editor:\n\nALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;'
        );
      }
      console.error('markChatAsRead error:', err);
    }
  }

  // Đánh dấu lại "chưa đọc" (toggle ngược)
  async function markChatAsUnread(user: string) {
    try {
      const { error } = await supabase
        .from('feedbacks')
        .update({ is_read: false })
        .eq('title', `[Chat] ${user}`);
      if (error) throw error;
      setFeedbacks(prev => prev.map(f =>
        f.title === `[Chat] ${user}` ? { ...f, is_read: false } : f
      ));
      showToast('Đã đánh dấu chưa đọc');
    } catch (err: any) {
      console.error('markChatAsUnread error:', err);
    }
  }

  // Xoá toàn bộ tin nhắn của 1 cuộc trò chuyện (cả [Chat] và [Reply])
  async function deleteChatSession(user: string) {
    try {
      const { error } = await supabase
        .from('feedbacks')
        .delete()
        .or(`title.eq.[Chat] ${user},title.eq.[Reply] ${user}`);
      if (error) throw error;
      showToast('Đã xoá cuộc trò chuyện');
      if (selectedChatUser === user) setSelectedChatUser(null);
      fetchFeedbacks();
    } catch (err: any) {
      showAdminAlert('Lỗi xoá cuộc trò chuyện', err.message);
    }
  }

  async function handleDeleteFeedback(id: string) {
    try {
      const { error } = await supabase.from('feedbacks').delete().eq('id', id);
      if (error) throw error;
      showToast("Đã xóa thành công!");
      fetchFeedbacks();
    } catch (err: any) {
      showAdminAlert("Lỗi xóa góp ý", err.message);
    }
  }

  async function fetchOrders() {
    setLoading(true);
    try {
      // BẮT BUỘC JOIN ĐỂ LẤY CHI TIẾT SẢN PHẨM & PROFILE
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          profiles(full_name, phone),
          order_items(*, products(name, unit))
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setOrders(data as any);
    } catch (error) {
      console.error("Lỗi khi fetch orders:", error);
      showAdminAlert("Lỗi tải dữ liệu", "Đã xảy ra lỗi khi tải dữ liệu từ server. Vui lòng làm mới lại.");
    } finally {
      setLoading(false);
    }
  }

  // Lọc dữ liệu bằng useMemo để tối ưu render
  const filteredOrders = useMemo(() => {
    const statusOrder: Record<string, number> = {
      pending: 0,
      confirmed: 1,
      delivering: 2,
      done: 3,        // Đã giao đến (chưa thanh toán)
      paid: 4,        // Đã thanh toán
      cancelled: 5,
    };
    const filtered = orders.filter((order) => {
      // 1. Lọc theo trạng thái nhanh — "active" = đơn cần xử lý (chưa thanh toán xong, chưa hủy)
      if (statusFilter === "active") {
        if (order.status === "paid" || order.status === "cancelled")
          return false;
      } else if (statusFilter === "unpaid") {
        // Filter "Chưa thanh toán": tất cả đơn chưa tick paid và chưa huỷ
        if (order.status === "paid" || order.status === "cancelled") return false;
      } else if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      // 2. Lọc theo khoảng thời gian
      if (startDate || endDate) {
        const orderDate = new Date(order.created_at);
        orderDate.setHours(0, 0, 0, 0);
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          if (orderDate < s) return false;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          if (orderDate > e) return false;
        }
      }

      // 3. Lọc nâng cao
      if (advFilter.customerSearch) {
        const name = getCleanCustomerName(order).toLowerCase();
        if (!name.includes(advFilter.customerSearch.toLowerCase().trim())) return false;
      }
      if (advFilter.productSearch) {
        const products = (order.order_items || []).map(it => it.products?.name || '').join(' ').toLowerCase();
        if (!products.includes(advFilter.productSearch.toLowerCase().trim())) return false;
      }
      if (advFilter.paymentMethod !== 'all') {
        const pm = (order.payment_method || '').toLowerCase();
        if (advFilter.paymentMethod === 'cod' && pm !== 'cod') return false;
        if (advFilter.paymentMethod === 'bank' && pm === 'cod') return false;
      }
      if (advFilter.deliveryType !== 'all') {
        if (getDeliveryType(order) !== advFilter.deliveryType) return false;
      }
      if (advFilter.minAmount > 0) {
        if ((order.total_amount || 0) < advFilter.minAmount) return false;
      }
      if (advFilter.hasNote !== 'all') {
        const hasNote = !!order.note && order.note.trim().length > 0;
        if (advFilter.hasNote === 'yes' && !hasNote) return false;
        if (advFilter.hasNote === 'no' && hasNote) return false;
      }
      return true;
    });

    // Sắp xếp đa cấp theo sortRules
    return [...filtered].sort((a, b) => {
      for (const rule of sortRules) {
        let cmp = 0;
        switch (rule.key) {
          case 'status':
            cmp = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
            break;
          case 'name':
            cmp = getCleanCustomerName(a).localeCompare(getCleanCustomerName(b), 'vi-VN');
            break;
          case 'date':
            cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
          case 'total':
            cmp = (a.total_amount || 0) - (b.total_amount || 0);
            break;
          case 'weight': {
            const wa = (a.order_items || []).reduce((s, it) => s + (it.quantity || 0), 0);
            const wb = (b.order_items || []).reduce((s, it) => s + (it.quantity || 0), 0);
            cmp = wa - wb;
            break;
          }
          case 'payment':
            cmp = (a.payment_method || '').localeCompare(b.payment_method || '');
            break;
        }
        if (rule.dir === 'desc') cmp = -cmp;
        if (cmp !== 0) return cmp;
      }
      return 0;
    });
  }, [orders, startDate, endDate, statusFilter, sortRules, advFilter]);

  // Auto-hide cột SĐT nếu không có đơn nào có SĐT (linh hoạt)
  const hasAnyPhone = useMemo(() => filteredOrders.some(o => !!getCustomerPhone(o)), [filteredOrders]);
  const showPhoneCol = visibleFields.phone && hasAnyPhone;

  const availableProducts = useMemo(() => {
    const products = new Set<string>();
    filteredOrders.forEach((o) => {
      if (o.status === "pending" || o.status === "confirmed") {
        o.order_items.forEach((item) => {
          if (item.products?.name) products.add(item.products.name);
        });
      }
    });
    return Array.from(products).sort();
  }, [filteredOrders]);

  const preparationData = useMemo(() => {
    let pendingOrders = [...filteredOrders].filter(
      (o) => o.status === "pending" || o.status === "confirmed",
    );

    // Lọc theo hình thức nhận hàng (tại công ty vs giao tận nơi/ship)
    if (prepDeliveryFilter !== "all") {
      pendingOrders = pendingOrders.filter(o => getDeliveryType(o) === prepDeliveryFilter);
    }

    // B1: Gom nhóm đơn theo khách hàng
    type CustomerGroup = {
      key: string;
      name: string;
      phone: string;
      notes: string[];
      orders: Order[];
      totalKg: number;
      earliestDate: number;
    };
    
    const customerGroups = new Map<string, CustomerGroup>();

    pendingOrders.forEach((order) => {
      const phone = getCustomerPhone(order);
      const name = order.profiles?.full_name || "Khách (Xem ghi chú)";
      const key = phone || name || order.id; // Fallback to id if no name or phone

      if (!customerGroups.has(key)) {
        customerGroups.set(key, {
          key,
          name,
          phone,
          notes: [],
          orders: [],
          totalKg: 0,
          earliestDate: Infinity,
        });
      }

      const group = customerGroups.get(key)!;
      group.orders.push(order);
      if (order.note) group.notes.push(order.note);
      
      const orderDate = new Date(order.created_at).getTime();
      if (orderDate < group.earliestDate) group.earliestDate = orderDate;

      // Tính tổng số Kg của khách này (không phụ thuộc vào bộ lọc sản phẩm để lọc khách)
      order.order_items.forEach((item) => {
        const u = (item.products?.unit || "").toLowerCase();
        if (
          u.includes("kg") ||
          u.includes("ký") ||
          u.includes("ky") ||
          u.includes("kg/")
        ) {
          group.totalKg += item.quantity;
        }
      });
    });

    // B2: Lọc các nhóm khách hàng theo keyword và min weight
    let filteredGroups = Array.from(customerGroups.values()).filter((group) => {
      // Lọc theo min weight
      if (prepMinWeight > 0 && group.totalKg < prepMinWeight) return false;
      
      // Lọc theo keyword (tìm trong tên, SĐT, ghi chú)
      if (prepKeyword.trim()) {
        const kw = prepKeyword.toLowerCase();
        const combinedText = `${group.name} ${group.phone} ${group.notes.join(" ")}`.toLowerCase();
        if (!combinedText.includes(kw)) return false;
      }
      
      return true;
    });

    // B3: Sắp xếp các nhóm khách hàng ưu tiên người đặt sớm nhất
    filteredGroups.sort((a, b) => a.earliestDate - b.earliestDate);

    // B4: Bắt đầu lấy đơn hàng vào mẻ (Batching), dừng khi đạt Max Weight
    let currentTotalKg = 0;
    const aggregatedProducts = new Map<
      string,
      { totalQty: number; unit: string }
    >();
    const includedOrders: Order[] = [];

    for (const group of filteredGroups) {
      let groupTotalKg = 0;
      let hasRelevantProductForThisGroup = false;

      // Tính toán Kg thực tế sẽ đưa vào mẻ (chỉ những SP được lọc)
      group.orders.forEach(order => {
        order.order_items.forEach((item) => {
          const pName = item.products?.name || "SP";
          if (prepProductFilter !== "all" && pName !== prepProductFilter) return;

          const u = (item.products?.unit || "").toLowerCase();
          if (
            u.includes("kg") ||
            u.includes("ký") ||
            u.includes("ky") ||
            u.includes("kg/")
          ) {
            groupTotalKg += item.quantity;
          }
          hasRelevantProductForThisGroup = true;
        });
      })
      
      if (hasRelevantProductForThisGroup) {
        // Kiểm tra xem thêm KH này vào thì có bị lố Max limit không
        if (
          prepLimit > 0 &&
          currentTotalKg + groupTotalKg > prepLimit &&
          currentTotalKg > 0
        ) {
          // Ngắt mẻ, không gom KH này nữa
          break;
        }
        
        currentTotalKg += groupTotalKg;
        // Đưa TẤT CẢ đơn của KH này vào mẻ
        includedOrders.push(...group.orders);

        group.orders.forEach(order => {
          order.order_items.forEach((item) => {
            const pName = item.products?.name || "SP";
            if (prepProductFilter !== "all" && pName !== prepProductFilter)
              return;

            if (!aggregatedProducts.has(pName)) {
              aggregatedProducts.set(pName, {
                totalQty: 0,
                unit: item.products?.unit || "kg",
              });
            }
            aggregatedProducts.get(pName)!.totalQty += item.quantity;
          });
        });
      }
    }

    return {
      aggregatedProducts: Array.from(aggregatedProducts.entries()),
      includedOrders,
      totalKg: currentTotalKg,
    };
  }, [filteredOrders, prepLimit, prepProductFilter, prepMinWeight, prepKeyword, prepDeliveryFilter]);

  const handleBulkUpdateStatus = async () => {
    if (selectedOrderIds.size === 0) return;

    setUpdatingBulk(true);
    try {
      const idsArray = Array.from(selectedOrderIds);
      const { error } = await supabase
        .from("orders")
        .update({ status: bulkStatus })
        .in("id", idsArray);

      if (error) throw error;

      setOrders(
        orders.map((o) =>
          selectedOrderIds.has(o.id) ? { ...o, status: bulkStatus } : o,
        ),
      );
      setSelectedOrderIds(new Set());
      showToast(`Đã cập nhật ${idsArray.length} đơn hàng!`);
    } catch (error) {
      console.error("Lỗi cập nhật hàng loạt:", error);
      showAdminAlert("Lỗi cập nhật hàng loạt", "Không thể cập nhật trạng thái hàng loạt.");
    } finally {
      setUpdatingBulk(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  const toggleSelectOrder = (id: string) => {
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedOrderIds(newSet);
  };

  // Tính toán 3 Card Thống Kê Nhanh
  const summary = useMemo(() => {
    let revenue = 0;        // Doanh thu thực thu (status === paid)
    let pendingPayment = 0; // Tổng tiền tất cả đơn chưa thanh toán (chưa paid & chưa cancelled)
    let unpaidCount = 0;    // Số đơn chưa thanh toán
    let totalOrders = filteredOrders.length;
    const uniqueCustomers = new Set<string>();

    filteredOrders.forEach((o) => {
      if (o.status === "paid") {
        revenue += o.total_amount;
      } else if (o.status !== "cancelled") {
        // Bất kỳ đơn nào chưa được tick "Đã thanh toán" và chưa bị huỷ → tính là chưa thu
        pendingPayment += o.total_amount;
        unpaidCount += 1;
      }

      // Bóc tách KH từ profile hoặc ghi chú (helper)
      const phone = getCustomerPhone(o);
      if (phone) uniqueCustomers.add(phone);
    });

    return {
      revenue,
      pendingPayment,
      unpaidCount,
      totalOrders,
      totalCustomers: uniqueCustomers.size,
    };
  }, [filteredOrders]);

  // Cập nhật trạng thái
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;
      setOrders(
        orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
    } catch (error: any) {
      console.error("Lỗi cập nhật trạng thái:", error);
      const msg = (error?.message || '').toLowerCase();
      // Nếu DB có CHECK constraint trên column status → hướng dẫn ALTER
      if (msg.includes('check') || msg.includes('constraint') || msg.includes('invalid input')) {
        showAdminAlert(
          'Database constraint chặn status mới',
          `💡 Bảng "orders" trong Supabase đang có CHECK constraint trên cột status, không cho phép giá trị mới (vd: "paid").\n\nVui lòng mở Supabase Dashboard → SQL Editor và chạy lệnh sau để bỏ constraint cũ + thêm constraint mới:\n\n-- Bỏ constraint cũ (tên constraint có thể khác — kiểm tra trong dashboard nếu cần)\nALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;\n\n-- Thêm constraint mới với đầy đủ status\nALTER TABLE public.orders ADD CONSTRAINT orders_status_check\n  CHECK (status IN ('pending', 'confirmed', 'delivering', 'done', 'paid', 'cancelled'));`
        );
      } else {
        showAdminAlert('Lỗi cập nhật', error?.message || 'Không thể cập nhật trạng thái đơn hàng.');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      // 1. Xóa chi tiết đơn hàng trước
      // Sử dụng .select() để kiểm tra xem có thực sự xóa được không
      const { data: itemsDeleted, error: itemsError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderId)
        .select();

      if (itemsError) throw itemsError;

      // 2. Xóa đơn hàng chính
      const { data: orderDeleted, error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId)
        .select();

      if (error) throw error;

      // Kiểm tra xem có bản ghi nào thực sự bị xóa không (RLS check)
      if (!orderDeleted || orderDeleted.length === 0) {
        showAdminAlert(
          "Không thể xóa đơn hàng",
          "Lỗi: Không thể xóa đơn hàng này khỏi Database. \n\nNguyên nhân có thể do chính sách bảo mật (RLS) trên Supabase của bạn chưa cho phép xóa đơn hàng của khách khác. Bạn hãy vào Supabase Dashboard để kiểm tra phần Policies của bảng orders nhé!"
        );
        return;
      }

      setOrders(orders.filter((o) => o.id !== orderId));
      showToast("Đã xóa đơn hàng vĩnh viễn!");
    } catch (error: any) {
      console.error("Lỗi khi xóa đơn hàng:", error);
      showAdminAlert("Lỗi hệ thống", error.message || "Lỗi không xác định");
    } finally {
      setUpdatingId(null);
    }
  };

  // Tính năng Export CSV (Dùng Native JS Blob API)
  const handleExport = () => {
    if (filteredOrders.length === 0) return;
    setExporting(true);

    try {
      const escapeCSV = (str: string) => `"${String(str).replace(/"/g, '""')}"`;
      const downloadCSV = (content: string, filename: string) => {
        const blob = new Blob(["\uFEFF" + content], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };

      // ----------------------------------------------------
      // BÁO CÁO 1: NHẬP HÀNG (Gom theo Tên sản phẩm, cộng dồn kg)
      // ----------------------------------------------------
      const productMap = new Map<string, number>();
      filteredOrders.forEach((order) => {
        if (order.status === "cancelled") return; // Bỏ qua đơn hủy

        order.order_items.forEach((item) => {
          const pName = item.products?.name || "Sản phẩm không rõ";
          productMap.set(pName, (productMap.get(pName) || 0) + item.quantity);
        });
      });

      const report1Rows = Array.from(productMap.entries()).map(([name, qty]) =>
        [escapeCSV(name), qty].join(","),
      );

      const report1Csv = [
        "Tên sản phẩm,Tổng số lượng đặt (kg)",
        ...report1Rows,
      ].join("\n");
      downloadCSV(
        report1Csv,
        `Bao_Cao_Nhap_Hang_${new Date().toISOString().slice(0, 10)}.csv`,
      );

      // ----------------------------------------------------
      // BÁO CÁO 2: GIAO HÀNG & THU TIỀN (Gom đơn theo Khách)
      // ----------------------------------------------------
      type CustomerAgg = {
        name: string;
        phone: string;
        items: Map<string, { qty: number; price: number }>;
        total: number;
        statuses: Set<string>;
      };

      const customerMap = new Map<string, CustomerAgg>();

      filteredOrders.forEach((order) => {
        if (order.status === "cancelled") return;

        const name = order.profiles?.full_name || "Khách (Xem ghi chú)";
        let phone = order.profiles?.phone || "";
        if (!phone && order.note) {
          const phoneMatch = order.note.match(/(0[3|5|7|8|9])+([0-9]{8})\b/g);
          if (phoneMatch) phone = phoneMatch[0];
        }

        const key = `${phone}-${name}`;
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            name,
            phone,
            items: new Map(),
            total: 0,
            statuses: new Set(),
          });
        }

        const agg = customerMap.get(key)!;
        agg.total += order.total_amount;

        const statusObj = STATUSES.find((s) => s.value === order.status);
        agg.statuses.add(statusObj ? statusObj.label : order.status);

        // Cộng gộp món hàng (Nhớ dùng price_at_time)
        order.order_items.forEach((item) => {
          const pName = item.products?.name || "SP";
          const pKey = `${pName}-${item.price_at_time}`; // Gộp dựa trên tên và giá mua tại thời điểm đó

          if (!agg.items.has(pKey)) {
            agg.items.set(pKey, { qty: 0, price: item.price_at_time });
          }
          agg.items.get(pKey)!.qty += item.quantity;
        });
      });

      const report2Rows = Array.from(customerMap.values()).map((agg) => {
        const itemsStr = Array.from(agg.items.entries())
          .map(([k, v]) => {
            const pName = k.split("-")[0];
            return `${pName} (x${v.qty} - ${v.price}đ)`;
          })
          .join("; ");

        const statusesStr = Array.from(agg.statuses).join(", ");

        return [
          escapeCSV(agg.name),
          escapeCSV(agg.phone),
          escapeCSV(itemsStr),
          agg.total,
          escapeCSV(statusesStr),
        ].join(",");
      });

      const report2Csv = [
        "Tên đồng nghiệp,SĐT,Chi tiết các món đã gộp,Tổng tiền gom các đơn,Trạng thái",
        ...report2Rows,
      ].join("\n");

      // Delay nhẹ nửa giây để trình duyệt không block download file thứ 2
      setTimeout(() => {
        downloadCSV(
          report2Csv,
          `Bao_Cao_Giao_Hang_${new Date().toISOString().slice(0, 10)}.csv`,
        );
        setExporting(false);
      }, 500);
    } catch (error) {
      console.error(error);
      showAdminAlert("Lỗi xuất báo cáo", "Đã xảy ra lỗi khi xuất file báo cáo.");
      setExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const found = STATUSES.find((s) => s.value === status);
    return found ? found.badge : "bg-gray-700 text-gray-400 border border-gray-600";
  };

  const getStatusTextColor = (status: string) => {
    const map: Record<string, string> = {
      pending: "text-yellow-400",
      confirmed: "text-blue-400",
      delivering: "text-sky-400",
      done: "text-emerald-400",
      paid: "text-teal-400",
      cancelled: "text-red-400",
    };
    return map[status] || "text-gray-400";
  };

  const getStatusDot = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-400",
      confirmed: "bg-blue-400",
      delivering: "bg-sky-400",
      done: "bg-emerald-400",
      paid: "bg-teal-400",
      cancelled: "bg-red-400",
    };
    return map[status] || "bg-gray-400";
  };

  return (
    <div data-theme={theme} className="admin-shell fixed inset-0 z-[60] bg-gray-950 text-gray-100 overflow-hidden flex flex-col font-sans antialiased overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3.5 rounded-xl shadow-lg z-[110] animate-in slide-in-from-bottom-5 duration-200 flex items-center gap-2.5 border border-gray-800">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="font-semibold text-xs sm:text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Global Admin Custom Alert Modal */}
      {adminAlert && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 border-b border-gray-700 pb-3">
              <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
              <h3 className="font-extrabold text-gray-100 text-sm sm:text-base leading-tight">
                {adminAlert.title}
              </h3>
            </div>
            <div className="text-gray-400 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto font-medium">
              {adminAlert.message}
            </div>
            <div className="flex justify-end pt-2 border-t border-gray-700">
              <button
                onClick={() => setAdminAlert(null)}
                className="h-10 px-5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-lg cursor-pointer transition-all"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center shrink-0 px-4 gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
            <Fish className="w-4.5 h-4.5 text-blue-400" />
          </div>
          <div className="hidden xs:flex flex-col select-none">
            <span className="font-extrabold text-sm text-gray-100 leading-tight flex items-center gap-1.5">
              Hải Sản Sạch
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30 uppercase tracking-wider">
                ADMIN
              </span>
            </span>
          </div>
        </div>

        {/* Center Nav Tabs */}
        <nav className="flex-1 flex items-center justify-center gap-1">
          {[
            { id: 'orders', label: 'Đơn hàng' },
            { id: 'products', label: 'Thêm sản phẩm' },
            { id: 'feedbacks', label: 'Góp ý', badge: feedbacks.length }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`h-8 px-3 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-gray-700 text-gray-100'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && tab.badge > 0 ? (
                  <span className="bg-pink-500/20 text-pink-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-pink-500/30 shrink-0">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            className="flex items-center justify-center h-8 w-8 border border-gray-700 hover:bg-gray-800 text-gray-400 hover:text-gray-200 rounded-lg transition-all cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 h-8 px-3 border border-gray-700 hover:bg-gray-800 text-gray-400 hover:text-gray-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Shop</span>
          </Link>
          <button
            onClick={handleExport}
            disabled={filteredOrders.length === 0 || exporting || loading}
            className="hidden sm:flex items-center gap-1.5 h-8 px-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>Xuất CSV</span>
          </button>
          {/* Hamburger for mobile prep sheet */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 text-gray-400 hover:bg-gray-800 rounded-lg w-9 h-9 flex items-center justify-center cursor-pointer transition-colors"
            title="Kế hoạch làm hàng"
          >
            <Package className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Sheet — Prep section */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative bg-gray-900 rounded-t-2xl border-t border-gray-700 flex flex-col h-[80vh] z-10 animate-in slide-in-from-bottom duration-200">
            {/* Sheet handle */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-sm text-gray-100">Kế Hoạch Làm Hàng</span>
                {preparationData.totalKg > 0 && (
                  <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-0.5 rounded border border-blue-500/30">
                    {preparationData.totalKg.toFixed(1)} kg
                  </span>
                )}
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Sheet content — scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Prep controls */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">MAX kg/mẻ</label>
                  <input type="number" value={prepLimit} onChange={e => setPrepLimit(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Sản phẩm</label>
                  <select value={prepProductFilter} onChange={e => setPrepProductFilter(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-500 cursor-pointer">
                    <option value="all">Tất cả</option>
                    {availableProducts.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
                {(['all', 'company', 'ship'] as const).map((v, i) => (
                  <button key={v} onClick={() => setPrepDeliveryFilter(v)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${prepDeliveryFilter === v ? 'bg-gray-600 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`}>
                    {['Tất cả', 'Tại công ty', 'Giao hàng'][i]}
                  </button>
                ))}
              </div>
              {/* Product chips */}
              {preparationData.aggregatedProducts.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => setPrepProductFilter('all')}
                    className={`rounded-lg p-2.5 text-center border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${prepProductFilter === 'all' ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider">Tất cả</span>
                    <span className="text-sm font-black">{preparationData.totalKg.toFixed(1)} <span className="text-[10px] font-bold">kg</span></span>
                  </button>
                  {preparationData.aggregatedProducts.map(([name, data]) => (
                    <button key={name} onClick={() => setPrepProductFilter(name)}
                      className={`rounded-lg p-2.5 text-center border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${prepProductFilter === name ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider line-clamp-1">{name}</span>
                      <span className="text-sm font-black">{data.totalQty} <span className="text-[10px] font-bold">{data.unit}</span></span>
                    </button>
                  ))}
                </div>
              )}
              {/* Prep order cards */}
              <div className="space-y-2">
                {preparationData.includedOrders.length === 0 ? (
                  <p className="text-gray-600 italic text-xs text-center py-4">Chưa có đơn cần chuẩn bị.</p>
                ) : preparationData.includedOrders.map((order, index) => {
                  const cleanName = getCleanCustomerName(order);
                  const deliveryType = getDeliveryType(order);
                  return (
                    <div key={order.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between bg-gray-800 px-3 py-2 border-b border-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-gray-500 bg-gray-700 rounded px-1.5">{index + 1}</span>
                          <span className="font-bold text-sm text-gray-100">{cleanName}</span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${deliveryType === 'company' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'}`}>
                          {deliveryType === 'company' ? 'Tại công ty' : 'Giao hàng'}
                        </span>
                      </div>
                      <div className="p-3 space-y-1.5">
                        {order.order_items.map(item => {
                          const pName = item.products?.name || 'SP';
                          if (prepProductFilter !== 'all' && pName !== prepProductFilter) return null;
                          return (
                            <div key={item.id} className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-gray-300">{pName}</span>
                              <span className="text-xs font-black text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded">
                                {item.quantity} {item.products?.unit}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Bottom actions — mobile */}
            <div className="border-t border-gray-800 p-3 flex gap-2 shrink-0">
              <button
                onClick={() => {
                  if (preparationData.includedOrders.length === 0) {
                    showToast('Không có đơn để copy!');
                    return;
                  }
                  const byCustomer: Record<string, Record<string, { qty: number; unit: string }>> = {};
                  preparationData.includedOrders.forEach(o => {
                    const name = getCleanCustomerName(o);
                    if (!byCustomer[name]) byCustomer[name] = {};
                    (o.order_items || []).forEach(it => {
                      const pName = it.products?.name || 'SP';
                      if (prepProductFilter !== 'all' && pName !== prepProductFilter) return;
                      const unit = it.products?.unit || 'kg';
                      if (!byCustomer[name][pName]) byCustomer[name][pName] = { qty: 0, unit };
                      byCustomer[name][pName].qty += it.quantity || 0;
                    });
                  });
                  const text = Object.entries(byCustomer)
                    .filter(([, p]) => Object.keys(p).length > 0)
                    .sort(([a], [b]) => a.localeCompare(b, 'vi-VN'))
                    .map(([name, p]) => `${name}: ${Object.entries(p).map(([n, d]) => `${n} ${d.qty}${d.unit}`).join(', ')}`)
                    .join('\n');
                  navigator.clipboard.writeText(text);
                  showToast(`Đã copy ${Object.keys(byCustomer).length} khách!`);
                  setMobileMenuOpen(false);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 h-10 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold text-xs rounded-lg transition-all cursor-pointer"
              >
                <ClipboardCopy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
              <button
                onClick={() => { window.print(); setMobileMenuOpen(false); }}
                className="flex-1 flex items-center justify-center gap-1.5 h-10 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold text-xs rounded-lg transition-all cursor-pointer"
              >
                <span>In Phiếu</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Two-column flex body */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT COLUMN */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden overflow-x-hidden">
          <div className="p-4 space-y-3 overflow-y-auto flex-1">

        {activeTab === 'orders' && (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex items-center gap-3" title="Tổng tiền các đơn đã thanh toán">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider select-none">Đã thu</p>
                  <h2 className="text-sm font-extrabold text-gray-100 mt-0.5 leading-tight truncate">
                    {summary.revenue.toLocaleString("vi-VN")}đ
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setStatusFilter('unpaid')}
                className="bg-gray-800 border border-gray-700 hover:border-yellow-500/40 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-colors text-left"
                title="Click để lọc tất cả đơn chưa tick Đã thanh toán"
              >
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider select-none">Chưa thu</p>
                  <h2 className="text-sm font-extrabold text-yellow-300 mt-0.5 leading-tight truncate">
                    {summary.pendingPayment.toLocaleString("vi-VN")}đ
                  </h2>
                  <p className="text-[9px] text-gray-600 font-medium">{summary.unpaidCount} đơn</p>
                </div>
              </button>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider select-none">Đơn hàng</p>
                  <h2 className="text-sm font-extrabold text-gray-100 mt-0.5 leading-tight">
                    {summary.totalOrders}
                  </h2>
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider select-none">Khách hàng</p>
                  <h2 className="text-sm font-extrabold text-gray-100 mt-0.5 leading-tight">
                    {summary.totalCustomers}
                  </h2>
                </div>
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="bg-gray-800/50 rounded-xl p-2 flex flex-wrap items-center gap-2 shrink-0 border border-gray-700/50">
              <CalendarIcon className="w-4 h-4 text-gray-500 shrink-0" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 font-medium" style={{ fontSize: '16px' }} />
              <span className="text-gray-600 shrink-0">–</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 font-medium" style={{ fontSize: '16px' }} />

              <Filter className="w-4 h-4 text-gray-500 shrink-0 ml-1" />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 cursor-pointer font-bold" style={{ fontSize: '16px' }}>
                <option value="active">📌 Đơn cần xử lý</option>
                <option value="unpaid">💰 Chưa thanh toán</option>
                <option value="all">🌐 Tất cả đơn</option>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>

              {/* Sort & Filter (Excel-style) */}
              <div className="relative shrink-0">
                <button type="button" onClick={() => setShowSortFilter(!showSortFilter)}
                  className={`relative flex items-center gap-1.5 h-8 px-2.5 border rounded-lg text-xs font-semibold transition-all cursor-pointer ${(isAdvFilterActive || isCustomSort) ? 'bg-blue-500/10 border-blue-500/40 text-blue-300' : 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300'}`}>
                  <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                  <span>Lọc</span>
                  {(isAdvFilterActive || isCustomSort) && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />}
                </button>
                {showSortFilter && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSortFilter(false)} />
                    <div className="absolute left-0 mt-2 w-[420px] max-w-[92vw] bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col gap-4">
                      {/* SORT */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Sắp xếp theo thứ tự ưu tiên</p>
                          {sortRules.length < 5 && (
                            <button
                              onClick={() => setSortRules(prev => [...prev, { key: 'date', dir: 'asc' }])}
                              className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Thêm
                            </button>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {sortRules.map((rule, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 bg-gray-900/60 rounded-lg p-1.5">
                              <span className="text-[10px] font-black text-gray-500 bg-gray-700 rounded w-5 h-5 flex items-center justify-center shrink-0">{idx + 1}</span>
                              <select
                                value={rule.key}
                                onChange={e => setSortRules(prev => prev.map((r, i) => i === idx ? { ...r, key: e.target.value as SortKey } : r))}
                                className="flex-1 bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1 outline-none focus:border-blue-500 cursor-pointer font-bold"
                              >
                                <option value="status">Trạng thái</option>
                                <option value="name">Tên khách hàng</option>
                                <option value="date">Ngày đặt</option>
                                <option value="total">Tổng tiền</option>
                                <option value="weight">Khối lượng</option>
                                <option value="payment">Phương thức TT</option>
                              </select>
                              <button
                                onClick={() => setSortRules(prev => prev.map((r, i) => i === idx ? { ...r, dir: r.dir === 'asc' ? 'desc' : 'asc' } : r))}
                                title={rule.dir === 'asc' ? 'Tăng dần' : 'Giảm dần'}
                                className="flex items-center gap-1 h-7 px-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-[10px] font-bold cursor-pointer"
                              >
                                {rule.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                <span>{rule.dir === 'asc' ? 'Tăng' : 'Giảm'}</span>
                              </button>
                              {sortRules.length > 1 && (
                                <button
                                  onClick={() => setSortRules(prev => prev.filter((_, i) => i !== idx))}
                                  title="Bỏ tiêu chí"
                                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* FILTER */}
                      <div className="border-t border-gray-700 pt-3">
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Lọc nâng cao</p>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Tên khách</label>
                              <input
                                type="text"
                                value={advFilter.customerSearch}
                                onChange={e => setAdvFilter(prev => ({ ...prev, customerSearch: e.target.value }))}
                                placeholder="VD: Nguyễn..."
                                className="w-full bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-600 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 mt-0.5"
                                style={{ fontSize: '14px' }}
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Tìm sản phẩm</label>
                              <input
                                type="text"
                                value={advFilter.productSearch}
                                onChange={e => setAdvFilter(prev => ({ ...prev, productSearch: e.target.value }))}
                                placeholder="VD: cá hồi..."
                                className="w-full bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-600 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 mt-0.5"
                                style={{ fontSize: '14px' }}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">PT thanh toán</label>
                              <select
                                value={advFilter.paymentMethod}
                                onChange={e => setAdvFilter(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                                className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 cursor-pointer font-bold mt-0.5"
                              >
                                <option value="all">Tất cả</option>
                                <option value="cod">COD</option>
                                <option value="bank">Chuyển khoản</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Hình thức giao</label>
                              <select
                                value={advFilter.deliveryType}
                                onChange={e => setAdvFilter(prev => ({ ...prev, deliveryType: e.target.value as any }))}
                                className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 cursor-pointer font-bold mt-0.5"
                              >
                                <option value="all">Tất cả</option>
                                <option value="company">Tại công ty</option>
                                <option value="ship">Giao tận nơi</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Số tiền tối thiểu</label>
                              <input
                                type="number"
                                value={advFilter.minAmount || ''}
                                onChange={e => setAdvFilter(prev => ({ ...prev, minAmount: Number(e.target.value) || 0 }))}
                                placeholder="0"
                                className="w-full bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-600 rounded px-2 py-1 text-xs font-bold outline-none focus:border-blue-500 mt-0.5"
                                style={{ fontSize: '14px' }}
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Có ghi chú</label>
                              <select
                                value={advFilter.hasNote}
                                onChange={e => setAdvFilter(prev => ({ ...prev, hasNote: e.target.value as any }))}
                                className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 cursor-pointer font-bold mt-0.5"
                              >
                                <option value="all">Tất cả</option>
                                <option value="yes">Có ghi chú</option>
                                <option value="no">Không ghi chú</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between border-t border-gray-700 pt-3">
                        <button
                          onClick={() => {
                            setSortRules([{ key: 'status', dir: 'asc' }, { key: 'name', dir: 'asc' }]);
                            setAdvFilter({ customerSearch: '', productSearch: '', paymentMethod: 'all', deliveryType: 'all', minAmount: 0, hasNote: 'all' });
                          }}
                          className="text-xs font-bold text-gray-400 hover:text-gray-200 cursor-pointer"
                        >
                          ↺ Đặt lại mặc định
                        </button>
                        <button
                          onClick={() => setShowSortFilter(false)}
                          className="h-8 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                        >
                          Xong
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Column visibility */}
              <div className="relative shrink-0">
                <button type="button" onClick={() => setShowFieldsDropdown(!showFieldsDropdown)}
                  className="relative flex items-center gap-1.5 h-8 px-2.5 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                  <ClipboardList className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span>Cột</span>
                  {isAnyColumnHidden && <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" />}
                </button>
                {showFieldsDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowFieldsDropdown(false)} />
                    <div className="absolute left-0 mt-2 min-w-[220px] bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in duration-150 flex flex-col gap-1">
                      <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider px-2 pb-1 border-b border-gray-700 mb-1">Ẩn / Hiện cột</p>
                      {[
                        { key: 'id', label: 'Mã đơn (#)' },
                        { key: 'phone', label: 'Số điện thoại' },
                        { key: 'delivery', label: 'Hình thức giao' },
                        { key: 'details', label: 'Chi tiết món hàng' },
                        { key: 'weight', label: 'Khối lượng tổng' },
                        { key: 'payment', label: 'Phương thức TT' },
                        { key: 'date', label: 'Ngày đặt' },
                        { key: 'note', label: 'Ghi chú đơn' },
                      ].map(field => (
                        <label key={field.key} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-gray-700 px-2 rounded-lg select-none">
                          <input type="checkbox" checked={visibleFields[field.key as keyof typeof visibleFields]}
                            onChange={e => setVisibleFields(prev => ({ ...prev, [field.key]: e.target.checked }))}
                            className="w-4 h-4 accent-blue-500 rounded cursor-pointer shrink-0" />
                          <span className="text-xs font-semibold text-gray-300">{field.label}</span>
                        </label>
                      ))}
                      <button
                        onClick={() => setVisibleFields({ id: true, details: true, phone: true, delivery: true, note: true, weight: true, payment: true, date: true })}
                        className="mt-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 px-2 py-1 text-left cursor-pointer border-t border-gray-700 pt-2"
                      >
                        ↺ Hiện tất cả
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button onClick={fetchOrders} disabled={loading}
                className="ml-auto flex items-center gap-1.5 h-8 px-3 bg-gray-700 hover:bg-gray-600 active:scale-95 text-gray-300 font-semibold rounded-lg text-xs transition-all cursor-pointer shrink-0">
                <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
            </div>

            {/* Orders Table — professional data analyst dashboard view */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-gray-800/80 border-b border-gray-700 sticky top-0 z-10">
                    <tr className="text-left">
                      <th className="px-2 py-2.5 w-10 text-center sticky left-0 bg-gray-800/80 z-20">
                        <input
                          type="checkbox"
                          checked={filteredOrders.length > 0 && selectedOrderIds.size === filteredOrders.length}
                          onChange={handleSelectAll}
                          className="w-3.5 h-3.5 cursor-pointer accent-blue-500 rounded"
                        />
                      </th>
                      {visibleFields.id && (
                        <th className="px-2 py-2.5 font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Mã</th>
                      )}
                      <th className="px-3 py-2.5 font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Khách hàng</th>
                      {showPhoneCol && (
                        <th className="px-3 py-2.5 font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">SĐT</th>
                      )}
                      {visibleFields.delivery && (
                        <th className="px-2 py-2.5 font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap text-center">Giao</th>
                      )}
                      {visibleFields.details && (
                        <th className="px-3 py-2.5 font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Sản phẩm</th>
                      )}
                      {visibleFields.weight && (
                        <th className="px-3 py-2.5 font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap text-right">Khối lượng</th>
                      )}
                      <th className="px-3 py-2.5 font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap text-right">Tổng tiền</th>
                      {visibleFields.payment && (
                        <th className="px-2 py-2.5 font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap text-center">PT</th>
                      )}
                      {visibleFields.date && (
                        <th className="px-3 py-2.5 font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Ngày đặt</th>
                      )}
                      <th className="px-3 py-2.5 font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap sticky right-0 bg-gray-800/80 z-20">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {loading ? (
                      Array.from({ length: 6 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td className="px-2 py-2.5"><div className="h-3.5 w-3.5 bg-gray-700 rounded mx-auto" /></td>
                          {visibleFields.id && <td className="px-2 py-2.5"><div className="h-3 bg-gray-700 rounded w-12" /></td>}
                          <td className="px-3 py-2.5"><div className="h-3 bg-gray-700 rounded w-24" /></td>
                          {showPhoneCol && <td className="px-3 py-2.5"><div className="h-3 bg-gray-700 rounded w-20" /></td>}
                          {visibleFields.delivery && <td className="px-2 py-2.5"><div className="h-4 bg-gray-700 rounded-full w-12 mx-auto" /></td>}
                          {visibleFields.details && <td className="px-3 py-2.5"><div className="h-3 bg-gray-700 rounded w-36" /></td>}
                          {visibleFields.weight && <td className="px-3 py-2.5 text-right"><div className="h-3 bg-gray-700 rounded w-12 ml-auto" /></td>}
                          <td className="px-3 py-2.5 text-right"><div className="h-3 bg-gray-700 rounded w-16 ml-auto" /></td>
                          {visibleFields.payment && <td className="px-2 py-2.5"><div className="h-3 bg-gray-700 rounded w-8 mx-auto" /></td>}
                          {visibleFields.date && <td className="px-3 py-2.5"><div className="h-3 bg-gray-700 rounded w-20" /></td>}
                          <td className="px-3 py-2.5"><div className="h-6 bg-gray-700 rounded w-24" /></td>
                        </tr>
                      ))
                    ) : filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-6 py-16 text-center">
                          <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-500 font-semibold text-sm">Không tìm thấy đơn hàng nào</p>
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order, rowIdx) => {
                        const cleanName = getCleanCustomerName(order);
                        const phone = getCustomerPhone(order);
                        const displayNote = getDisplayNote(order);
                        const deliveryType = getDeliveryType(order);
                        const isSelected = selectedOrderIds.has(order.id);
                        const totalWeight = order.order_items?.reduce((sum, it) => sum + (it.quantity || 0), 0) || 0;
                        const productSummary = order.order_items?.map(it => `${it.products?.name || 'SP'} ${it.quantity}${it.products?.unit || 'kg'}`).join(', ') || '';
                        return (
                          <tr key={order.id} className={`group transition-colors ${isSelected ? 'bg-blue-500/5' : rowIdx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/50'} hover:bg-gray-800/60`}>
                            <td className="px-2 py-2 text-center sticky left-0 bg-inherit z-10">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectOrder(order.id)}
                                className="w-3.5 h-3.5 cursor-pointer accent-blue-500 rounded"
                              />
                            </td>
                            {visibleFields.id && (
                              <td className="px-2 py-2 font-mono text-[10px] font-bold text-gray-500 whitespace-nowrap">
                                #{order.id.slice(0, 6).toUpperCase()}
                              </td>
                            )}
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span
                                title={[
                                  `Khách: ${cleanName}`,
                                  phone ? `SĐT: ${phone}` : null,
                                  `Giao: ${deliveryType === 'company' ? 'Tại công ty' : 'Giao tận nơi'}`,
                                  `Mã: #${order.id.slice(0, 8).toUpperCase()}`,
                                  `Đặt: ${new Date(order.created_at).toLocaleString('vi-VN')}`,
                                  displayNote && visibleFields.note ? `\nGhi chú: ${displayNote}` : null,
                                ].filter(Boolean).join('\n')}
                                className="font-semibold text-gray-100 text-sm cursor-help hover:text-blue-400 transition-colors"
                              >
                                {cleanName}
                              </span>
                            </td>
                            {showPhoneCol && (
                              <td className="px-3 py-2 font-mono text-xs text-gray-300 whitespace-nowrap">
                                {phone || <span className="text-gray-700">—</span>}
                              </td>
                            )}
                            {visibleFields.delivery && (
                              <td className="px-2 py-2 text-center whitespace-nowrap">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${deliveryType === 'company' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' : 'bg-sky-500/10 text-sky-400 border-sky-500/30'}`}>
                                  {deliveryType === 'company' ? 'Công ty' : 'Giao'}
                                </span>
                              </td>
                            )}
                            {visibleFields.details && (
                              <td className="px-3 py-2 max-w-[280px]">
                                <div className="flex flex-wrap gap-1">
                                  {order.order_items?.map(item => (
                                    <span key={item.id} className="inline-flex items-center gap-1 text-[10px] bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5">
                                      <span className="font-semibold text-gray-300 truncate max-w-[100px]">{item.products?.name || 'SP'}</span>
                                      <span className="font-black text-yellow-400">{item.quantity}{item.products?.unit || 'kg'}</span>
                                    </span>
                                  ))}
                                </div>
                              </td>
                            )}
                            {visibleFields.weight && (
                              <td className="px-3 py-2 text-right font-mono font-bold text-gray-200 whitespace-nowrap">
                                {totalWeight}<span className="text-gray-600 text-[10px] font-medium"> kg</span>
                              </td>
                            )}
                            <td className="px-3 py-2 text-right font-mono font-extrabold text-blue-400 whitespace-nowrap">
                              {order.total_amount.toLocaleString('vi-VN')}
                            </td>
                            {visibleFields.payment && (
                              <td className="px-2 py-2 text-center whitespace-nowrap">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${order.payment_method === 'cod' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                  {order.payment_method === 'cod' ? 'COD' : 'CK'}
                                </span>
                              </td>
                            )}
                            {visibleFields.date && (
                              <td className="px-3 py-2 whitespace-nowrap text-[11px] text-gray-400 font-medium font-mono">
                                {new Date(order.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </td>
                            )}
                            <td className="px-3 py-2 whitespace-nowrap sticky right-0 bg-inherit z-10">
                              <div className="flex items-center justify-between gap-2">
                                {/* Status: chấm tròn + chữ màu, không viền pill */}
                                <div className="relative inline-flex items-center">
                                  <span className={`absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${getStatusDot(order.status)} pointer-events-none`} />
                                  <select
                                    disabled={updatingId === order.id}
                                    value={order.status}
                                    onChange={e => handleUpdateStatus(order.id, e.target.value)}
                                    className={`appearance-none cursor-pointer pl-5 pr-5 py-1 rounded-md text-xs font-bold outline-none bg-transparent hover:bg-gray-800/60 ${getStatusTextColor(order.status)}`}
                                  >
                                    {STATUSES.map(s => <option key={s.value} value={s.value} className="bg-gray-900 text-gray-100">{s.label}</option>)}
                                  </select>
                                  <ChevronDown className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                  {updatingId === order.id && <Loader2 className="absolute -right-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-blue-400" />}
                                </div>

                                {/* Quick actions — chỉ hiện khi hover row hoặc đang ở mode xác nhận xoá */}
                                <div className={`flex items-center gap-0.5 transition-opacity ${confirmDeleteId === order.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}`}>
                                  {(order.status === 'delivering' || order.status === 'done') && (
                                    <button
                                      onClick={() => copyZaloMessage(order)}
                                      title="Copy tin nhắn Zalo"
                                      className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-blue-400 hover:bg-gray-800 rounded cursor-pointer transition-colors"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {confirmDeleteId === order.id ? (
                                    <div className="flex items-center gap-0.5 bg-red-500/10 border border-red-500/30 rounded p-0.5">
                                      <button
                                        onClick={() => { handleDeleteOrder(order.id); setConfirmDeleteId(null); }}
                                        title="Xác nhận xoá"
                                        className="w-6 h-6 bg-red-600 text-white rounded flex items-center justify-center hover:bg-red-700 cursor-pointer"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        title="Huỷ"
                                        className="w-6 h-6 bg-gray-700 text-gray-400 rounded flex items-center justify-center hover:bg-gray-600 cursor-pointer"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setConfirmDeleteId(order.id)}
                                      title="Xoá đơn"
                                      className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Desktop table removed — unified dark cards above replace it */}
            {false && (<div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm text-gray-600 border-collapse">
                  <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                    <tr>
                      <th className="px-5 py-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={filteredOrders.length > 0 && selectedOrderIds.size === filteredOrders.length}
                          onChange={handleSelectAll}
                          className="w-4 h-4 cursor-pointer accent-sky-500 rounded border-gray-300"
                        />
                      </th>
                      <th className="px-5 py-4 whitespace-nowrap uppercase tracking-wider text-xs font-semibold">
                        Mã Đơn
                      </th>
                      <th className="px-5 py-4 uppercase tracking-wider text-xs font-semibold">
                        Khách Hàng & Liên Hệ
                      </th>
                      {visibleFields.details && (
                        <th className="px-5 py-4 uppercase tracking-wider text-xs font-semibold">
                          Chi Tiết Món Hàng
                        </th>
                      )}
                      <th className="px-5 py-4 whitespace-nowrap text-right uppercase tracking-wider text-xs font-semibold">
                        Tổng Tiền
                      </th>
                      <th className="px-5 py-4 whitespace-nowrap uppercase tracking-wider text-xs font-semibold">
                        Ngày Đặt
                      </th>
                      <th className="px-5 py-4 whitespace-nowrap text-center uppercase tracking-wider text-xs font-semibold">
                        Trạng Thái & Thao Tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-4 mx-auto" /></td>
                          <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                          <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-32 mb-2" /><div className="h-3 bg-gray-200 rounded w-20" /></td>
                          {visibleFields.details && <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-40" /></td>}
                          <td className="px-5 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-20 ml-auto" /></td>
                          <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                          <td className="px-5 py-4"><div className="h-8 bg-gray-200 rounded-full w-28 mx-auto" /></td>
                        </tr>
                      ))
                    ) : filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={visibleFields.details ? 7 : 6} className="px-6 py-28 text-center border-none">
                          <Package className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 font-semibold text-sm sm:text-base">
                            Không tìm thấy đơn hàng nào phù hợp với bộ lọc
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => {
                        const cleanName = getCleanCustomerName(order);
                        const phone = order.profiles?.phone || "";
                        const deliveryType = getDeliveryType(order);
                        return (
                          <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-5 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={selectedOrderIds.has(order.id)}
                                onChange={() => toggleSelectOrder(order.id)}
                                className="w-4 h-4 cursor-pointer accent-sky-500 rounded border-gray-300"
                              />
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap font-mono text-gray-400 font-semibold text-xs">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </td>
                            <td className="px-5 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                  <span className="font-bold text-gray-900 text-sm leading-tight">
                                    {cleanName}
                                  </span>
                                </div>
                                {phone && visibleFields.phone && (
                                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <Phone className="w-3 h-3 text-green-500 shrink-0" />
                                    <span className="font-semibold">{phone}</span>
                                  </div>
                                )}
                                {visibleFields.delivery && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                    {deliveryType === 'company' ? (
                                      <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                                    ) : (
                                      <Package className="w-3 h-3 text-sky-500 shrink-0" />
                                    )}
                                    <span>
                                      {deliveryType === 'company' ? 'Nhận tại công ty' : 'Giao tận nơi'}
                                    </span>
                                  </div>
                                )}
                                {order.note && visibleFields.note && (
                                  <div className="flex items-start gap-1 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mt-1.5 max-w-[260px]">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                    <span className="text-[11px] text-amber-800 font-semibold whitespace-pre-wrap leading-relaxed">
                                      {order.note}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            {visibleFields.details && (
                              <td className="px-5 py-4 max-w-[250px]">
                                <ul className="space-y-1.5 text-xs">
                                  {order.order_items?.map((item) => (
                                    <li key={item.id} className="flex items-center justify-between gap-3 border-b border-gray-100 last:border-0 pb-1.5 last:pb-0">
                                      <span className="font-bold text-gray-800">{item.products?.name || "SP"}</span>
                                      <span className="shrink-0 text-[11px] font-black text-orange-600 bg-orange-50 border border-orange-100 rounded px-1.5 py-0.5">
                                        {item.quantity} {item.products?.unit || "kg"}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            )}
                            <td className="px-5 py-4 whitespace-nowrap text-right">
                              <p className="font-extrabold text-gray-900 text-sm">
                                {order.total_amount.toLocaleString("vi-VN")}đ
                              </p>
                              <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider">
                                {order.payment_method === "cod" ? "COD" : "Bank (CK)"}
                              </p>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">
                              {new Date(order.created_at).toLocaleString("vi-VN", {
                                year: 'numeric', month: '2-digit', day: '2-digit',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-center align-middle">
                              <div className="flex flex-col items-center gap-1.5 w-full max-w-[130px] mx-auto">
                                <div className="relative w-full">
                                  <select
                                    disabled={updatingId === order.id}
                                    value={order.status}
                                    onChange={(e) =>
                                      handleUpdateStatus(order.id, e.target.value)
                                    }
                                    className={`appearance-none cursor-pointer border border-transparent w-full text-center px-3 py-1.5 rounded-full text-xs font-bold transition-all focus:ring-2 focus:ring-offset-1 focus:ring-sky-500 outline-none shadow-sm ${getStatusBadge(order.status)} ${updatingId === order.id ? "opacity-50" : "hover:opacity-90"}`}
                                  >
                                    {STATUSES.map((s) => (
                                      <option key={s.value} value={s.value} className="bg-white text-gray-900">
                                        {s.label}
                                      </option>
                                    ))}
                                  </select>
                                  {updatingId === order.id && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-600" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 w-full justify-center">
                                  {(order.status === "delivering" || order.status === "done") && (
                                    <button
                                      onClick={() => copyZaloMessage(order)}
                                      className="text-[10px] flex items-center justify-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-600 h-7 px-2 rounded-lg transition-all font-bold border border-sky-200 active:scale-95 shrink-0 cursor-pointer"
                                      title="Copy tin nhắn Zalo"
                                    >
                                      <Copy className="w-3 h-3" />
                                      <span>Zalo</span>
                                    </button>
                                  )}

                                  {confirmDeleteId === order.id ? (
                                    <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg p-0.5 shrink-0">
                                      <button
                                        onClick={() => {
                                          handleDeleteOrder(order.id);
                                          setConfirmDeleteId(null);
                                        }}
                                        className="w-6 h-6 bg-red-600 text-white rounded-md flex items-center justify-center hover:bg-red-700 active:scale-90 cursor-pointer"
                                        title="Xác nhận xoá"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="w-6 h-6 bg-gray-100 text-gray-600 rounded-md flex items-center justify-center hover:bg-gray-200 active:scale-90 cursor-pointer"
                                        title="Huỷ"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      disabled={updatingId === order.id}
                                      onClick={() => setConfirmDeleteId(order.id)}
                                      className="text-[10px] flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 h-7 px-2 rounded-lg transition-all font-bold border border-red-200 active:scale-95 cursor-pointer opacity-100 sm:opacity-0 group-hover:opacity-100 shrink-0"
                                      title="Xóa đơn hàng"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Xoá</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>)}

            {/* Bulk action bar (dark, slide-in) */}
            {selectedOrderIds.size > 0 && (() => {
              const selectedOrders = filteredOrders.filter(o => selectedOrderIds.has(o.id));
              const selectedTotalWeight = selectedOrders.reduce(
                (sum, o) => sum + (o.order_items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0),
                0
              );
              const selectedTotalAmount = selectedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
              const productAgg: Record<string, { qty: number; unit: string }> = {};
              selectedOrders.forEach(o => o.order_items?.forEach(it => {
                const name = it.products?.name || 'SP';
                const unit = it.products?.unit || 'kg';
                if (!productAgg[name]) productAgg[name] = { qty: 0, unit };
                productAgg[name].qty += it.quantity || 0;
              }));
              const productBreakdown = Object.entries(productAgg).map(([n, d]) => `${n}: ${d.qty}${d.unit}`).join(' • ');
              return (
              <div className="sticky top-0 z-10 bg-gray-800 border border-gray-700 rounded-xl p-3 flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                <span className="font-bold text-blue-400 text-sm shrink-0">
                  Đã chọn {selectedOrderIds.size} đơn
                </span>
                {/* Tổng khối lượng + tổng tiền của các đơn được tick */}
                <div className="flex items-center gap-2 shrink-0 border-l border-gray-700 pl-2">
                  <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-2.5 py-1" title={productBreakdown || undefined}>
                    <Scale className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tổng KL:</span>
                    <span className="text-sm font-black text-yellow-400 font-mono">{selectedTotalWeight}</span>
                    <span className="text-[10px] font-bold text-yellow-400/80">kg</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg px-2.5 py-1">
                    <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tổng tiền:</span>
                    <span className="text-sm font-black text-blue-400 font-mono">{selectedTotalAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
                <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
                  className="bg-gray-900 border border-gray-700 text-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs font-bold cursor-pointer">
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                {confirmBulkUpdate ? (
                  <div className="flex items-center gap-1 bg-gray-700 border border-gray-600 rounded-lg p-0.5">
                    <button onClick={() => { handleBulkUpdateStatus(); setConfirmBulkUpdate(false); }}
                      className="h-7 px-2.5 bg-blue-600 text-white rounded flex items-center gap-1 hover:bg-blue-500 cursor-pointer text-xs font-bold">
                      <Check className="w-3.5 h-3.5" /> Xác nhận
                    </button>
                    <button onClick={() => setConfirmBulkUpdate(false)}
                      className="w-7 h-7 bg-gray-800 text-gray-400 rounded flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmBulkUpdate(true)} disabled={updatingBulk}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold px-3 h-8 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer active:scale-95">
                    {updatingBulk && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Cập nhật hàng loạt</span>
                  </button>
                )}
                <button onClick={() => { setSelectedOrderIds(new Set()); setConfirmBulkUpdate(false); }}
                  className="text-gray-500 hover:text-gray-300 font-bold px-2 py-1 text-xs cursor-pointer ml-auto">
                  Bỏ chọn
                </button>
              </div>
              );
            })()}
          </>
        )}



        {activeTab === 'products' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200 text-gray-100">
            <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-100 flex items-center gap-2">
                <PlusCircle className="w-5.5 h-5.5 text-sky-500" />
                Thêm Sản Phẩm Mới
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-1 font-medium">
                Điền thông tin và tải ảnh trực tiếp để cập nhật vào cửa hàng.
              </p>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Upload Image Section */}
                <div className="sm:col-span-2 flex flex-col gap-3">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Ảnh Sản Phẩm
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                    <div className="w-28 h-28 shrink-0 bg-gray-800 border-2 border-dashed border-gray-700 rounded-xl overflow-hidden flex items-center justify-center relative">
                      {newProduct.image_url ? (
                        <img src={newProduct.image_url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-7 h-7 text-gray-400" />
                      )}
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 w-full">
                      <label className="flex items-center justify-center w-full sm:w-auto sm:inline-flex h-11 px-5 border border-gray-700 hover:border-gray-600 text-xs font-bold rounded-lg text-gray-300 bg-gray-800 hover:bg-gray-700 cursor-pointer transition-all active:scale-95 shrink-0 select-none">
                        <UploadCloud className="w-4 h-4 mr-1.5 text-gray-400" />
                        <span>Tải ảnh lên hệ thống</span>
                        <input type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                      </label>
                      <p className="mt-2 text-[10px] sm:text-xs text-gray-400 font-medium">
                        Hỗ trợ định dạng ảnh phổ biến. Ảnh sẽ được upload và lấy link trực tiếp từ Supabase Storage.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Tên Sản Phẩm *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3.5 py-2.5 outline-none focus:border-blue-500 font-semibold text-sm h-11"
                    placeholder="VD: Chả mực giã tay..."
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Danh Mục</label>
                  <input
                    type="text"
                    value={newProduct.category || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3.5 py-2.5 outline-none focus:border-blue-500 font-semibold text-sm h-11"
                    placeholder="VD: haisan, chamuc, kho..."
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Giá Bán (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newProduct.price || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3.5 py-2.5 outline-none focus:border-blue-500 font-bold text-sm h-11"
                    placeholder="0"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Giá Gốc Chưa Giảm (Shopee-style)</label>
                  <input
                    type="number"
                    min="0"
                    value={newProduct.original_price || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, original_price: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3.5 py-2.5 outline-none focus:border-blue-500 font-bold text-sm h-11"
                    placeholder="Bỏ trống nếu không giảm giá"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Thẻ nổi bật & Viền lấp lánh</label>
                  <select
                    value={newProduct.tag || 'none'}
                    onChange={(e) => setNewProduct({ ...newProduct, tag: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3.5 py-2.5 outline-none focus:border-blue-500 cursor-pointer font-bold text-xs sm:text-sm h-11"
                    style={{ fontSize: '16px' }}
                  >
                    <option value="none">Không có (Bình thường)</option>
                    <option value="best_seller">🔥 Bán chạy</option>
                    <option value="rare">💎 Hải sản hiếm</option>
                    <option value="new">⚡ Hàng mới</option>
                    <option value="premium">👑 Ngon đặc biệt</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Đơn vị tính</label>
                  <input
                    type="text"
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3.5 py-2.5 outline-none focus:border-blue-500 font-semibold text-sm h-11"
                    placeholder="VD: kg, hộp, túi 500g..."
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Mô Tả Sản Phẩm</label>
                  <textarea
                    rows={3}
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3.5 py-2 outline-none focus:border-blue-500 resize-none font-medium text-sm"
                    placeholder="Mô tả tóm tắt về đặc sản..."
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Ghi chú phụ (hiển thị mờ)</label>
                  <input
                    type="text"
                    value={newProduct.note}
                    onChange={(e) => setNewProduct({ ...newProduct, note: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3.5 py-2.5 outline-none focus:border-blue-500 font-semibold text-sm h-11"
                    placeholder="VD: Nhận đặt gom làm sạch..."
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div className="flex items-center gap-3 pt-6 h-11">
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={newProduct.in_stock}
                      onChange={(e) => setNewProduct({ ...newProduct, in_stock: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                    <span className="ms-3 text-xs sm:text-sm font-bold text-gray-300">Còn hàng</span>
                  </label>
                </div>

                <div className="sm:col-span-2 pt-4 border-t border-gray-150 flex justify-end">
                  <button
                    type="submit"
                    disabled={addingProduct}
                    className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {addingProduct ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" />
                        <span>Thêm Sản Phẩm</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
            </div>

            {/* ============================================= */}
            {/* Danh sách sản phẩm đang có — quản lý/xoá       */}
            {/* ============================================= */}
            <div className="max-w-5xl mx-auto mt-10 pt-8 border-t border-gray-800">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-gray-100 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-400" />
                    Sản phẩm đang có
                    <span className="text-xs font-bold text-gray-500">({productsList.length})</span>
                  </h2>
                  <p className="text-gray-500 text-xs sm:text-sm mt-1 font-medium">
                    Quản lý kho hiển thị: bật/tắt còn hàng hoặc xoá sản phẩm khỏi hệ thống.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Tìm sản phẩm..."
                      className="bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-500 font-medium w-48"
                      style={{ fontSize: '14px' }}
                    />
                    <Filter className="w-3.5 h-3.5 text-gray-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <button
                    onClick={fetchProductsList}
                    disabled={loadingProductsList}
                    className="flex items-center gap-1.5 h-8 px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    <RefreshCcw className={`w-3.5 h-3.5 ${loadingProductsList ? 'animate-spin' : ''}`} />
                    <span>Làm mới</span>
                  </button>
                </div>
              </div>

              {loadingProductsList ? (
                <div className="grid gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex items-center gap-3 animate-pulse">
                      <div className="w-12 h-12 bg-gray-700 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-700 rounded w-1/3" />
                        <div className="h-3 bg-gray-700 rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : productsList.length === 0 ? (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
                  <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 font-semibold text-sm">Chưa có sản phẩm nào.</p>
                </div>
              ) : (() => {
                const filtered = productSearch
                  ? productsList.filter(p =>
                      p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
                      (p.category || '').toLowerCase().includes(productSearch.toLowerCase())
                    )
                  : productsList;
                if (filtered.length === 0) {
                  return (
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
                      <p className="text-gray-500 font-semibold text-sm">Không tìm thấy sản phẩm khớp "{productSearch}".</p>
                    </div>
                  );
                }
                return (
                  <div className="grid gap-2">
                    {filtered.map(p => (
                      <div key={p.id} className="bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-xl p-3 flex items-center gap-3 transition-colors">
                        {/* Image */}
                        <div className="w-14 h-14 shrink-0 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                          {p.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-gray-600" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm text-gray-100 truncate">{p.name}</h3>
                            {p.category && (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
                                {p.category}
                              </span>
                            )}
                            {p.tag && p.tag !== 'none' && (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">
                                {p.tag === 'best_seller' ? '🔥 Bán chạy' : p.tag === 'rare' ? '💎 Hiếm' : p.tag === 'new' ? '⚡ Mới' : p.tag === 'premium' ? '👑 Đặc biệt' : p.tag}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs">
                            <span className="font-bold text-blue-400 font-mono">
                              {(p.price || 0).toLocaleString('vi-VN')}đ
                              <span className="text-gray-600 font-normal">/{p.unit || 'kg'}</span>
                            </span>
                            {p.original_price && p.original_price > p.price && (
                              <span className="text-[10px] text-gray-600 line-through font-mono">
                                {p.original_price.toLocaleString('vi-VN')}đ
                              </span>
                            )}
                          </div>
                        </div>

                        {/* In stock toggle */}
                        <label className="relative inline-flex items-center cursor-pointer select-none shrink-0" title={p.in_stock ? 'Đang còn hàng' : 'Đang hết hàng — click để bật lại'}>
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={p.in_stock}
                            onChange={e => handleToggleProductStock(p.id, e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden sm:inline">
                            {p.in_stock ? 'Còn' : 'Hết'}
                          </span>
                        </label>

                        {/* Delete */}
                        {confirmDeleteProductId === p.id ? (
                          <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 rounded p-0.5 shrink-0">
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              disabled={deletingProductId === p.id}
                              title="Xác nhận xoá"
                              className="w-7 h-7 bg-red-600 text-white rounded flex items-center justify-center hover:bg-red-700 cursor-pointer disabled:opacity-50"
                            >
                              {deletingProductId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteProductId(null)}
                              title="Huỷ"
                              className="w-7 h-7 bg-gray-700 text-gray-400 rounded flex items-center justify-center hover:bg-gray-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteProductId(p.id)}
                            title="Xoá sản phẩm"
                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded cursor-pointer transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'feedbacks' && (() => {
          const preorders = feedbacks.filter(f => f.title?.startsWith('[Pre-Order] '));
          const ratingFeedbacks = feedbacks.filter(f => f.title?.startsWith('[Feedback] ') || (!f.title?.startsWith('[Pre-Order] ') && !f.title?.startsWith('[Chat] ') && !f.title?.startsWith('[Reply] ')));
          
          const chatSessionsMap: { [key: string]: any[] } = {};
          feedbacks.forEach(f => {
            const isChat = f.title?.startsWith('[Chat] ') || f.title?.startsWith('[Reply] ');
            if (isChat) {
              const user = f.title.replace('[Chat] ', '').replace('[Reply] ', '');
              if (!chatSessionsMap[user]) chatSessionsMap[user] = [];
              chatSessionsMap[user].push(f);
            }
          });

          const chatSessions = Object.entries(chatSessionsMap).map(([user, msgs]) => {
            const sorted = [...msgs].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            const latest = sorted[sorted.length - 1];
            // Đếm tin chưa đọc (chỉ tính tin từ khách [Chat], không tính reply của admin)
            const unreadCount = msgs.filter(m =>
              m.title?.startsWith('[Chat] ') && m.is_read === false
            ).length;
            return { user, messages: sorted, latestTime: latest.created_at, latestContent: latest.content, unreadCount };
          }).sort((a,b) => {
            // Ưu tiên session có tin chưa đọc lên đầu, sau đó theo thời gian mới nhất
            if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
            if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
            return new Date(b.latestTime).getTime() - new Date(a.latestTime).getTime();
          });

          const totalUnreadChats = chatSessions.reduce((sum, s) => sum + s.unreadCount, 0);

          return (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200 flex flex-col gap-6 text-gray-100">
              <div className="border-b border-gray-150 pb-4 shrink-0">
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-100 flex items-center gap-2">
                  <MessageSquare className="w-5.5 h-5.5 text-pink-500" />
                  Trung Tâm Góp Ý & Đặt Trước Hải Sản
                </h2>
                <p className="text-gray-400 text-xs sm:text-sm mt-1 font-medium">
                  Đọc phản hồi của khách hàng, quản lý đơn đặt trước hải sản hiếm, và hỗ trợ chat trực tuyến.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-grow min-h-0">
                
                {/* 1. Pre-orders */}
                <div className="lg:col-span-4 flex flex-col gap-3 bg-gray-800/50 p-4 rounded-xl border border-gray-700 max-h-[500px]">
                  <h3 className="font-extrabold text-gray-300 flex items-center gap-2 text-xs sm:text-sm uppercase tracking-wider pb-2 border-b border-gray-700">
                    <Fish className="w-4.5 h-4.5 text-orange-500" />
                    Đặt Trước ({preorders.length})
                  </h3>
                  {preorders.length === 0 ? (
                    <p className="text-gray-400 italic text-xs py-4 text-center">Không có yêu cầu đặt trước nào.</p>
                  ) : (
                    <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                      {preorders.map(pre => {
                        const fishName = pre.title.replace('[Pre-Order] ', '');
                        return (
                          <div key={pre.id} className="bg-gray-800 border border-gray-700 rounded-xl p-3 relative group">
                            
                            {confirmDeleteFeedbackId === pre.id ? (
                              <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-50 border border-red-200 rounded p-0.5 z-10 scale-90">
                                <button
                                  onClick={() => {
                                    handleDeleteFeedback(pre.id);
                                    setConfirmDeleteFeedbackId(null);
                                  }}
                                  className="w-6 h-6 bg-red-600 text-white rounded flex items-center justify-center hover:bg-red-700 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteFeedbackId(null)}
                                  className="w-6 h-6 bg-gray-100 text-gray-600 rounded flex items-center justify-center hover:bg-gray-200 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteFeedbackId(pre.id)}
                                className="absolute top-3 right-3 text-gray-400 hover:text-red-500 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer w-7 h-7 flex items-center justify-center"
                                title="Xóa yêu cầu"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <h4 className="font-extrabold text-orange-300 text-xs sm:text-sm">{fishName}</h4>
                            <p className="text-xs text-gray-600 mt-1.5 font-semibold leading-relaxed break-words whitespace-normal">{pre.content}</p>
                            <span className="text-[9px] text-gray-400 font-bold block mt-2">
                              {new Date(pre.created_at).toLocaleString('vi-VN')}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Rating & Feedbacks */}
                <div className="lg:col-span-4 flex flex-col gap-3 bg-gray-800/50 p-4 rounded-xl border border-gray-700 max-h-[500px]">
                  <h3 className="font-extrabold text-gray-300 flex items-center gap-2 text-xs sm:text-sm uppercase tracking-wider pb-2 border-b border-gray-700">
                    <Star className="w-4.5 h-4.5 text-yellow-500" />
                    Góp Ý & Đánh Giá ({ratingFeedbacks.length})
                  </h3>
                  {ratingFeedbacks.length === 0 ? (
                    <p className="text-gray-400 italic text-xs py-4 text-center">Không có góp ý nào.</p>
                  ) : (
                    <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                      {ratingFeedbacks.map(fb => {
                        const cleanTitle = fb.title?.startsWith('[Feedback] ') ? fb.title.replace('[Feedback] ', '') : (fb.title || 'Góp ý chất lượng');
                        return (
                          <div key={fb.id} className="bg-gray-800 border border-gray-700 rounded-xl p-3 relative group">
                            
                            {confirmDeleteFeedbackId === fb.id ? (
                              <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-50 border border-red-200 rounded p-0.5 z-10 scale-90">
                                <button
                                  onClick={() => {
                                    handleDeleteFeedback(fb.id);
                                    setConfirmDeleteFeedbackId(null);
                                  }}
                                  className="w-6 h-6 bg-red-600 text-white rounded flex items-center justify-center hover:bg-red-700 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteFeedbackId(null)}
                                  className="w-6 h-6 bg-gray-100 text-gray-600 rounded flex items-center justify-center hover:bg-gray-200 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteFeedbackId(fb.id)}
                                className="absolute top-3 right-3 text-gray-400 hover:text-red-500 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer w-7 h-7 flex items-center justify-center"
                                title="Xóa góp ý"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <div className="flex items-center gap-0.5 mb-1.5 select-none">
                              {Array.from({ length: fb.rating || 5 }).map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                            <h4 className="font-bold text-gray-100 text-xs sm:text-sm leading-tight">{cleanTitle}</h4>
                            <p className="text-xs text-gray-600 mt-1.5 leading-relaxed font-semibold break-words whitespace-normal">{fb.content}</p>
                            <span className="text-[9px] text-gray-400 font-bold block mt-2">
                              {new Date(fb.created_at).toLocaleString('vi-VN')}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Live chat panel */}
                <div className="lg:col-span-4 flex flex-col gap-3 bg-gray-800/50 p-4 rounded-xl border border-gray-700 max-h-[500px]">
                  <h3 className="font-extrabold text-gray-300 flex items-center gap-2 text-xs sm:text-sm uppercase tracking-wider pb-2 border-b border-gray-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    Chat Trực Tuyến
                    {totalUnreadChats > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ml-auto">
                        {totalUnreadChats} chưa đọc
                      </span>
                    )}
                  </h3>

                  <div className="flex-grow flex flex-col gap-3 min-h-0">
                    {/* Chat rooms list */}
                    <div className="overflow-y-auto space-y-1.5 shrink-0 max-h-[140px] pr-1">
                      {chatSessions.length === 0 ? (
                        <p className="text-gray-400 italic text-xs py-4 text-center">Chưa có ai bắt đầu chat.</p>
                      ) : (
                        chatSessions.map(sess => {
                          const isActive = selectedChatUser === sess.user;
                          const hasUnread = sess.unreadCount > 0;
                          return (
                            <button
                              key={sess.user}
                              type="button"
                              onClick={() => {
                                setSelectedChatUser(sess.user);
                                setReplyMessage("");
                                // Tự động mark đã đọc khi admin mở chat
                                if (hasUnread) markChatAsRead(sess.user);
                              }}
                              className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer relative ${
                                isActive
                                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200 font-bold'
                                  : hasUnread
                                    ? 'bg-blue-500/5 border-blue-500/30 hover:bg-blue-500/10 text-gray-200'
                                    : 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-black truncate flex-1">{sess.user}</p>
                                {hasUnread && (
                                  <span className="bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shrink-0 animate-pulse">
                                    {sess.unreadCount}
                                  </span>
                                )}
                              </div>
                              <p className={`text-[10px] truncate mt-0.5 font-semibold ${hasUnread ? 'text-gray-300' : 'text-gray-500'}`}>
                                {sess.latestContent}
                              </p>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Active chat window */}
                    {selectedChatUser ? (
                      <div className="border border-gray-700 rounded-xl overflow-hidden flex flex-col flex-grow bg-gray-900 min-h-[220px]">
                        {/* Header */}
                        <div className="bg-emerald-600 text-white px-3 py-2 flex justify-between items-center shrink-0 shadow-2xs select-none gap-2">
                          <span className="text-[10px] sm:text-xs font-black truncate flex-1">{selectedChatUser}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => markChatAsUnread(selectedChatUser)}
                              title="Đánh dấu chưa đọc"
                              className="text-[10px] font-bold cursor-pointer h-7 px-2 bg-white/10 hover:bg-white/20 rounded transition-all"
                            >
                              Chưa đọc
                            </button>
                            {confirmDeleteFeedbackId === `chat-${selectedChatUser}` ? (
                              <div className="flex items-center gap-0.5 bg-white/20 rounded p-0.5">
                                <button
                                  onClick={() => { deleteChatSession(selectedChatUser); setConfirmDeleteFeedbackId(null); }}
                                  title="Xác nhận xoá cuộc trò chuyện"
                                  className="w-6 h-6 bg-red-600 text-white rounded flex items-center justify-center hover:bg-red-700"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteFeedbackId(null)}
                                  className="w-6 h-6 bg-white/30 text-white rounded flex items-center justify-center hover:bg-white/40"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteFeedbackId(`chat-${selectedChatUser}`)}
                                title="Xoá cuộc trò chuyện"
                                className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-red-600 rounded transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedChatUser(null)}
                              title="Đóng"
                              className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Message list */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                          {chatSessions.find(s => s.user === selectedChatUser)?.messages.map(m => {
                            const isReply = m.title?.startsWith('[Reply]');
                            return (
                              <div key={m.id} className={`flex flex-col ${isReply ? 'items-end' : 'items-start'} group/msg`}>
                                <div className="flex items-end gap-1.5 max-w-[90%]">
                                  {/* Delete button per message — hover only */}
                                  {!isReply && (
                                    <button
                                      onClick={() => handleDeleteFeedback(m.id)}
                                      title="Xoá tin nhắn này"
                                      className="opacity-0 group-hover/msg:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded cursor-pointer shrink-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                  <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                                    isReply
                                      ? 'bg-emerald-600 text-white rounded-tr-none font-medium'
                                      : 'bg-gray-800 text-gray-200 rounded-tl-none font-medium border border-gray-700'
                                  }`}>
                                    {m.content}
                                  </div>
                                  {isReply && (
                                    <button
                                      onClick={() => handleDeleteFeedback(m.id)}
                                      title="Xoá tin nhắn này"
                                      className="opacity-0 group-hover/msg:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded cursor-pointer shrink-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <span className="text-[8px] text-gray-500 font-semibold mt-0.5 flex items-center gap-1">
                                  {new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                  {!isReply && m.is_read === false && (
                                    <span className="text-blue-400 font-bold">• Mới</span>
                                  )}
                                </span>
                              </div>
                            )
                          })}
                        </div>

                        {/* Reply Form */}
                        <form onSubmit={handleSendReply} className="p-2 bg-gray-800 border-t border-gray-700 flex gap-2 shrink-0">
                          <input
                            required
                            type="text"
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Nhập phản hồi..."
                            className="flex-1 bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-500 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-emerald-500 font-medium h-9"
                            style={{ fontSize: '16px' }}
                          />
                          <button
                            type="submit"
                            disabled={sendingReply || !replyMessage.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs px-3.5 h-9 rounded-lg font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                          >
                            {sendingReply ? '...' : 'Gửi'}
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="border border-dashed border-gray-700 rounded-xl p-4 text-center text-gray-500 text-xs bg-gray-800/40 flex flex-col items-center justify-center flex-grow select-none min-h-[220px]">
                        💬 Chọn một cuộc hội thoại từ danh sách để bắt đầu hỗ trợ.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

          </div>
        </div>
        {/* END LEFT COLUMN */}

        {/* RIGHT SIDEBAR (desktop only, always visible) */}
        <div className="hidden md:flex w-80 xl:w-96 shrink-0 border-l border-gray-800 bg-gray-900 flex-col overflow-hidden">

          {/* Broadcast (collapsible) */}
          <div className={`shrink-0 border-b border-gray-800 transition-all duration-200 ${showGlobalPanel ? '' : ''}`}>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-sm text-gray-200">Phát Tin Nhanh</span>
              </div>
              <button onClick={() => setShowGlobalPanel(!showGlobalPanel)}
                className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-all cursor-pointer">
                {showGlobalPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            {showGlobalPanel && (
              <div className="px-4 pb-4 space-y-3 animate-in fade-in duration-150">
                <div className="flex gap-1.5">
                  {[
                    { id: 'general', label: '📢 Chung' },
                    { id: 'new_product', label: '🐟 Cá mới' },
                    { id: 'price_change', label: '🏷️ Đổi giá' },
                  ].map(t => (
                    <button key={t.id} type="button" onClick={() => setGlobalType(t.id as any)}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${globalType === t.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <textarea rows={2} value={globalMessage} onChange={e => setGlobalMessage(e.target.value)}
                  placeholder="Nội dung thông báo..."
                  className="w-full bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none font-medium"
                  style={{ fontSize: '14px' }} />
                <button type="button" disabled={sendingBroadcast || !globalMessage.trim()}
                  onClick={() => handleSendNotification(globalMessage, globalType)}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95">
                  {sendingBroadcast ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Đang gửi...</span></> : <><Send className="w-3.5 h-3.5" /><span>Phát tin ngay</span></>}
                </button>
              </div>
            )}
          </div>

          {/* Prep header */}
          <div className="px-4 py-2.5 border-b border-gray-800 shrink-0 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-500" />
            <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Kế Hoạch Làm Hàng</span>
          </div>

          {/* Prep controls */}
          <div className="p-3 border-b border-gray-800 shrink-0 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">MAX kg/mẻ</label>
                <input type="number" value={prepLimit} onChange={e => setPrepLimit(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">Sản phẩm</label>
                <select value={prepProductFilter} onChange={e => setPrepProductFilter(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-blue-500 cursor-pointer">
                  <option value="all">Tất cả</option>
                  {availableProducts.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">Min kg</label>
                <input type="number" value={prepMinWeight} onChange={e => setPrepMinWeight(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">Từ khoá</label>
                <input type="text" value={prepKeyword} onChange={e => setPrepKeyword(e.target.value)}
                  placeholder="ghi chú..."
                  className="w-full bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
              {(['all', 'company', 'ship'] as const).map((v, i) => (
                <button key={v} onClick={() => setPrepDeliveryFilter(v)}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all cursor-pointer ${prepDeliveryFilter === v ? 'bg-gray-600 text-gray-100' : 'text-gray-600 hover:text-gray-400'}`}>
                  {['Tất cả', 'Công ty', 'Giao hàng'][i]}
                </button>
              ))}
            </div>
          </div>

          {/* Product chips */}
          {preparationData.aggregatedProducts.length > 0 && (
            <div className="p-3 border-b border-gray-800 shrink-0">
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => setPrepProductFilter('all')}
                  className={`rounded-lg p-2 text-center border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${prepProductFilter === 'all' ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider">Tất cả</span>
                  <span className="text-xs font-black">{preparationData.totalKg.toFixed(1)} <span className="text-[9px]">kg</span></span>
                </button>
                {preparationData.aggregatedProducts.map(([name, data]) => (
                  <button key={name} onClick={() => setPrepProductFilter(name)}
                    className={`rounded-lg p-2 text-center border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${prepProductFilter === name ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider line-clamp-1">{name}</span>
                    <span className="text-xs font-black">{data.totalQty} <span className="text-[9px]">{data.unit}</span></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prep order cards (scrollable) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {preparationData.includedOrders.length === 0 ? (
              <p className="text-gray-600 italic text-xs text-center py-6">Chưa có đơn cần chuẩn bị.</p>
            ) : preparationData.includedOrders.map((order, index) => {
              const cleanName = getCleanCustomerName(order);
              const deliveryType = getDeliveryType(order);
              return (
                <div key={order.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[9px] font-black text-gray-500 bg-gray-700 rounded px-1 shrink-0">{index + 1}</span>
                      <span className="font-semibold text-sm text-gray-100 truncate">{cleanName}</span>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-2 ${deliveryType === 'company' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'}`}>
                      {deliveryType === 'company' ? 'Công ty' : 'Giao'}
                    </span>
                  </div>
                  <div className="p-2.5 space-y-1">
                    {order.order_items.map(item => {
                      const pName = item.products?.name || 'SP';
                      if (prepProductFilter !== 'all' && pName !== prepProductFilter) return null;
                      return (
                        <div key={item.id} className="flex justify-between items-center">
                          <span className="text-xs text-gray-400">{pName}</span>
                          <span className="text-xs font-black text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-1.5 py-0.5 rounded">
                            {item.quantity} {item.products?.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom actions (pinned) */}
          {(() => {
            const selectedOrdersInPrep = filteredOrders.filter(o => selectedOrderIds.has(o.id));
            const sourceOrders = copySourceMode === 'selected' ? selectedOrdersInPrep : preparationData.includedOrders;
            const sourceCount = sourceOrders.length;
            const sourceTotalKg = sourceOrders.reduce(
              (sum, o) => sum + (o.order_items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0),
              0
            );

            // Gom: 1 khách = 1 dòng, products aggregated
            const formatByCustomer = (list: typeof sourceOrders): string => {
              const byCustomer: Record<string, Record<string, { qty: number; unit: string }>> = {};
              list.forEach(o => {
                const name = getCleanCustomerName(o);
                if (!byCustomer[name]) byCustomer[name] = {};
                (o.order_items || []).forEach(it => {
                  const pName = it.products?.name || 'SP';
                  if (prepProductFilter !== 'all' && pName !== prepProductFilter) return;
                  const unit = it.products?.unit || 'kg';
                  const key = pName;
                  if (!byCustomer[name][key]) byCustomer[name][key] = { qty: 0, unit };
                  byCustomer[name][key].qty += it.quantity || 0;
                });
              });
              return Object.entries(byCustomer)
                .filter(([, products]) => Object.keys(products).length > 0)
                .sort(([a], [b]) => a.localeCompare(b, 'vi-VN'))
                .map(([name, products]) => {
                  const productList = Object.entries(products)
                    .map(([pName, d]) => `${pName} ${d.qty}${d.unit}`)
                    .join(', ');
                  return `${name}: ${productList}`;
                })
                .join('\n');
            };

            const handleCopy = () => {
              if (sourceCount === 0) {
                showToast('Không có đơn để copy!');
                return;
              }
              const text = formatByCustomer(sourceOrders);
              navigator.clipboard.writeText(text);
              showToast(`Đã copy ${sourceOrders.length} khách hàng!`);
            };

            const handlePrint = () => {
              if (sourceCount === 0) {
                showToast('Không có đơn để in!');
                return;
              }
              const text = formatByCustomer(sourceOrders);
              const lines = text.split('\n');
              const titleSource = copySourceMode === 'selected' ? 'Đơn đã chọn' : 'Mẻ làm hàng';
              const printWindow = window.open('', '_blank', 'width=800,height=900');
              if (!printWindow) {
                showToast('Trình duyệt chặn popup!');
                return;
              }
              printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Phiếu Làm Hàng</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Tahoma,sans-serif;padding:24px;color:#111;font-size:14px;line-height:1.6}
  h1{font-size:20px;margin-bottom:4px}
  .meta{color:#666;font-size:12px;margin-bottom:16px;border-bottom:1px solid #ddd;padding-bottom:8px}
  ol{padding-left:24px}
  li{padding:6px 0;border-bottom:1px dashed #eee}
  li strong{color:#000}
  .total{margin-top:16px;padding-top:12px;border-top:2px solid #333;font-weight:bold;font-size:15px}
  @media print { body{padding:12px} .no-print{display:none} }
</style></head><body>
<h1>PHIẾU LÀM HÀNG</h1>
<div class="meta">Nguồn: ${titleSource} · ${sourceOrders.length} đơn · ${sourceCount} khách hàng · ${new Date().toLocaleString('vi-VN')}</div>
<ol>
${lines.map(l => {
  const idx = l.indexOf(':');
  if (idx === -1) return `<li>${l}</li>`;
  return `<li><strong>${l.slice(0, idx)}:</strong>${l.slice(idx + 1)}</li>`;
}).join('')}
</ol>
<div class="total">TỔNG KHỐI LƯỢNG: ${sourceTotalKg.toFixed(1)} kg</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}</script>
</body></html>`);
              printWindow.document.close();
            };

            return (
              <div className="border-t border-gray-700 p-3 shrink-0 space-y-2">
                {/* Source toggle */}
                <div className="flex items-center gap-1 bg-gray-800 p-0.5 rounded-lg">
                  <button
                    onClick={() => setCopySourceMode('prep')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${copySourceMode === 'prep' ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Mẻ làm hàng ({preparationData.includedOrders.length})
                  </button>
                  <button
                    onClick={() => setCopySourceMode('selected')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${copySourceMode === 'selected' ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Đơn đã tick ({selectedOrdersInPrep.length})
                  </button>
                </div>
                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    disabled={sourceCount === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 font-bold text-xs rounded-lg transition-all cursor-pointer border border-gray-700"
                  >
                    <ClipboardCopy className="w-3.5 h-3.5" />
                    <span>Copy ({sourceCount})</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    disabled={sourceCount === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 font-bold text-xs rounded-lg transition-all cursor-pointer border border-gray-700"
                  >
                    <span>In Phiếu ({sourceCount})</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
        {/* END RIGHT SIDEBAR */}

      </div>
      {/* END TWO-COLUMN BODY */}
    </div>
  );
}
