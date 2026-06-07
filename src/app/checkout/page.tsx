'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/store/cart'
import { supabase } from '@/lib/supabase'
import {
  Building2,
  Truck,
  Wallet,
  CreditCard,
  ChevronRight,
  ShoppingCart,
  Loader2,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  Ticket,
  Check
} from 'lucide-react'

// ─── B9 — Ví voucher tại /checkout ──────────────────────────────────────────────────
// Chỉ khách ĐĂNG NHẬP mới thấy khối voucher (guest đặt đơn như cũ). Đọc ví qua RLS
// owner-read (customer_vouchers của chính mình) + join voucher_definitions (đọc công khai).
// Khi submit CÓ voucher → đi qua RPC SECURITY DEFINER `place_order` để XÁC THỰC PHÍA TIN CẬY
// (đọc lại giá DB, tính giảm có trần 30% CĐ-5, đánh dấu voucher used ATOMIC). Xem 04 mục 7.
// Giảm giá HẠNG là B10 — KHÔNG làm ở đây, chỉ chừa chỗ (tier discount = 0).
const DISCOUNT_CAP_RATIO = 0.3 // CĐ-5: trần TỔNG giảm (hạng + voucher) = 30% tạm tính

type VoucherType = 'percent' | 'fixed' | 'free_ship'

type CheckoutVoucherDef = {
  name: string
  type: VoucherType
  value: number
  min_order: number
  max_discount: number | null
  tier_scope: string[] | null
}

type CheckoutVoucher = {
  id: string
  status: string
  expires_at: string | null
  voucher_definitions: CheckoutVoucherDef | null
}

// Quan hệ to-one đôi khi supabase trả về mảng 1 phần tử — chuẩn hóa về object.
function pickOne<T>(rel: unknown): T | null {
  if (Array.isArray(rel)) return (rel[0] as T) ?? null
  if (rel && typeof rel === 'object') return rel as T
  return null
}

function normalizeCheckoutVouchers(raw: unknown): CheckoutVoucher[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row): CheckoutVoucher => {
    const r = row as Record<string, unknown>
    const def = pickOne<Record<string, unknown>>(r.voucher_definitions)
    return {
      id: String(r.id),
      status: String(r.status ?? 'active'),
      expires_at: (r.expires_at as string | null) ?? null,
      voucher_definitions: def
        ? {
            name: String(def.name ?? 'Ưu đãi'),
            type: (def.type as VoucherType) ?? 'fixed',
            value: Number(def.value ?? 0),
            min_order: Number(def.min_order ?? 0),
            max_discount: def.max_discount != null ? Number(def.max_discount) : null,
            tier_scope: Array.isArray(def.tier_scope) ? (def.tier_scope as string[]) : null,
          }
        : null,
    }
  })
}

// Số tiền giảm THÔ của 1 voucher trên tạm tính (CHƯA áp trần). free_ship = 0 (ưu đãi vận chuyển).
// Mirror logic RPC place_order phía server — chỉ để HIỂN THỊ; server vẫn là nguồn sự thật.
function rawVoucherDiscount(def: CheckoutVoucherDef | null, subtotal: number): number {
  if (!def) return 0
  if (def.type === 'percent') {
    const raw = Math.floor((subtotal * def.value) / 100)
    return def.max_discount != null ? Math.min(raw, def.max_discount) : raw
  }
  if (def.type === 'fixed') return Math.min(def.value, subtotal)
  return 0 // free_ship: không trừ tiền hàng ở B9
}

// Mô tả ngắn giá trị voucher cho khách đọc nhanh.
function describeVoucher(def: CheckoutVoucherDef | null): string {
  if (!def) return 'Ưu đãi'
  if (def.type === 'percent') {
    const cap = def.max_discount ? ` (tối đa ${def.max_discount.toLocaleString('vi-VN')}đ)` : ''
    return `Giảm ${def.value}%${cap}`
  }
  if (def.type === 'fixed') return `Giảm ${def.value.toLocaleString('vi-VN')}đ`
  return 'Miễn phí vận chuyển'
}

