'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
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
  AlertCircle
} from 'lucide-react'

function CheckoutForm() {
  const { items, total, clear } = useCart()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Đã giữ nguyên logic cũ
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState(searchParams.get('note') || '')
  const [session, setSession] = useState<any>(null)
  
  const totalKg = items.reduce((acc, item) => {
    const u = (item.unit || '').toLowerCase()
    if (u.includes('kg') || u.includes('ký') || u.includes('ky') || u.includes('kg/')) {
      return acc + item.quantity
    }
    return acc
  }, 0)
  
  const [deliveryMethod, setDeliveryMethod] = useState<'company' | 'viettel' | 'hcm_inner'>('company')
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
  }, [])

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
      } else if (deliveryMethod === 'hcm_inner') {
        deliveryDetail = `Giao nội thành TPHCM - ĐC: ${address} - SĐT nhận: ${receiverPhone}`
      } else {
        deliveryDetail = `Viettel Post - ĐC: ${address}`
      }

      const finalNote = `Tên: ${name}\nSĐT: ${phone}\nNhận hàng: ${deliveryDetail}\nGhi chú khách: ${note}`

      // 1. Insert order — GẮN user_id để lịch sử mua hàng hiển thị đúng
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
      setError(err.message || 'Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="flex flex-col items-center justify-center gap-3 mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm">
            <ShoppingCart className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Thanh toán</h1>
          <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Vui lòng điền thông tin bên dưới để chúng tôi có thể giao hải sản tươi ngon nhất đến bạn.
          </p>
        </div>

        {/* Auth Tip Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 mb-6 flex items-start gap-2">
          <span className="text-lg">💡</span>
          <p>
            Bạn không cần đăng nhập để đặt hàng. Tuy nhiên, hãy{' '}
            <Link href="/auth" className="text-blue-600 underline font-medium">
              đăng ký tài khoản
            </Link>{' '}
            để theo dõi lịch sử đơn hàng dễ dàng hơn.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Order Summary */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-blue-500 rounded-full" />
              Đơn hàng của bạn
            </h2>
            <div className="space-y-4 mb-5">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{item.name}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {item.quantity} {item.unit} × {item.price.toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                  <span className="font-bold text-slate-700 ml-4">
                    {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
              <p className="text-slate-500 text-sm">Tổng cộng ({totalKg}kg)</p>
              <p className="text-2xl font-black text-blue-600">
                {total().toLocaleString('vi-VN')}đ
              </p>
            </div>
          </section>

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

              {/* HCM Inner Delivery */}
              <label 
                className={`block border rounded-xl p-4 transition-all duration-200 ${
                  totalKg < 5 
                    ? 'border-slate-200 bg-slate-50/50 opacity-60 cursor-not-allowed'
                    : deliveryMethod === 'hcm_inner' 
                      ? 'border-blue-500 bg-blue-50 cursor-pointer' 
                      : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                }`}
              >
                <input 
                  type="radio" 
                  name="delivery" 
                  className="hidden" 
                  disabled={totalKg < 5}
                  checked={deliveryMethod === 'hcm_inner'} 
                  onChange={() => setDeliveryMethod('hcm_inner')} 
                />
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    totalKg < 5
                      ? 'border-slate-200 bg-slate-100'
                      : deliveryMethod === 'hcm_inner' 
                        ? 'border-blue-500' 
                        : 'border-slate-300'
                  }`}>
                    {deliveryMethod === 'hcm_inner' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <Building2 className={`w-5 h-5 ${
                        totalKg < 5
                          ? 'text-slate-300'
                          : deliveryMethod === 'hcm_inner' 
                            ? 'text-blue-600' 
                            : 'text-slate-400'
                      }`} />
                      <span className={`font-semibold text-sm ${
                        totalKg < 5
                          ? 'text-slate-400 font-bold'
                          : deliveryMethod === 'hcm_inner' 
                            ? 'text-blue-700' 
                            : 'text-slate-700'
                      }`}>Giao tận nơi (Nội thành TPHCM)</span>
                    </div>
                    {totalKg < 5 ? (
                      <span className="text-[11px] text-red-500 font-extrabold mt-1 uppercase tracking-wider flex items-center gap-1">
                        ⚠️ Giao tận nơi: Cần mua thêm ${(5 - totalKg).toFixed(1)}kg hải sản nữa để đạt mức tối thiểu (5kg).
                      </span>
                    ) : (
                      <span className="text-[10px] text-blue-600 font-bold mt-0.5 uppercase tracking-wider">Chỉ giao đơn trên 5kg</span>
                    )}
                  </div>
                </div>
                {totalKg >= 5 && (
                  <div className={`overflow-hidden transition-all duration-300 ${deliveryMethod === 'hcm_inner' ? 'max-h-64 mt-3' : 'max-h-0'}`}>
                    <div className="ml-8 space-y-3">
                      <input
                        required={deliveryMethod === 'hcm_inner'}
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Địa chỉ giao hàng (Số nhà, tên đường, quận...)"
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm text-slate-800 placeholder-slate-400"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <input
                        required={deliveryMethod === 'hcm_inner'}
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

              {/* Viettel Post Delivery */}
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
                      }`}>Giao tận nơi (Viettel Post)</span>
                    </div>
                    {totalKg < 5 ? (
                      <span className="text-[11px] text-red-500 font-extrabold mt-1 uppercase tracking-wider flex items-center gap-1">
                        ⚠️ Giao tận nơi: Cần mua thêm ${(5 - totalKg).toFixed(1)}kg hải sản nữa để đạt mức tối thiểu (5kg).
                      </span>
                    ) : (
                      <p className="text-sm text-slate-500 mt-2 ml-8">Phí ship Viettel Post tính theo khoảng cách, liên hệ báo giá.</p>
                    )}
                  </div>
                </div>
                {totalKg >= 5 && (
                  <div className={`overflow-hidden transition-all duration-300 ${deliveryMethod === 'viettel' ? 'max-h-32 mt-3' : 'max-h-0'}`}>
                    <div className="ml-8">
                      <input
                        required={deliveryMethod === 'viettel'}
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Nhập địa chỉ giao hàng chi tiết..."
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
                  <span className="font-bold text-blue-600">{phone || '(Vui lòng nhập SĐT)'}</span>
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
