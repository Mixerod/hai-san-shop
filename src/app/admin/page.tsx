"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
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
  Fish
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
    badge: "bg-yellow-100 text-yellow-700",
  },
  {
    value: "confirmed",
    label: "Đã xác nhận",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    value: "delivering",
    label: "Đang giao",
    badge: "bg-teal-100 text-teal-700",
  },
  {
    value: "done",
    label: "Đã hoàn thành",
    badge: "bg-green-100 text-green-700",
  },
  { value: "cancelled", label: "Đã hủy", badge: "bg-red-100 text-red-700" },
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

  // Bulk update states
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("confirmed");
  const [updatingBulk, setUpdatingBulk] = useState(false);

  // Preparation stats states
  const [activeTab, setActiveTab] = useState<"orders" | "preparation" | "products" | "feedbacks">("orders");
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
  const [showGlobalPanel, setShowGlobalPanel] = useState(true);

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
          alert(
            '💡 Chào Quyết! Tính năng gửi thông báo yêu cầu có bảng "notifications" trong database.\n\nBạn vui lòng mở Supabase Dashboard -> SQL Editor và chạy đoạn code sau để tạo bảng:\n\nCREATE TABLE public.notifications (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  message text NOT NULL,\n  type text DEFAULT \'general\',\n  created_at timestamptz DEFAULT now() NOT NULL\n);\nALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Allow anon select" ON public.notifications FOR SELECT USING (true);\nCREATE POLICY "Allow admin all" ON public.notifications FOR ALL USING (true);',
          );
          return;
        }
        throw error;
      }

      showToast("Đã phát thông báo thành công! ⚡");
      setGlobalMessage("");
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi gửi thông báo: " + err.message);
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
        alert('💡 Chào Quyết! Tải ảnh không thành công do chính sách bảo mật (RLS) trên Supabase Storage của bạn đang chặn quyền ghi.\n\nVui lòng mở Supabase Dashboard -> SQL Editor và chạy đoạn lệnh sau để mở quyền cho bucket "haisanshop":\n\n' +
          'CREATE POLICY "Allow public select on haisanshop" ON storage.objects FOR SELECT TO public USING (bucket_id = \'haisanshop\');\n' +
          'CREATE POLICY "Allow public insert on haisanshop" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = \'haisanshop\');\n' +
          'CREATE POLICY "Allow public update on haisanshop" ON storage.objects FOR UPDATE TO public USING (bucket_id = \'haisanshop\') WITH CHECK (bucket_id = \'haisanshop\');\n' +
          'CREATE POLICY "Allow public delete on haisanshop" ON storage.objects FOR DELETE TO public USING (bucket_id = \'haisanshop\');'
        );
      } else {
        alert('Lỗi tải ảnh: ' + err.message);
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || newProduct.price <= 0) {
      alert("Vui lòng nhập tên và giá sản phẩm hợp lệ!");
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
    } catch (err: any) {
      console.error(err);
      if (err.message?.toLowerCase().includes('original_price') || err.message?.toLowerCase().includes('tag') || err.message?.toLowerCase().includes('column')) {
        alert('💡 Chào Quyết! Lỗi xảy ra do bảng "products" trong database của bạn chưa có hai cột "original_price" (giá gốc để hiển thị giá cũ gạch ngang) và "tag" (nhãn lấp lánh như bán chạy, hàng mới...).\n\nVui lòng mở Supabase Dashboard -> SQL Editor và chạy đoạn lệnh sau để thêm hai cột này vào database:\n\n' +
          'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_price numeric DEFAULT NULL;\n' +
          'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tag text DEFAULT \'none\';'
        );
      } else if (err.message?.toLowerCase().includes('row-level security') || err.message?.toLowerCase().includes('violates row-level security')) {
        alert('💡 Chào Quyết! Thêm sản phẩm không thành công do chính sách bảo mật (RLS) trên bảng "products" của bạn đang chặn quyền ghi.\n\nVui lòng mở Supabase Dashboard -> SQL Editor và chạy dòng lệnh sau để mở quyền thêm sản phẩm:\n\n' +
          'CREATE POLICY "Allow public insert products" ON public.products FOR INSERT WITH CHECK (true);\n' +
          'CREATE POLICY "Allow public select products" ON public.products FOR SELECT USING (true);'
        );
      } else {
        alert('Lỗi thêm sản phẩm: ' + err.message);
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
      const { error } = await supabase
        .from('feedbacks')
        .insert({
          title: `[Reply] ${selectedChatUser}`,
          content: replyMessage.trim(),
          rating: 5
        });

      if (error) throw error;
      setReplyMessage("");
      fetchFeedbacks();
    } catch (err: any) {
      alert("Lỗi khi gửi phản hồi: " + err.message);
    } finally {
      setSendingReply(false);
    }
  }

  async function handleDeleteFeedback(id: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa phản hồi/yêu cầu này không?")) return;
    try {
      const { error } = await supabase.from('feedbacks').delete().eq('id', id);
      if (error) throw error;
      showToast("Đã xóa thành công!");
      fetchFeedbacks();
    } catch (err: any) {
      alert("Lỗi khi xóa: " + err.message);
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
      alert("Đã xảy ra lỗi khi tải dữ liệu. Vui lòng làm mới trang.");
    } finally {
      setLoading(false);
    }
  }

  // Lọc dữ liệu bằng useMemo để tối ưu render
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Lọc theo trạng thái
      if (statusFilter === "active") {
        // Mặc định: Chỉ hiện đơn chưa xong (không phải done hoặc cancelled)
        if (order.status === "done" || order.status === "cancelled")
          return false;
      } else if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      // 2. Lọc theo khoảng thời gian (created_at)
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
      return true;
    });
  }, [orders, startDate, endDate, statusFilter]);

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
      let phone = order.profiles?.phone || "";
      if (!phone && order.note) {
        const phoneMatch = order.note.match(/(0[3|5|7|8|9])+([0-9]{8})\b/);
        if (phoneMatch) phone = phoneMatch[0];
      }
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
    if (
      !confirm(
        `Bạn muốn cập nhật trạng thái cho ${selectedOrderIds.size} đơn hàng?`,
      )
    )
      return;

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
      alert("Không thể cập nhật trạng thái hàng loạt.");
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
    let revenue = 0;
    let totalOrders = filteredOrders.length;
    const uniqueCustomers = new Set<string>();

    filteredOrders.forEach((o) => {
      // Doanh thu chỉ tính các đơn chưa hủy
      if (o.status !== "cancelled") {
        revenue += o.total_amount;
      }

      // Bóc tách KH từ profile hoặc ghi chú
      let phone = o.profiles?.phone || "";
      if (!phone && o.note) {
        const phoneMatch = o.note.match(/(0[3|5|7|8|9])+([0-9]{8})\b/g);
        if (phoneMatch) phone = phoneMatch[0];
      }
      if (phone) uniqueCustomers.add(phone);
    });

    return {
      revenue,
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
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
      alert("Không thể cập nhật trạng thái đơn hàng.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (
      !confirm(
        "Bạn có chắc chắn muốn xóa đơn hàng này? Hành động này không thể hoàn tác.",
      )
    )
      return;

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
        alert(
          "Lỗi: Không thể xóa đơn hàng này khỏi Database. \n\nNguyên nhân có thể do chính sách bảo mật (RLS) trên Supabase của bạn chưa cho phép xóa đơn hàng của khách khác. Bạn hãy vào Supabase Dashboard để kiểm tra phần Policies của bảng orders nhé!",
        );
        return;
      }

      setOrders(orders.filter((o) => o.id !== orderId));
      showToast("Đã xóa đơn hàng vĩnh viễn!");
    } catch (error: any) {
      console.error("Lỗi khi xóa đơn hàng:", error);
      alert("Lỗi hệ thống: " + (error.message || "Lỗi không xác định"));
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
      // Bắt buộc gọi price_at_time
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
      alert("Đã xảy ra lỗi khi xuất file báo cáo.");
      setExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const found = STATUSES.find((s) => s.value === status);
    return found ? found.badge : "bg-gray-100 text-gray-700";
  };

  return (
    // Sử dụng màu nền sáng (bg-gray-50) để làm nổi bật bảng dữ liệu chuyên nghiệp (Light Theme for Dashboard)
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans absolute inset-0 overflow-y-auto z-[60]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      <div className="w-full flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full max-w-7xl space-y-8">
          {/* Header & Title */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 tracking-tight">
                <Package className="w-8 h-8 text-blue-600" />
                Bảng điều khiển Admin
              </h1>
              <p className="text-gray-500 mt-2 font-medium">
                Theo dõi doanh thu, xử lý đơn và xuất báo cáo nội bộ
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleExport}
                disabled={filteredOrders.length === 0 || exporting || loading}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {exporting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                )}
                {exporting ? "Đang xuất..." : "Xuất Báo Cáo"}
              </button>
            </div>
          </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b border-gray-200 mt-2 mb-6 print:hidden">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`pb-4 px-2 font-bold text-sm transition-all border-b-4 ${activeTab === 'orders' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Quản lý Đơn hàng
          </button>
          <button 
            onClick={() => setActiveTab('preparation')}
            className={`pb-4 px-2 font-bold text-sm transition-all border-b-4 flex items-center gap-2 ${activeTab === 'preparation' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Gom đơn & Thống kê làm hàng
            <span className="bg-orange-100 text-orange-600 py-0.5 px-2 rounded-full text-[10px]">Mới</span>
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`pb-4 px-2 font-bold text-sm transition-all border-b-4 flex items-center gap-2 ${activeTab === 'products' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <PlusCircle className="w-4 h-4" />
            Thêm sản phẩm
          </button>
          <button 
            onClick={() => setActiveTab('feedbacks')}
            className={`pb-4 px-2 font-bold text-sm transition-all border-b-4 flex items-center gap-2 ${activeTab === 'feedbacks' ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <MessageSquare className="w-4 h-4" />
            Góp ý & Đặt trước
            {feedbacks.length > 0 && (
              <span className="bg-pink-100 text-pink-600 py-0.5 px-2 rounded-full text-[10px]">
                {feedbacks.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'orders' && (
          <>
          {/* 3 Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <DollarSign className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Doanh thu hợp lệ
                </p>
                <h2 className="text-2xl font-bold text-gray-900">
                  {summary.revenue.toLocaleString("vi-VN")}đ
                </h2>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-7 h-7 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Tổng đơn lọc được
                </p>
                <h2 className="text-2xl font-bold text-gray-900">
                  {summary.totalOrders} đơn
                </h2>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                <Users className="w-7 h-7 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Số lượng khách
                </p>
                <h2 className="text-2xl font-bold text-gray-900">
                  {summary.totalCustomers} người
                </h2>
              </div>
            </div>
          </div>

          {/* Bảng phát tin nhanh cho Admin Dashboard */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-250 p-6 relative overflow-hidden animate-in fade-in duration-300">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                  <Megaphone className="w-5 h-5 text-blue-600 animate-bounce" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Bảng Phát Tin Nhanh
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">
                    Gửi thông báo real-time tới tất cả khách hàng
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGlobalPanel(!showGlobalPanel)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
              >
                {showGlobalPanel ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            </div>

            {showGlobalPanel && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Loại thông báo
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      {
                        id: "general",
                        label: "📢 Thông báo chung",
                        bg: "bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100/50",
                      },
                      {
                        id: "new_product",
                        label: "🐟 Có cá mới nà",
                        bg: "bg-green-50 border-green-100 text-green-700 hover:bg-green-100/50",
                      },
                      {
                        id: "price_change",
                        label: "🏷️ Có đổi giá nè",
                        bg: "bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100/50",
                      },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setGlobalType(t.id as any)}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                          globalType === t.id
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10"
                            : t.bg
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Nội dung tin nhắn
                  </label>
                  <textarea
                    rows={2}
                    value={globalMessage}
                    onChange={(e) => setGlobalMessage(e.target.value)}
                    placeholder="Nhập nội dung cần thông báo cho khách hàng... (Ví dụ: Có cá hồi tươi Phan Thiết vừa cập bến nà cả nhà ơi!)"
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold leading-relaxed transition-all shadow-inner"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={sendingBroadcast || !globalMessage.trim()}
                    onClick={() =>
                      handleSendNotification(globalMessage, globalType)
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm px-6 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2 border border-blue-600/10 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    {sendingBroadcast ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang gửi tin...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Phát tin ngay 🚀</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar: Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              {/* Filter Date */}
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-300 text-sm rounded-lg px-3 py-2 text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-gray-300 text-sm rounded-lg px-3 py-2 text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter Status */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 text-sm rounded-lg px-3 py-2 text-gray-700 w-full outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-bold"
                >
                  <option value="active">📌 Đơn cần xử lý (Mặc định)</option>
                  <option value="all">🌐 Tất cả đơn hàng</option>
                  <hr className="my-1" />
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={fetchOrders}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors border border-gray-200 shrink-0 w-full md:w-auto"
            >
              <RefreshCcw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Làm mới
            </button>
          </div>

          {/* Bảng Dữ Liệu Chuyên Nghiệp */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative min-h-[400px]">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm text-gray-600 border-collapse">
                <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 w-12">
                      <input 
                        type="checkbox" 
                        checked={filteredOrders.length > 0 && selectedOrderIds.size === filteredOrders.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 cursor-pointer accent-blue-600"
                      />
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap uppercase tracking-wider text-xs">
                      Mã Đơn
                    </th>
                    <th className="px-6 py-4 uppercase tracking-wider text-xs">
                      Khách Hàng & Liên Hệ
                    </th>
                    <th className="px-6 py-4 uppercase tracking-wider text-xs">
                      Chi Tiết Món Hàng
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap text-right uppercase tracking-wider text-xs">
                      Tổng Tiền
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap uppercase tracking-wider text-xs">
                      Ngày Đặt
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap text-center uppercase tracking-wider text-xs">
                      Trạng Thái
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-28 text-center">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">
                          Đang tải và đồng bộ dữ liệu...
                        </p>
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-28 text-center">
                        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium text-lg">
                          Không tìm thấy đơn hàng nào phù hợp với bộ lọc
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 transition-colors group"
                      >
                        <td className="px-3 md:px-6 py-4 md:py-5">
                          <input 
                            type="checkbox" 
                            checked={selectedOrderIds.has(order.id)}
                            onChange={() => toggleSelectOrder(order.id)}
                            className="w-5 h-5 cursor-pointer accent-blue-600"
                          />
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-5 whitespace-nowrap font-mono text-gray-500 font-medium text-xs">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-5 whitespace-normal break-words min-w-[200px]">
                          <p className="font-bold text-gray-900">
                            {order.profiles?.full_name || "Khách (Xem ghi chú)"}
                          </p>
                          <p
                            className="text-xs text-gray-500 mt-1 break-words whitespace-normal"
                          >
                            {order.note || "Không có ghi chú"}
                          </p>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-5 min-w-[220px]">
                          <ul className="space-y-1.5">
                            {order.order_items?.map((item) => (
                              <li
                                key={item.id}
                                className="text-sm border-b border-gray-100 last:border-0 pb-1 last:pb-0"
                              >
                                <span className="font-semibold text-gray-800">
                                  {item.products?.name || "SP"}
                                </span>{" "}
                                <span className="text-gray-500">
                                  (x{item.quantity} {item.products?.unit || "kg"} -{" "}
                                  {item.price_at_time.toLocaleString("vi-VN")}đ)
                                </span>
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right">
                          <p className="font-bold text-gray-900 text-base">
                            {order.total_amount.toLocaleString("vi-VN")}đ
                          </p>
                          <p className="text-xs font-medium text-gray-500 mt-1 uppercase">
                            {order.payment_method === "cod"
                              ? "COD (Tiền mặt)"
                              : "Bank (CK)"}
                          </p>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 font-medium">
                          {new Date(order.created_at).toLocaleString("vi-VN")}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-center align-middle">
                          <div className="relative flex flex-col items-center gap-2 w-full max-w-[140px] mx-auto">
                            <div className="relative w-full">
                              <select
                                disabled={updatingId === order.id}
                                value={order.status}
                                onChange={(e) =>
                                  handleUpdateStatus(order.id, e.target.value)
                                }
                                className={`appearance-none cursor-pointer border border-transparent w-full text-center px-4 py-2 rounded-full text-xs font-bold transition-all focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 outline-none shadow-sm ${getStatusBadge(order.status)} ${updatingId === order.id ? "opacity-50" : "hover:opacity-80"}`}
                              >
                                {STATUSES.map((s) => (
                                  <option
                                    key={s.value}
                                    value={s.value}
                                    className="bg-white text-gray-900"
                                  >
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

                            {(order.status === "delivering" ||
                              order.status === "done") && (
                              <button
                                onClick={() => copyZaloMessage(order)}
                                className="text-[11px] flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg transition-colors font-bold border border-blue-200 w-full active:scale-95"
                                title="Copy tin nhắn Zalo"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copy Zalo
                              </button>
                            )}

                            <button
                              disabled={updatingId === order.id}
                              onClick={() => handleDeleteOrder(order.id)}
                              className="text-[11px] flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg transition-colors font-bold border border-red-200 w-full active:scale-95 disabled:opacity-50"
                              title="Xóa đơn hàng"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Xóa đơn
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selectedOrderIds.size > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-blue-200 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] p-4 px-6 z-[100] flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-5">
              <div className="font-bold text-blue-700">
                Đã chọn {selectedOrderIds.size} đơn hàng
              </div>
              <div className="flex items-center gap-3">
                <select 
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 outline-none font-semibold text-sm"
                >
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <button
                  onClick={handleBulkUpdateStatus}
                  disabled={updatingBulk}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 transition-all"
                >
                  {updatingBulk && <Loader2 className="w-4 h-4 animate-spin" />}
                  Cập nhật
                </button>
                <button 
                  onClick={() => setSelectedOrderIds(new Set())}
                  className="text-gray-500 hover:text-gray-700 font-medium px-2 py-2"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          </>
        )}

        {activeTab === 'preparation' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8 animate-in fade-in zoom-in-95 duration-300 print:shadow-none print:border-none print:p-0">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Package className="w-6 h-6 text-orange-500" />
                  Kế hoạch làm hàng & Gom đơn
                </h2>
                <p className="text-gray-500 text-sm mt-1">Hệ thống ưu tiên các đơn hàng đặt sớm nhất (Chờ xử lý / Đã xác nhận).</p>
              </div>
              <button 
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-lg transition-colors border border-orange-200 shadow-sm text-sm print:hidden flex items-center gap-2"
                title="Bấm để in danh sách này ra giấy"
              >
                🖨️ In Phiếu Làm Hàng
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-5 rounded-xl border border-gray-100 print:hidden">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">MAX Gom mẻ (kg)</label>
                <input 
                  type="number"
                  value={prepLimit}
                  onChange={(e) => setPrepLimit(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-orange-500 font-semibold"
                  placeholder="VD: 20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Lọc Sản Phẩm</label>
                <select 
                  value={prepProductFilter}
                  onChange={(e) => setPrepProductFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-orange-500 font-semibold text-gray-800"
                >
                  <option value="all">Tất cả sản phẩm</option>
                  {availableProducts.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Chỉ lấy KH đặt &gt;= (kg)</label>
                <input 
                  type="number"
                  value={prepMinWeight}
                  onChange={(e) => setPrepMinWeight(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-orange-500 font-semibold text-blue-600"
                  placeholder="VD: 5"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Từ khoá Ghi chú</label>
                <input 
                  type="text"
                  value={prepKeyword}
                  onChange={(e) => setPrepKeyword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-orange-500 font-semibold"
                  placeholder="VD: tại nhà, công ty..."
                />
              </div>

              {/* Hình thức nhận hàng & Chế độ Tinh gọn */}
              <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200/80 items-end">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Hình thức nhận hàng</label>
                  <div className="flex bg-gray-200/60 p-1 rounded-xl w-full gap-1">
                    <button
                      onClick={() => setPrepDeliveryFilter('all')}
                      className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all active:scale-95 ${prepDeliveryFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Tất cả
                    </button>
                    <button
                      onClick={() => setPrepDeliveryFilter('company')}
                      className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all active:scale-95 ${prepDeliveryFilter === 'company' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Tại công ty 🏢
                    </button>
                    <button
                      onClick={() => setPrepDeliveryFilter('ship')}
                      className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all active:scale-95 ${prepDeliveryFilter === 'ship' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Giao tận nơi 🚚
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 h-full pb-0.5">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={showCustomerNames}
                      onChange={(e) => setShowCustomerNames(e.target.checked)}
                      className="w-5 h-5 accent-orange-600 rounded"
                    />
                    <span className="font-semibold text-xs sm:text-sm text-gray-700">Tên khách trên thẻ in</span>
                  </label>

                  <button
                    onClick={() => setIsCompactMode(!isCompactMode)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all active:scale-95 shadow-sm ${
                      isCompactMode 
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent ring-2 ring-orange-400 ring-offset-1 font-extrabold' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span>{isCompactMode ? '✨ Đang tinh gọn' : '🔎 Xem tinh gọn'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tổng hợp khối lượng */}
            <div className="bg-gradient-to-br from-orange-50/20 to-amber-50/20 p-5 rounded-2xl border border-gray-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200/80 pb-4 mb-4 gap-3">
                <div>
                  <h3 className="font-extrabold text-gray-800 text-lg">Tổng khối lượng cần chuẩn bị</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Tổng hợp từ các đơn hàng nằm trong mẻ hiện tại.</p>
                </div>
                {preparationData.totalKg > 0 && (
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md rounded-2xl px-5 py-3 flex flex-col items-end gap-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-100">Tổng mẻ thực tế</span>
                    <span className="text-2xl font-black">
                      {preparationData.totalKg.toFixed(1)} <span className="text-xs font-semibold text-blue-100">kg</span>
                      {prepLimit > 0 && <span className="text-xs font-normal text-blue-200"> / {prepLimit} kg Max</span>}
                    </span>
                  </div>
                )}
              </div>

              {preparationData.aggregatedProducts.length === 0 ? (
                <p className="text-gray-500 italic">Không có dữ liệu phù hợp với bộ lọc hiện tại.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {preparationData.aggregatedProducts.map(([name, data]) => (
                    <div key={name} className="bg-orange-50 border border-orange-200/80 rounded-xl p-4 text-center shadow-[0_2px_8px_rgba(249,115,22,0.03)] hover:scale-[1.02] transition-transform">
                      <p className="text-xs text-orange-800 font-bold uppercase mb-1 line-clamp-1">{name}</p>
                      <p className="text-2xl font-black text-orange-600">{data.totalQty} <span className="text-sm font-semibold">{data.unit}</span></p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chi tiết đơn hàng trong mẻ này */}
            <div>
              <h3 className="font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 text-lg mt-8">
                Chi tiết đơn hàng thuộc mẻ này ({preparationData.includedOrders.length} đơn)
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
                {preparationData.includedOrders.length === 0 && (
                  <p className="text-gray-500 italic col-span-full">Chưa có đơn hàng nào cần chuẩn bị.</p>
                )}
                {preparationData.includedOrders.map((order, index) => {
                  if (isCompactMode) {
                    const cleanName = getCleanCustomerName(order);
                    return (
                      <div 
                        key={order.id} 
                        className="bg-gradient-to-br from-white to-slate-50/50 border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_15px_rgba(0,0,0,0.02)] hover:shadow-md transition-all duration-200 break-inside-avoid flex flex-col gap-4 border-l-4 border-l-orange-500 print:border-slate-300 print:shadow-none"
                      >
                        {/* Hàng trên: Số thứ tự + Tên khách hàng */}
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center bg-slate-100 text-slate-700 text-xs font-black rounded-lg w-7 h-7 shrink-0 print:border print:border-slate-300">
                            {(index + 1).toString().padStart(2, '0')}
                          </span>
                          <p className="font-black text-2xl text-blue-900 tracking-tight print:text-black line-clamp-1">
                            {cleanName}
                          </p>
                        </div>
                        
                        {/* Hàng dưới: Danh sách sản phẩm dạng thẻ nhỏ siêu dễ đọc */}
                        <div className="flex flex-col gap-2 border-t border-slate-100/80 pt-3">
                          {order.order_items.map(item => {
                            const pName = item.products?.name || 'SP'
                            if (prepProductFilter !== 'all' && pName !== prepProductFilter) return null
                            return (
                              <div 
                                key={item.id} 
                                className="flex justify-between items-center bg-white border border-slate-100 rounded-xl px-4 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] print:border-slate-300"
                              >
                                <span className="text-lg font-extrabold text-slate-700 print:text-black">
                                  {pName}
                                </span>
                                <span className="text-xl font-black text-orange-600 print:text-black bg-orange-50/50 px-2.5 py-0.5 rounded-lg border border-orange-100/60 shrink-0">
                                  {item.quantity} {item.products?.unit}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={order.id} className="flex flex-col sm:flex-row gap-3 bg-white border border-gray-200 print:border-gray-300 rounded-lg p-3 sm:p-4 shadow-sm print:shadow-none break-inside-avoid">
                      <div className="sm:w-1/2">
                        <p className="font-mono text-xs font-bold text-gray-400 print:text-gray-500">
                          #{(index + 1).toString().padStart(2, '0')} - MÃ: {order.id.slice(0,6).toUpperCase()}
                          {prepDeliveryFilter === 'all' && ` · ${getDeliveryType(order) === 'company' ? '🏢 Tại công ty' : '🚚 Giao tận nơi'}`}
                        </p>
                        {showCustomerNames && (
                          <p className="font-bold text-gray-800 mt-1 print:text-black">
                            {order.profiles?.full_name || 'Khách (Xem ghi chú)'}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-500 mt-0.5 print:text-gray-600">
                          {new Date(order.created_at).toLocaleString('vi-VN')}
                        </p>
                        {order.note && showCustomerNames && (
                          <p className="text-xs text-gray-700 mt-1 italic break-words whitespace-normal print:text-black">
                            Ghi chú: {order.note}
                          </p>
                        )}
                      </div>
                      <div className="flex-1 border-t sm:border-t-0 sm:border-l border-gray-100 print:border-gray-200 pt-2 sm:pt-0 sm:pl-3">
                        <ul className="text-sm space-y-1">
                          {order.order_items.map(item => {
                            const pName = item.products?.name || 'SP'
                            if (prepProductFilter !== 'all' && pName !== prepProductFilter) return null
                            return (
                              <li key={item.id} className="flex justify-between border-b border-gray-100 print:border-gray-200 last:border-0 pb-1">
                                <span className="text-gray-700 print:text-black text-xs font-medium">{pName}</span>
                                <span className="font-bold text-gray-900 print:text-black text-xs">{item.quantity} {item.products?.unit}</span>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 animate-in fade-in duration-300">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <PlusCircle className="w-6 h-6 text-green-600" />
                Thêm Sản Phẩm Mới
              </h2>
              <p className="text-gray-500 mt-1">
                Điền thông tin và tải ảnh lên để thêm sản phẩm trực tiếp vào cửa hàng.
              </p>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-6 max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Ảnh Sản Phẩm */}
                <div className="md:col-span-2 flex flex-col items-start gap-4">
                  <label className="block text-sm font-semibold text-gray-700">Ảnh Sản Phẩm</label>
                  <div className="flex items-center gap-6 w-full">
                    <div className="w-32 h-32 shrink-0 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl overflow-hidden flex items-center justify-center relative">
                      {newProduct.image_url ? (
                        <img src={newProduct.image_url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      )}
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="flex items-center justify-center w-full sm:w-auto sm:inline-flex px-6 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <UploadCloud className="w-5 h-5 mr-2 text-gray-500" />
                        <span>Tải ảnh lên (Supabase)</span>
                        <input type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                      </label>
                      <p className="mt-2 text-xs text-gray-500">Hỗ trợ JPG, PNG, WEBP. Ảnh sẽ được tự động lưu vào bucket "haisanshop".</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Tên Sản Phẩm *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full border-gray-300 rounded-xl px-4 py-2.5 bg-gray-50 focus:bg-white border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="VD: Chả mực giã tay..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Danh Mục</label>
                  <input
                    type="text"
                    value={newProduct.category || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full border-gray-300 rounded-xl px-4 py-2.5 bg-gray-50 focus:bg-white border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="VD: haisan, chamuc, kho..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Giá (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newProduct.price || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    className="w-full border-gray-300 rounded-xl px-4 py-2.5 bg-gray-50 focus:bg-white border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-bold"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Giá gốc chưa giảm (Shopee-style)</label>
                  <input
                    type="number"
                    min="0"
                    value={newProduct.original_price || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, original_price: e.target.value ? Number(e.target.value) : null })}
                    className="w-full border-gray-300 rounded-xl px-4 py-2.5 bg-gray-50 focus:bg-white border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-bold"
                    placeholder="Trống (Không giảm giá)"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Thẻ nổi bật & Viền lấp lánh</label>
                  <select
                    value={newProduct.tag || 'none'}
                    onChange={(e) => setNewProduct({ ...newProduct, tag: e.target.value })}
                    className="w-full border-gray-300 rounded-xl px-4 py-2.5 bg-gray-50 focus:bg-white border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none cursor-pointer font-bold"
                  >
                    <option value="none">Không có (Bình thường)</option>
                    <option value="best_seller">🔥 Bán chạy</option>
                    <option value="rare">💎 Hải sản hiếm</option>
                    <option value="new">⚡ Hàng mới</option>
                    <option value="premium">👑 Ngon đặc biệt</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Đơn vị tính</label>
                  <input
                    type="text"
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className="w-full border-gray-300 rounded-xl px-4 py-2.5 bg-gray-50 focus:bg-white border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="VD: kg, hộp 500g, con..."
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Mô Tả Sản Phẩm</label>
                  <textarea
                    rows={4}
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full border-gray-300 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
                    placeholder="Nhập mô tả chi tiết sản phẩm..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Ghi chú thêm (hiển thị mờ)</label>
                  <input
                    type="text"
                    value={newProduct.note}
                    onChange={(e) => setNewProduct({ ...newProduct, note: e.target.value })}
                    className="w-full border-gray-300 rounded-xl px-4 py-2.5 bg-gray-50 focus:bg-white border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="VD: Bảo quản ngăn đông..."
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={newProduct.in_stock}
                      onChange={(e) => setNewProduct({ ...newProduct, in_stock: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    <span className="ms-3 text-sm font-semibold text-gray-900">Còn hàng</span>
                  </label>
                </div>
                <div className="md:col-span-2 pt-6 border-t border-gray-150 flex justify-end">
                  <button
                    type="submit"
                    disabled={addingProduct}
                    className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 active:scale-95 text-white font-extrabold rounded-2xl shadow-lg shadow-green-650/20 border border-green-600 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm uppercase tracking-wider"
                  >
                    {addingProduct ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang thêm sản phẩm...</span>
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
        )}

        {activeTab === 'feedbacks' && (() => {
          // Parse và gom nhóm
          const preorders = feedbacks.filter(f => f.title?.startsWith('[Pre-Order] '));
          const ratingFeedbacks = feedbacks.filter(f => f.title?.startsWith('[Feedback] ') || (!f.title?.startsWith('[Pre-Order] ') && !f.title?.startsWith('[Chat] ') && !f.title?.startsWith('[Reply] ')));
          
          // Gom nhóm Chat Sessions
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
            return { user, messages: sorted, latestTime: latest.created_at, latestContent: latest.content };
          }).sort((a,b) => new Date(b.latestTime).getTime() - new Date(a.latestTime).getTime());

          return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 animate-in fade-in duration-300">
              <div className="mb-8 border-b border-gray-150 pb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-pink-600" />
                  Trung Tâm Góp Ý & Đặt Trước Hải Sản
                </h2>
                <p className="text-gray-500 mt-1">
                  Đọc phản hồi từ khách hàng, quản lý đơn hàng hải sản hiếm đặt trước, và phản hồi cuộc chat trực tuyến.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* 1. Đặt trước Hải sản Hiếm (4 cột) */}
                <div className="lg:col-span-4 space-y-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base border-b border-gray-100 pb-2">
                    <Fish className="w-5 h-5 text-orange-500" />
                    Đặt Trước Hải Sản Hiếm ({preorders.length})
                  </h3>
                  {preorders.length === 0 ? (
                    <p className="text-gray-400 italic text-sm py-4">Không có yêu cầu đặt trước nào.</p>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {preorders.map(pre => {
                        const fishName = pre.title.replace('[Pre-Order] ', '');
                        return (
                          <div key={pre.id} className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 relative group">
                            <button
                              onClick={() => handleDeleteFeedback(pre.id)}
                              className="absolute top-3 right-3 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Xóa yêu cầu"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <h4 className="font-extrabold text-orange-950 text-sm">{fishName}</h4>
                            <p className="text-xs text-gray-600 mt-2 font-semibold break-words whitespace-normal">{pre.content}</p>
                            <span className="text-[10px] text-gray-400 font-bold block mt-2">
                              {new Date(pre.created_at).toLocaleString('vi-VN')}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Đánh giá & Góp ý (4 cột) */}
                <div className="lg:col-span-4 space-y-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base border-b border-gray-100 pb-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Đánh Giá & Góp Ý ({ratingFeedbacks.length})
                  </h3>
                  {ratingFeedbacks.length === 0 ? (
                    <p className="text-gray-400 italic text-sm py-4">Không có góp ý nào.</p>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {ratingFeedbacks.map(fb => {
                        const cleanTitle = fb.title?.startsWith('[Feedback] ') ? fb.title.replace('[Feedback] ', '') : (fb.title || 'Góp ý chất lượng');
                        return (
                          <div key={fb.id} className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 relative group">
                            <button
                              onClick={() => handleDeleteFeedback(fb.id)}
                              className="absolute top-3 right-3 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Xóa góp ý"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-1 mb-1.5">
                              {Array.from({ length: fb.rating || 5 }).map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm leading-tight">{cleanTitle}</h4>
                            <p className="text-xs text-gray-600 mt-1.5 leading-relaxed font-semibold break-words whitespace-normal">{fb.content}</p>
                            <span className="text-[10px] text-gray-400 font-bold block mt-2">
                              {new Date(fb.created_at).toLocaleString('vi-VN')}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Live Chat Hỗ Trợ (4 cột) */}
                <div className="lg:col-span-4 space-y-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base border-b border-gray-100 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    Chat Hỗ Trợ Trực Tuyến
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {/* Danh sách phòng chat */}
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {chatSessions.length === 0 ? (
                        <p className="text-gray-400 italic text-sm py-4">Chưa có ai bắt đầu chat.</p>
                      ) : (
                        chatSessions.map(sess => (
                          <button
                            key={sess.user}
                            onClick={() => {
                              setSelectedChatUser(sess.user);
                              setReplyMessage("");
                            }}
                            className={`w-full text-left p-3 rounded-xl border transition-all ${
                              selectedChatUser === sess.user
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-gray-700'
                            }`}
                          >
                            <p className="text-xs font-black truncate">{sess.user}</p>
                            <p className="text-[10px] text-gray-500 truncate mt-0.5 font-semibold">{sess.latestContent}</p>
                          </button>
                        ))
                      )}
                    </div>

                    {/* Hộp thoại Chat đang chọn */}
                    {selectedChatUser ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col h-[320px] bg-slate-50">
                        {/* Header phòng chat */}
                        <div className="bg-emerald-600 text-white px-3.5 py-2.5 flex justify-between items-center shrink-0">
                          <span className="text-[11px] font-black truncate max-w-[80%]">{selectedChatUser}</span>
                          <button 
                            onClick={() => setSelectedChatUser(null)}
                            className="text-xs hover:underline font-bold"
                          >
                            Đóng
                          </button>
                        </div>

                        {/* List tin nhắn */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                          {chatSessions.find(s => s.user === selectedChatUser)?.messages.map(m => {
                            const isReply = m.title?.startsWith('[Reply]');
                            return (
                              <div key={m.id} className={`flex flex-col ${isReply ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                                  isReply 
                                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                                    : 'bg-white border border-slate-250 text-gray-800 rounded-tl-none'
                                }`}>
                                  {m.content}
                                </div>
                                <span className="text-[8px] text-gray-400 mt-0.5">
                                  {new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            )
                          })}
                        </div>

                        {/* Nhập tin nhắn phản hồi */}
                        <form onSubmit={handleSendReply} className="p-2 bg-white border-t border-slate-200 flex gap-2 shrink-0">
                          <input
                            required
                            type="text"
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Nhập nội dung phản hồi..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-emerald-500 font-semibold"
                          />
                          <button
                            type="submit"
                            disabled={sendingReply || !replyMessage.trim()}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-50"
                          >
                            {sendingReply ? '...' : 'Gửi'}
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-400 text-xs bg-slate-50/50 flex flex-col items-center justify-center h-[200px]">
                        💬 Chọn một cuộc trò chuyện ở danh sách phía trên để bắt đầu phản hồi khách hàng.
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
    </div>
  );
}