function CheckoutForm() {
  const { items, total, clear, updateQty, remove, syncPrices } = useCart()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Đã giữ nguyên logic cũ
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState(searchParams.get('note') || '')
  const [session, setSession] = useState<any>(null)

  // B9 — ví voucher của khách đăng nhập (đọc qua RLS owner-read).
  const [tierCode, setTierCode] = useState<string | null>(null)
  const [vouchers, setVouchers] = useState<CheckoutVoucher[]>([])
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null)

  // B10 — ưu đãi giảm giá theo HẠNG của khách (đọc membership_tiers công khai).
  const [tierName, setTierName] = useState<string | null>(null)
  const [tierDiscountPercent, setTierDiscountPercent] = useState<number>(0)
  
  const totalKg = items.reduce((acc, item) => {
    const u = (item.unit || '').toLowerCase()
    if (u.includes('kg') || u.includes('ký') || u.includes('ky') || u.includes('kg/')) {
      return acc + item.quantity
    }
    return acc
  }, 0)

  const getQtyStep = (unit: string) => {
    const u = (unit || '').toLowerCase()
    return (u.includes('kg') || u.includes('ký') || u.includes('ky') || u.includes('kg/')) ? 0.5 : 1
  }

  const getQtyMin = (unit: string) => getQtyStep(unit)

  const handleDecreaseQty = (id: string, currentQty: number, unit: string) => {
    const step = getQtyStep(unit)
    const min = step
    const newVal = Math.max(min, Math.round((currentQty - step) * 10) / 10)
    updateQty(id, newVal)
  }

  const handleIncreaseQty = (id: string, currentQty: number, unit: string) => {
    const step = getQtyStep(unit)
    const newVal = Math.round((currentQty + step) * 10) / 10
    updateQty(id, newVal)
  }
  
  const [deliveryMethod, setDeliveryMethod] = useState<'company' | 'viettel'>('company')
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'transfer'>('cod')
  
  const [receiverPhone, setReceiverPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasHydrated, setHasHydrated] = useState(false)
  const [copyToast, setCopyToast] = useState('')

  const handleCopyBank = () => {
    try {
      navigator.clipboard.writeText('4801205175150')
      setCopyToast('Đã copy số tài khoản Agribank: 4801205175150!')
      setTimeout(() => setCopyToast(''), 3000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  useEffect(() => {
    setHasHydrated(true)
    
    // Prefill from localStorage for frictionless guest checkout
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('checkout_guest_name')
      const savedPhone = localStorage.getItem('checkout_guest_phone')
      const savedAddress = localStorage.getItem('checkout_guest_address')
      if (savedName) setName(savedName)
      if (savedPhone) {
        setPhone(savedPhone)
        setReceiverPhone(savedPhone)
      }
      if (savedAddress) setAddress(savedAddress)
    }

    // Lấy session để gắn user_id vào đơn hàng → lịch sử mua hàng hoạt động
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      // Prefill tên/SĐT từ profile nếu đã đăng nhập (sẽ ghi đè thông tin guest vì thông tin đăng nhập được ưu tiên)
      if (session?.user?.id) {
        supabase.from('profiles').select('full_name, phone').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data?.full_name) setName(data.full_name)
            if (data?.phone) {
              setPhone(data.phone)
              setReceiverPhone(data.phone)
            }
          })
      }
    })

    // Đăng ký listener lắng nghe sự thay đổi của auth state để cập nhật tức thì
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      if (currentSession?.user?.id) {
        supabase.from('profiles').select('full_name, phone').eq('id', currentSession.user.id).single()
          .then(({ data }) => {
            if (data?.full_name) setName(data.full_name)
            if (data?.phone) {
              setPhone(data.phone)
              setReceiverPhone(data.phone)
            }
          })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Đồng bộ giá giỏ hàng theo giá hiện tại trong DB khi vào trang thanh toán.
  // Tránh trường hợp giá cũ bị kẹt trong localStorage khiến đơn mới vẫn ra giá cũ.
  const pricesSyncedRef = useRef(false)
  useEffect(() => {
    if (pricesSyncedRef.current || items.length === 0) return
    pricesSyncedRef.current = true

    const ids = items.map(i => i.id)
    supabase
      .from('products')
      .select('id, price')
      .in('id', ids)
      .then(({ data, error }) => {
        if (error || !data) return
        const priceMap: Record<string, number> = {}
        data.forEach((p: { id: string; price: number }) => {
          priceMap[p.id] = p.price
        })
        syncPrices(priceMap)
      })
  }, [items, syncPrices])

  // B9 — Tải hạng + ví voucher khả dụng khi khách đã đăng nhập. Guest bỏ qua hoàn toàn.
  // CHỈ ĐỌC qua RLS: profiles của mình (tier_code) + customer_vouchers active của mình
  // (join voucher_definitions công khai). KHÔNG ghi ở đây — việc áp/used làm ở RPC khi submit.
  const uid = session?.user?.id
  useEffect(() => {
    if (!uid) {
      setTierCode(null)
      setTierName(null)
      setTierDiscountPercent(0)
      setVouchers([])
      setSelectedVoucherId(null)
      return
    }
    let alive = true
    Promise.all([
      supabase.from('profiles').select('tier_code').eq('id', uid).single(),
      supabase
        .from('customer_vouchers')
        .select('id, status, expires_at, voucher_definitions(name, type, value, min_order, max_discount, tier_scope)')
        .eq('user_id', uid)
        .eq('status', 'active')
        .order('issued_at', { ascending: false }),
      supabase.from('membership_tiers').select('code, name, discount_percent'),
    ]).then(([profileRes, vouchersRes, tiersRes]) => {
      if (!alive) return
      const code = !profileRes.error ? ((profileRes.data?.tier_code as string | null) ?? null) : null
      setTierCode(code)
      // B10 — ưu đãi giảm giá theo hạng hiện tại (chỉ để hiển thị; server tính lại).
      if (!tiersRes.error && code) {
        const t = (tiersRes.data as Array<Record<string, unknown>> | null)?.find((r) => r.code === code)
        setTierName((t?.name as string | null) ?? null)
        setTierDiscountPercent(t ? Number(t.discount_percent ?? 0) : 0)
      } else {
        setTierName(null)
        setTierDiscountPercent(0)
      }
      if (vouchersRes.error) {
        console.error('Error loading vouchers:', vouchersRes.error)
        setVouchers([])
      } else {
        setVouchers(normalizeCheckoutVouchers(vouchersRes.data))
      }
    })
    return () => {
      alive = false
    }
  }, [uid])

  // Safeguard: Force delivery method to 'company' if totalKg is less than 5
  useEffect(() => {
    if (totalKg < 5 && deliveryMethod !== 'company') {
      setDeliveryMethod('company')
    }
  }, [totalKg, deliveryMethod])

  useEffect(() => {
    if (hasHydrated && items.length === 0) {
      router.push('/products')
    }
  }, [items.length, router, hasHydrated])

  if (!hasHydrated) return null
  if (items.length === 0) return null

  // Đã giữ nguyên logic cũ - handleSubmit Supabase insert
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Save guest info for seamless autofill next time
      if (typeof window !== 'undefined') {
        localStorage.setItem('checkout_guest_name', name)
        localStorage.setItem('checkout_guest_phone', phone)
        localStorage.setItem('checkout_guest_address', address)
      }
      if (paymentMethod === 'transfer') {
        try {
          navigator.clipboard.writeText('4801205175150')
        } catch (clipErr) {
          console.warn('Clipboard write failed', clipErr)
        }
      }
      let deliveryDetail = ''
      if (deliveryMethod === 'company') {
        deliveryDetail = 'Tại công ty'
      } else {
        deliveryDetail = `Viettel Post (nội thành TPHCM) - ĐC: ${address} - SĐT nhận: ${receiverPhone}`
      }

      const finalNote = `Tên: ${name}\nSĐT: ${phone}\nNhận hàng: ${deliveryDetail}\nGhi chú khách: ${note}`

      // B9/B10 — ĐƯỜNG CÓ ƯU ĐÃI (khách đăng nhập + có giảm HẠNG hoặc CÓ voucher):
      // đi qua RPC SECURITY DEFINER `place_order`. Server đọc lại GIÁ THẬT + % giảm hạng trong DB,
      // xác thực voucher (sở hữu/active/hạn/min_order/tier_scope), áp hạng trước rồi voucher với
      // trần 30% (CĐ-5), tạo order + order_items, và đánh dấu voucher used ATOMIC
      // (update ... where status='active', rowCount=1) → chống double-spend. Xem 04 mục 7.
      if (session?.user?.id && (selectedVoucher || tierDiscount > 0)) {
        const { data: newOrderId, error: rpcError } = await supabase.rpc('place_order', {
          p_items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
          p_payment_method: paymentMethod,
          p_note: finalNote,
          p_voucher_id: selectedVoucher?.id ?? null,
        })
        if (rpcError || !newOrderId) {
          throw new Error(rpcError?.message || 'Không thể đặt hàng với ưu đãi, vui lòng thử lại.')
        }
        clear()
        router.push(`/order-success?id=${newOrderId}`)
        return
      }

      // 1. Insert order — GẮN user_id để lịch sử mua hàng hiển thị đúng (đường KHÔNG ưu đãi / guest)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: session?.user?.id || null, // FIX: gắn user_id thay vì null cứng
          status: 'pending',
          payment_method: paymentMethod,
          total_amount: total(),
          note: finalNote
        })
        .select('id')
        .single()

      if (orderError || !order) {
        throw new Error(orderError?.message || 'Không thể tạo đơn hàng, vui lòng thử lại.')
      }

      // 2. Insert order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price_at_time: item.price
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // 3. Clear cart & chuyển hướng
      clear()
      router.push(`/order-success?id=${order.id}`)

    } catch (err: any) {
      console.error(err)
      if (err.message?.toLowerCase().includes('row-level security') || err.message?.toLowerCase().includes('violates row-level security')) {
        setError('💡 Chào Quyết! Lỗi chính sách bảo mật (RLS) trên Supabase của bạn đang chặn quyền đặt hàng.\n\nVui lòng mở Supabase Dashboard -> SQL Editor và chạy đoạn lệnh sau để mở quyền đặt hàng cho cả khách vãng lai và thành viên:\n\n' +
          'CREATE POLICY "Allow public insert orders" ON public.orders FOR INSERT WITH CHECK (true);\n' +
          'CREATE POLICY "Allow public select orders" ON public.orders FOR SELECT USING (true);\n' +
          'CREATE POLICY "Allow public insert order_items" ON public.order_items FOR INSERT WITH CHECK (true);\n' +
          'CREATE POLICY "Allow public select order_items" ON public.order_items FOR SELECT USING (true);'
        )
      } else {
        setError(err.message || 'Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ─── B9 — Tính voucher khả dụng + số tiền giảm (chỉ để HIỂN THỊ; server tính lại) ───
  const subtotal = total()
  // Khả dụng = active + chưa hết hạn + loại percent/fixed + đủ min_order + đúng tier_scope.
  const eligibleVouchers = vouchers.filter((v) => {
    const def = v.voucher_definitions
    if (!def) return false
    if (def.type !== 'percent' && def.type !== 'fixed') return false // free_ship: ưu đãi ship, không chọn ở B9
    if (v.expires_at && new Date(v.expires_at).getTime() < Date.now()) return false
    if (subtotal < (def.min_order ?? 0)) return false
    if (def.tier_scope && (!tierCode || !def.tier_scope.includes(tierCode))) return false
    return true
  })
  const selectedVoucher = eligibleVouchers.find((v) => v.id === selectedVoucherId) ?? null
  // CĐ-5: áp giảm HẠNG trước rồi voucher; trần TỔNG giảm = 30% tạm tính.
  const cap = Math.floor(subtotal * DISCOUNT_CAP_RATIO)
  const rawTierDiscount = Math.floor((subtotal * tierDiscountPercent) / 100)
  const tierDiscount = Math.max(0, Math.min(rawTierDiscount, cap))
  const voucherDiscount = Math.max(
    0,
    Math.min(rawVoucherDiscount(selectedVoucher?.voucher_definitions ?? null, subtotal), cap - tierDiscount)
  )
  const finalAmount = Math.max(0, subtotal - tierDiscount - voucherDiscount)

  return (
    <div className="w-full flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="flex flex-col items-center justify-center gap-3 mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm">
            <ShoppingCart className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Thông tin đặt hàng</h1>
          <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Vui lòng điền thông tin bên dưới để chúng tôi có thể giao hải sản tươi ngon nhất đến bạn.
          </p>
        </div>

        {/* Auth Tip Banner */}
        {session ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 mb-6 flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="text-lg">💡</span>
            <p className="font-medium text-blue-800">
              Bạn đã đăng nhập. Bạn có thể xem các đơn hàng đã đặt ở trong mục{' '}
              <Link href="/profile?tab=orders" className="text-blue-600 underline font-bold hover:text-blue-500 transition-colors">
                đơn hàng
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 mb-6 flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="text-lg">💡</span>
            <p>
              Bạn không cần đăng nhập để đặt hàng. Tuy nhiên, hãy{' '}
              <Link href="/auth" className="text-blue-600 underline font-semibold hover:text-blue-500 transition-colors">
                đăng nhập
              </Link>{' '}
              để dễ quản lý đơn hàng của bạn hơn.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Order Summary */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-blue-500 rounded-full" />
              Đơn hàng của bạn
            </h2>
            <div className="space-y-4 mb-5 divide-y divide-slate-100">
              {items.map((item, idx) => (
                <div key={item.id} className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 ${idx > 0 ? 'pt-4' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-slate-850 text-sm sm:text-base truncate">{item.name}</p>
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer shrink-0 animate-pulse hover:animate-none"
                        title="Xóa khỏi đơn hàng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-semibold">
                      Đơn giá: {item.price.toLocaleString('vi-VN')}đ/{item.unit}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    {/* Quantity Adjustment Controls */}
                    <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-0.5 shadow-inner">
                      <button
                        type="button"
                        onClick={() => handleDecreaseQty(item.id, item.quantity, item.unit)}
                        className="w-7 h-7 rounded-md hover:bg-slate-200 active:scale-90 text-slate-650 transition-all font-black flex items-center justify-center select-none cursor-pointer"
                        disabled={item.quantity <= getQtyMin(item.unit)}
                        style={{ opacity: item.quantity <= getQtyMin(item.unit) ? 0.35 : 1 }}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      
                      <span className="w-11 text-center text-slate-800 font-extrabold text-xs select-none">
                        {item.quantity} <span className="text-[9px] text-slate-500 font-normal">{item.unit}</span>
                      </span>
                      
                      <button
                        type="button"
                        onClick={() => handleIncreaseQty(item.id, item.quantity, item.unit)}
                        className="w-7 h-7 rounded-md hover:bg-slate-200 active:scale-90 text-slate-650 transition-all font-black flex items-center justify-center select-none cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <span className="font-extrabold text-slate-800 text-sm sm:text-base whitespace-nowrap min-w-[85px] text-right">
                      {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-4 space-y-2">
              {tierDiscount > 0 || voucherDiscount > 0 ? (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Tạm tính ({totalKg}kg)</span>
                    <span className="font-semibold text-slate-700">{subtotal.toLocaleString('vi-VN')}đ</span>
                  </div>
                  {tierDiscount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-emerald-600 font-medium inline-flex items-center gap-1">
                        <Wallet className="w-3.5 h-3.5" />
                        Ưu đãi hạng{tierName ? ` ${tierName}` : ''} −{tierDiscountPercent}%
                      </span>
                      <span className="font-semibold text-emerald-600">-{tierDiscount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}
                  {voucherDiscount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-orange-600 font-medium inline-flex items-center gap-1">
                        <Ticket className="w-3.5 h-3.5" />
                        Giảm voucher
                      </span>
                      <span className="font-semibold text-orange-600">-{voucherDiscount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-100">
                    <span className="text-slate-500 text-sm">Thành tiền</span>
                    <span className="text-2xl font-black text-blue-600">{finalAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <p className="text-slate-500 text-sm">Tổng cộng ({totalKg}kg)</p>
                  <p className="text-2xl font-black text-blue-600">{subtotal.toLocaleString('vi-VN')}đ</p>
                </div>
              )}
            </div>
          </section>

          {/* B9 — Chọn voucher (chỉ khách đăng nhập). Guest không thấy khối này. */}
          {session && (
            <section className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-base font-bold text-slate-800 mb-1.5 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-orange-500 rounded-full" />
                Voucher của bạn
              </h2>
              <p className="text-xs text-slate-400 mb-4 ml-3.5">
                Áp ưu đãi từ ví voucher. Tổng giảm tối đa {Math.round(DISCOUNT_CAP_RATIO * 100)}% giá trị đơn.
              </p>

              {eligibleVouchers.length === 0 ? (
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5">
                  <Ticket className="w-5 h-5 text-slate-300 shrink-0" />
                  <p className="text-sm text-slate-500 font-medium">
                    Chưa có voucher khả dụng cho đơn này. Voucher sẽ hiện khi đơn đủ điều kiện áp dụng.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Không dùng voucher */}
                  <label
                    className={`flex items-center gap-3 border rounded-xl p-3.5 cursor-pointer transition-all ${
                      selectedVoucherId === null ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="voucher"
                      className="hidden"
                      checked={selectedVoucherId === null}
                      onChange={() => setSelectedVoucherId(null)}
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedVoucherId === null ? 'border-blue-500' : 'border-slate-300'
                      }`}
                    >
                      {selectedVoucherId === null && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                    </div>
                    <span className="text-sm font-semibold text-slate-600">Không dùng voucher</span>
                  </label>

                  {eligibleVouchers.map((v) => {
                    const def = v.voucher_definitions
                    const selected = selectedVoucherId === v.id
                    const disc = Math.max(0, Math.min(rawVoucherDiscount(def, subtotal), cap - tierDiscount))
                    return (
                      <label
                        key={v.id}
                        className={`flex items-center gap-3 border rounded-xl p-3.5 cursor-pointer transition-all ${
                          selected ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-orange-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="voucher"
                          className="hidden"
                          checked={selected}
                          onChange={() => setSelectedVoucherId(v.id)}
                        />
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            selected ? 'border-orange-500' : 'border-slate-300'
                          }`}
                        >
                          {selected && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                        </div>
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            selected ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-500'
                          }`}
                        >
                          <Ticket className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-slate-800 truncate">{def?.name ?? 'Ưu đãi'}</p>
                          <p className="text-xs font-semibold text-orange-600 mt-0.5">{describeVoucher(def)}</p>
                        </div>
                        <span className="text-sm font-black text-orange-600 whitespace-nowrap shrink-0 inline-flex items-center gap-1">
                          {selected && <Check className="w-3.5 h-3.5" />}
                          -{disc.toLocaleString('vi-VN')}đ
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {/* Customer Info */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-blue-500 rounded-full" />
              Thông tin liên hệ
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Họ tên <span className="text-red-500">*</span></label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-sm"
                  placeholder="Vd: Lê Minh Quyết"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Số điện thoại <span className="text-red-500">*</span></label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-sm"
                  placeholder="09xx xxx xxx"
                />
              </div>
            </div>
          </section>

          {/* Delivery Method */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-blue-500 rounded-full" />
              Hình thức nhận hàng
            </h2>
            <div className="space-y-3">
              <label className={`block border rounded-xl p-4 cursor-pointer transition-all duration-200 ${deliveryMethod === 'company' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                <input type="radio" name="delivery" className="hidden" checked={deliveryMethod === 'company'} onChange={() => setDeliveryMethod('company')} />
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${deliveryMethod === 'company' ? 'border-blue-500' : 'border-slate-300'}`}>
                    {deliveryMethod === 'company' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </div>
                  <Building2 className={`w-5 h-5 ${deliveryMethod === 'company' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className={`font-semibold text-sm ${deliveryMethod === 'company' ? 'text-blue-700' : 'text-slate-700'}`}>Nhận tại công ty</span>
                </div>
                <p className="text-sm text-slate-500 mt-2 ml-8">Phí ship ~5.000–10.000đ chia đều theo đơn chung, thu khi nhận hàng.</p>
              </label>

              {/* Viettel Post - Nội thành TPHCM Delivery */}
              <label 
                className={`block border rounded-xl p-4 transition-all duration-200 ${
                  totalKg < 5 
                    ? 'border-slate-200 bg-slate-50/50 opacity-60 cursor-not-allowed'
                    : deliveryMethod === 'viettel' 
                      ? 'border-blue-500 bg-blue-50 cursor-pointer' 
                      : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                }`}
              >
                <input 
                  type="radio" 
                  name="delivery" 
                  className="hidden" 
                  disabled={totalKg < 5}
                  checked={deliveryMethod === 'viettel'} 
                  onChange={() => setDeliveryMethod('viettel')} 
                />
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    totalKg < 5
                      ? 'border-slate-200 bg-slate-100'
                      : deliveryMethod === 'viettel' 
                        ? 'border-blue-500' 
                        : 'border-slate-300'
                  }`}>
                    {deliveryMethod === 'viettel' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <Truck className={`w-5 h-5 ${
                        totalKg < 5
                          ? 'text-slate-300'
                          : deliveryMethod === 'viettel' 
                            ? 'text-blue-600' 
                            : 'text-slate-400'
                      }`} />
                      <span className={`font-semibold text-sm ${
                        totalKg < 5
                          ? 'text-slate-400 font-bold'
                          : deliveryMethod === 'viettel' 
                            ? 'text-blue-700' 
                            : 'text-slate-700'
                      }`}>Giao tận nơi (Viettel Post - nội thành TPHCM)</span>
                    </div>
                    {totalKg < 5 ? (
                      <span className="text-[11px] text-red-500 font-extrabold mt-1 uppercase tracking-wider flex items-center gap-1">
                        ⚠️ Giao tận nơi: Cần mua thêm ${(5 - totalKg).toFixed(1)}kg hải sản nữa để đạt mức tối thiểu (5kg).
                      </span>
                    ) : (
                      <p className="text-xs text-slate-500 mt-1 ml-7">
                        Chỉ giao đơn hàng trên 5kg qua Viettel Post khu vực nội thành TPHCM. Phí vận chuyển tính theo khoảng cách của Viettel Post, liên hệ báo giá.
                      </p>
                    )}
                  </div>
                </div>
                {totalKg >= 5 && (
                  <div className={`overflow-hidden transition-all duration-300 ${deliveryMethod === 'viettel' ? 'max-h-64 mt-3' : 'max-h-0'}`}>
                    <div className="ml-7 space-y-3">
                      <input
                        required={deliveryMethod === 'viettel'}
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Địa chỉ giao hàng chi tiết (Số nhà, tên đường, phường, quận...)"
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm text-slate-800 placeholder-slate-400"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <input
                        required={deliveryMethod === 'viettel'}
                        type="tel"
                        value={receiverPhone}
                        onChange={(e) => setReceiverPhone(e.target.value)}
                        placeholder="Số điện thoại người nhận"
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm text-slate-800 placeholder-slate-400"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                )}
              </label>
            </div>
          </section>

          {/* Payment Method */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-blue-500 rounded-full" />
              Phương thức thanh toán
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`border rounded-xl p-4 cursor-pointer transition-all flex items-center gap-3 ${paymentMethod === 'cod' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                <input type="radio" name="payment" value="cod" className="hidden" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === 'cod' ? 'border-blue-500' : 'border-slate-300'}`}>
                  {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                </div>
                <Wallet className={`w-5 h-5 ${paymentMethod === 'cod' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`font-semibold text-sm ${paymentMethod === 'cod' ? 'text-blue-700' : 'text-slate-700'}`}>Tiền mặt (COD)</span>
              </label>

              <label className={`border rounded-xl p-4 cursor-pointer transition-all flex items-center gap-3 ${paymentMethod === 'transfer' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                <input type="radio" name="payment" value="transfer" className="hidden" checked={paymentMethod === 'transfer'} onChange={() => setPaymentMethod('transfer')} />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === 'transfer' ? 'border-blue-500' : 'border-slate-300'}`}>
                  {paymentMethod === 'transfer' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                </div>
                <CreditCard className={`w-5 h-5 ${paymentMethod === 'transfer' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`font-semibold text-sm ${paymentMethod === 'transfer' ? 'text-blue-700' : 'text-slate-700'}`}>Chuyển khoản</span>
              </label>
            </div>

            {/* Bank details */}
            <div className={`overflow-hidden transition-all duration-300 ${paymentMethod === 'transfer' ? 'max-h-64 mt-4' : 'max-h-0'}`}>
              <div 
                onClick={handleCopyBank}
                className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center cursor-pointer hover:bg-slate-100/70 transition-colors select-none group relative"
                title="Chạm để copy nhanh thông tin chuyển khoản"
              >
                <p className="text-sm text-slate-500 mb-3 group-hover:text-blue-600 font-semibold transition-colors">
                  👉 Chạm để copy thông tin chuyển khoản:
                </p>
                <div className="inline-block text-left bg-white rounded-lg p-4 mb-4 border border-slate-200 group-hover:border-blue-300 shadow-sm transition-all active:scale-98">
                  <p className="font-semibold text-base text-green-600">Agribank</p>
                  <p className="font-mono text-xl tracking-wider text-slate-900 my-1 font-bold">4801205175150</p>
                  <p className="text-slate-700 font-semibold">LÊ MINH QUYẾT</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 py-2.5 px-4 rounded-lg inline-flex items-center justify-center gap-2 block max-w-xs mx-auto">
                  <span className="text-sm text-slate-600">Nội dung CK:</span>
                  <span className="font-bold text-blue-600">
                    {name && phone ? `${name} - ${phone}` : (name || phone ? `${name || ''}${phone || ''}` : '(Tên + SĐT của bạn)')}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              Ghi chú thêm <span className="text-sm text-slate-400 font-normal ml-1">(Tùy chọn)</span>
            </h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Giao ngoài giờ hành chính, để trước cửa..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none transition-all text-sm"
            />
          </section>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <span>Xác nhận đặt hàng</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>

        </form>

        {/* Custom Toast Alert */}
        {copyToast && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-2xl z-[99] border border-blue-500/30 flex items-center gap-2.5 font-bold animate-in fade-in slide-in-from-bottom-5 duration-300 w-[90%] max-w-sm text-center justify-center">
            <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 animate-bounce">⚡</span>
            <span>{copyToast}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-slate-500 font-medium">Đang tải...</p>
      </div>
    }>
      <CheckoutForm />
    </Suspense>
  )
}
