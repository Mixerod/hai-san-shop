'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
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
  ChevronUp
} from 'lucide-react'

type OrderItem = {
  id: string
  quantity: number
  price_at_time: number
  products: {
    name: string
    unit: string
  }
}

type Order = {
  id: string
  total_amount: number
  status: string
  payment_method: string
  created_at: string
  note: string
  profiles: {
    full_name: string
    phone: string
  } | null
  order_items: OrderItem[]
}

// Cấu hình mã màu Badge Trạng Thái chuyên nghiệp
const STATUSES = [
  { value: 'pending', label: 'Chờ xử lý', badge: 'bg-yellow-100 text-yellow-700' },
  { value: 'confirmed', label: 'Đã xác nhận', badge: 'bg-blue-100 text-blue-700' },
  { value: 'delivering', label: 'Đang giao', badge: 'bg-teal-100 text-teal-700' },
  { value: 'done', label: 'Đã hoàn thành', badge: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: 'Đã hủy', badge: 'bg-red-100 text-red-700' },
]

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Global Broadcast states
  const [globalMessage, setGlobalMessage] = useState('')
  const [globalType, setGlobalType] = useState<'general' | 'new_product' | 'price_change'>('general')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [showGlobalPanel, setShowGlobalPanel] = useState(true)

  async function handleSendNotification(messageText: string, typeVal: string) {
    if (!messageText.trim()) return
    
    setSendingBroadcast(true)
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          message: messageText,
          type: typeVal,
          created_at: new Date().toISOString()
        })

      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          alert('💡 Chào Quyết! Tính năng gửi thông báo yêu cầu có bảng "notifications" trong database.\n\nBạn vui lòng mở Supabase Dashboard -> SQL Editor và chạy đoạn code sau để tạo bảng:\n\nCREATE TABLE public.notifications (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  message text NOT NULL,\n  type text DEFAULT \'general\',\n  created_at timestamptz DEFAULT now() NOT NULL\n);\nALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Allow anon select" ON public.notifications FOR SELECT USING (true);\nCREATE POLICY "Allow admin all" ON public.notifications FOR ALL USING (true);')
          return
        }
        throw error
      }

      showToast('Đã phát thông báo thành công! ⚡')
      setGlobalMessage('')
    } catch (err: any) {
      console.error(err)
      alert('Lỗi khi gửi thông báo: ' + err.message)
    } finally {
      setSendingBroadcast(false)
    }
  }

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const copyZaloMessage = (order: Order) => {
    const name = order.profiles?.full_name || 'bạn'
    const shortId = order.id.slice(0, 8).toUpperCase()
    const total = order.total_amount.toLocaleString('vi-VN')
    const message = `Xin chào ${name}, đơn hàng hải sản của bạn (Mã đơn: ${shortId}) đã được giao đến nơi an toàn. Tổng chi phí cho đơn hàng này là ${total}đ. Bạn vui lòng sắp xếp thời gian để nhận hàng nhé. Xin cảm ơn bạn đã đặt hàng!\n(Đây là tin nhắn tự động từ hệ thống Hải Sản Sạch)`
    
    navigator.clipboard.writeText(message)
    showToast('Đã copy mẫu tin nhắn!')
  }

  // Bộ lọc
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    setLoading(true)
    try {
      // BẮT BUỘC JOIN ĐỂ LẤY CHI TIẾT SẢN PHẨM & PROFILE
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles(full_name, phone),
          order_items(*, products(name, unit))
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setOrders(data as any)
    } catch (error) {
      console.error('Lỗi khi fetch orders:', error)
      alert('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng làm mới trang.')
    } finally {
      setLoading(false)
    }
  }

  // Lọc dữ liệu bằng useMemo để tối ưu render
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Lọc theo trạng thái
      if (statusFilter === 'active') {
        // Mặc định: Chỉ hiện đơn chưa xong (không phải done hoặc cancelled)
        if (order.status === 'done' || order.status === 'cancelled') return false
      } else if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false
      }
      
      // 2. Lọc theo khoảng thời gian (created_at)
      if (startDate || endDate) {
        const orderDate = new Date(order.created_at)
        orderDate.setHours(0, 0, 0, 0)
        
        if (startDate) {
          const s = new Date(startDate)
          s.setHours(0, 0, 0, 0)
          if (orderDate < s) return false
        }
        if (endDate) {
          const e = new Date(endDate)
          e.setHours(23, 59, 59, 999)
          if (orderDate > e) return false
        }
      }
      return true
    })
  }, [orders, startDate, endDate, statusFilter])

  // Tính toán 3 Card Thống Kê Nhanh
  const summary = useMemo(() => {
    let revenue = 0
    let totalOrders = filteredOrders.length
    const uniqueCustomers = new Set<string>()

    filteredOrders.forEach(o => {
      // Doanh thu chỉ tính các đơn chưa hủy
      if (o.status !== 'cancelled') {
        revenue += o.total_amount
      }
      
      // Bóc tách KH từ profile hoặc ghi chú
      let phone = o.profiles?.phone || ''
      if (!phone && o.note) {
        const phoneMatch = o.note.match(/(0[3|5|7|8|9])+([0-9]{8})\b/g)
        if (phoneMatch) phone = phoneMatch[0]
      }
      if (phone) uniqueCustomers.add(phone)
    })

    return {
      revenue,
      totalOrders,
      totalCustomers: uniqueCustomers.size
    }
  }, [filteredOrders])

  // Cập nhật trạng thái
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    } catch (error) {
      console.error('Lỗi cập nhật trạng thái:', error)
      alert('Không thể cập nhật trạng thái đơn hàng.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đơn hàng này? Hành động này không thể hoàn tác.')) return
    
    setUpdatingId(orderId)
    try {
      // 1. Xóa chi tiết đơn hàng trước
      // Sử dụng .select() để kiểm tra xem có thực sự xóa được không
      const { data: itemsDeleted, error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId)
        .select()

      if (itemsError) throw itemsError

      // 2. Xóa đơn hàng chính
      const { data: orderDeleted, error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .select()

      if (error) throw error
      
      // Kiểm tra xem có bản ghi nào thực sự bị xóa không (RLS check)
      if (!orderDeleted || orderDeleted.length === 0) {
        alert('Lỗi: Không thể xóa đơn hàng này khỏi Database. \n\nNguyên nhân có thể do chính sách bảo mật (RLS) trên Supabase của bạn chưa cho phép xóa đơn hàng của khách khác. Bạn hãy vào Supabase Dashboard để kiểm tra phần Policies của bảng orders nhé!')
        return
      }
      
      setOrders(orders.filter(o => o.id !== orderId))
      showToast('Đã xóa đơn hàng vĩnh viễn!')
    } catch (error: any) {
      console.error('Lỗi khi xóa đơn hàng:', error)
      alert('Lỗi hệ thống: ' + (error.message || 'Lỗi không xác định'))
    } finally {
      setUpdatingId(null)
    }
  }

  // Tính năng Export CSV (Dùng Native JS Blob API)
  const handleExport = () => {
    if (filteredOrders.length === 0) return
    setExporting(true)

    try {
      const escapeCSV = (str: string) => `"${String(str).replace(/"/g, '""')}"`
      const downloadCSV = (content: string, filename: string) => {
        const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', filename)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }

      // ----------------------------------------------------
      // BÁO CÁO 1: NHẬP HÀNG (Gom theo Tên sản phẩm, cộng dồn kg)
      // ----------------------------------------------------
      const productMap = new Map<string, number>()
      filteredOrders.forEach(order => {
        if (order.status === 'cancelled') return // Bỏ qua đơn hủy
        
        order.order_items.forEach(item => {
          const pName = item.products?.name || 'Sản phẩm không rõ'
          productMap.set(pName, (productMap.get(pName) || 0) + item.quantity)
        })
      })

      const report1Rows = Array.from(productMap.entries()).map(([name, qty]) => [escapeCSV(name), qty].join(','))
      const report1Csv = ['Tên sản phẩm,Tổng số lượng đặt (kg)', ...report1Rows].join('\n')
      downloadCSV(report1Csv, `Bao_Cao_Nhap_Hang_${new Date().toISOString().slice(0, 10)}.csv`)

      // ----------------------------------------------------
      // BÁO CÁO 2: GIAO HÀNG & THU TIỀN (Gom đơn theo Khách)
      // Bắt buộc gọi price_at_time
      // ----------------------------------------------------
      type CustomerAgg = {
        name: string
        phone: string
        items: Map<string, { qty: number, price: number }>
        total: number
        statuses: Set<string>
      }
      
      const customerMap = new Map<string, CustomerAgg>()

      filteredOrders.forEach(order => {
        if (order.status === 'cancelled') return 
        
        const name = order.profiles?.full_name || 'Khách (Xem ghi chú)'
        let phone = order.profiles?.phone || ''
        if (!phone && order.note) {
          const phoneMatch = order.note.match(/(0[3|5|7|8|9])+([0-9]{8})\b/g)
          if (phoneMatch) phone = phoneMatch[0]
        }
        
        const key = `${phone}-${name}`
        if (!customerMap.has(key)) {
          customerMap.set(key, { name, phone, items: new Map(), total: 0, statuses: new Set() })
        }

        const agg = customerMap.get(key)!
        agg.total += order.total_amount
        
        const statusObj = STATUSES.find(s => s.value === order.status)
        agg.statuses.add(statusObj ? statusObj.label : order.status)

        // Cộng gộp món hàng (Nhớ dùng price_at_time)
        order.order_items.forEach(item => {
          const pName = item.products?.name || 'SP'
          const pKey = `${pName}-${item.price_at_time}` // Gộp dựa trên tên và giá mua tại thời điểm đó
          
          if (!agg.items.has(pKey)) {
            agg.items.set(pKey, { qty: 0, price: item.price_at_time })
          }
          agg.items.get(pKey)!.qty += item.quantity
        })
      })

      const report2Rows = Array.from(customerMap.values()).map(agg => {
        const itemsStr = Array.from(agg.items.entries()).map(([k, v]) => {
          const pName = k.split('-')[0]
          return `${pName} (x${v.qty} - ${v.price}đ)`
        }).join('; ')

        const statusesStr = Array.from(agg.statuses).join(', ')

        return [
          escapeCSV(agg.name),
          escapeCSV(agg.phone),
          escapeCSV(itemsStr),
          agg.total,
          escapeCSV(statusesStr)
        ].join(',')
      })

      const report2Csv = ['Tên đồng nghiệp,SĐT,Chi tiết các món đã gộp,Tổng tiền gom các đơn,Trạng thái', ...report2Rows].join('\n')
      
      // Delay nhẹ nửa giây để trình duyệt không block download file thứ 2
      setTimeout(() => {
        downloadCSV(report2Csv, `Bao_Cao_Giao_Hang_${new Date().toISOString().slice(0, 10)}.csv`)
        setExporting(false)
      }, 500)

    } catch (error) {
      console.error(error)
      alert('Đã xảy ra lỗi khi xuất file báo cáo.')
      setExporting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const found = STATUSES.find(s => s.value === status)
    return found ? found.badge : 'bg-gray-100 text-gray-700'
  }

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
            <p className="text-gray-500 mt-2 font-medium">Theo dõi doanh thu, xử lý đơn và xuất báo cáo nội bộ</p>
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
              {exporting ? 'Đang xuất...' : 'Xuất Báo Cáo'}
            </button>
          </div>
        </div>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <DollarSign className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Doanh thu hợp lệ</p>
              <h2 className="text-2xl font-bold text-gray-900">{summary.revenue.toLocaleString('vi-VN')}đ</h2>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-7 h-7 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Tổng đơn lọc được</p>
              <h2 className="text-2xl font-bold text-gray-900">{summary.totalOrders} đơn</h2>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
              <Users className="w-7 h-7 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Số lượng khách</p>
              <h2 className="text-2xl font-bold text-gray-900">{summary.totalCustomers} người</h2>
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
                <h2 className="text-lg font-bold text-gray-900">Bảng Phát Tin Nhanh</h2>
                <p className="text-xs text-gray-500 font-medium">Gửi thông báo real-time tới tất cả khách hàng</p>
              </div>
            </div>
            <button
              onClick={() => setShowGlobalPanel(!showGlobalPanel)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
            >
              {showGlobalPanel ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {showGlobalPanel && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Loại thông báo</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'general', label: '📢 Thông báo chung', bg: 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100/50' },
                    { id: 'new_product', label: '🐟 Có cá mới nà', bg: 'bg-green-50 border-green-100 text-green-700 hover:bg-green-100/50' },
                    { id: 'price_change', label: '🏷️ Có đổi giá nè', bg: 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100/50' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setGlobalType(t.id as any)}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                        globalType === t.id
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10'
                          : t.bg
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Nội dung tin nhắn</label>
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
                  onClick={() => handleSendNotification(globalMessage, globalType)}
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
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            onClick={fetchOrders}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors border border-gray-200 shrink-0 w-full md:w-auto"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>

        {/* Bảng Dữ Liệu Chuyên Nghiệp */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative min-h-[400px]">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-gray-600 border-collapse">
              <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap uppercase tracking-wider text-xs">Mã Đơn</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-xs">Khách Hàng & Liên Hệ</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-xs">Chi Tiết Món Hàng</th>
                  <th className="px-6 py-4 whitespace-nowrap text-right uppercase tracking-wider text-xs">Tổng Tiền</th>
                  <th className="px-6 py-4 whitespace-nowrap uppercase tracking-wider text-xs">Ngày Đặt</th>
                  <th className="px-6 py-4 whitespace-nowrap text-center uppercase tracking-wider text-xs">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-28 text-center">
                      <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">Đang tải và đồng bộ dữ liệu...</p>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-28 text-center">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium text-lg">Không tìm thấy đơn hàng nào phù hợp với bộ lọc</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-5 whitespace-nowrap font-mono text-gray-500 font-medium text-xs">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-bold text-gray-900">{order.profiles?.full_name || 'Khách (Xem ghi chú)'}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-[200px]" title={order.note}>
                          {order.note || 'Không có ghi chú'}
                        </p>
                      </td>
                      <td className="px-6 py-5 min-w-[280px]">
                        <ul className="space-y-1.5">
                          {order.order_items?.map(item => (
                            <li key={item.id} className="text-sm border-b border-gray-100 last:border-0 pb-1 last:pb-0">
                              <span className="font-semibold text-gray-800">{item.products?.name || 'SP'}</span>{' '}
                              <span className="text-gray-500">
                                (x{item.quantity} - {item.price_at_time.toLocaleString('vi-VN')}đ/{item.products?.unit || 'kg'})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <p className="font-bold text-gray-900 text-base">{order.total_amount.toLocaleString('vi-VN')}đ</p>
                        <p className="text-xs font-medium text-gray-500 mt-1 uppercase">
                          {order.payment_method === 'cod' ? 'COD (Tiền mặt)' : 'Bank (CK)'}
                        </p>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 font-medium">
                        {new Date(order.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center align-middle">
                        <div className="relative flex flex-col items-center gap-2 w-full max-w-[140px] mx-auto">
                          <div className="relative w-full">
                            <select
                              disabled={updatingId === order.id}
                              value={order.status}
                              onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                              className={`appearance-none cursor-pointer border border-transparent w-full text-center px-4 py-2 rounded-full text-xs font-bold transition-all focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 outline-none shadow-sm ${getStatusBadge(order.status)} ${updatingId === order.id ? 'opacity-50' : 'hover:opacity-80'}`}
                            >
                              {STATUSES.map(s => (
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
                          
                          {(order.status === 'delivering' || order.status === 'done') && (
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

        </div>
      </div>
    </div>
  )
}
