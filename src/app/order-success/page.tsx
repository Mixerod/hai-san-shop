'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Package, Loader2, FileText, ChevronRight, Wallet, Copy, MapPin } from 'lucide-react'

// Define types based on query
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
  note: string
  created_at: string
  order_items: OrderItem[]
}

function OrderSuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('id')

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [copyToast, setCopyToast] = useState('')

  useEffect(() => {
    if (!orderId) {
      setError('Không tìm thấy mã đơn hàng.')
      setLoading(false)
      return
    }

    async function fetchOrder() {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*, products(name, unit))')
          .eq('id', orderId)
          .single()

        if (error) throw error
        if (data) {
          setOrder(data as any)
          
          // Tự động copy số tài khoản khi đơn hàng là chuyển khoản
          if (data.payment_method === 'transfer') {
            try {
              navigator.clipboard.writeText('4801205175150')
              setCopyToast('Đã tự động sao chép số tài khoản Agribank: 4801205175150!')
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
              setTimeout(() => setCopyToast(''), 4000)
            } catch (err) {
              console.warn('Auto copy failed on load', err)
            }
          }
          
          // Trigger Confetti Wow Effect
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
          script.onload = () => {
            const duration = 3000;
            const end = Date.now() + duration;

            (function frame() {
              (window as any).confetti({
                particleCount: 6,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#3b82f6', '#f97316', '#10b981', '#f59e0b']
              });
              (window as any).confetti({
                particleCount: 6,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#3b82f6', '#f97316', '#10b981', '#f59e0b']
              });

              if (Date.now() < end) {
                requestAnimationFrame(frame);
              }
            }());
          }
          document.body.appendChild(script)
        }
      } catch (err: any) {
        console.error(err)
        setError('Không thể tải thông tin chi tiết đơn hàng.')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  const copyToClipboard = () => {
    navigator.clipboard.writeText('4801205175150')
    setCopied(true)
    setCopyToast('Đã copy số tài khoản Agribank: 4801205175150!')
    setTimeout(() => setCopied(false), 2000)
    setTimeout(() => setCopyToast(''), 3000)
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="font-medium animate-pulse">Đang tải thông tin đơn hàng...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-2 shadow-sm border border-red-100">
          <FileText className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Lỗi tải đơn hàng</h1>
        <p className="text-slate-500">{error || 'Đơn hàng không tồn tại hoặc đã bị xóa.'}</p>
        <Link href="/products" className="mt-4 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-2xl transition font-medium shadow-md">
          Quay lại cửa hàng
        </Link>
      </div>
    )
  }

  // Parse thông tin Tên, SĐT và Hình thức nhận hàng từ field note 
  const noteLines = order.note ? order.note.split('\n') : []
  const nameLine = noteLines.find(l => l.startsWith('Tên:'))
  const nameStr = nameLine ? nameLine.replace('Tên:', '').trim() : ''
  const phoneLine = noteLines.find(l => l.startsWith('SĐT:'))
  const phoneStr = phoneLine ? phoneLine.replace('SĐT:', '').trim() : ''
  
  const transferContent = nameStr && phoneStr ? `${nameStr} - ${phoneStr}` : (nameStr || phoneStr || '(Tên + SĐT của bạn)')
  
  const deliveryLine = noteLines.find(l => l.startsWith('Nhận hàng:'))
  const deliveryStr = deliveryLine ? deliveryLine.replace('Nhận hàng:', '').trim() : 'Chưa rõ'

  return (
    <div className="w-full flex flex-col items-center px-4 py-8">
    <div className="w-full max-w-4xl space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Header Success Wow */}
      <div className="text-center pt-8 pb-2">
        <div className="relative inline-flex items-center justify-center w-32 h-32 mb-8 group">
          <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
          <div className="relative w-full h-full bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40">
            <CheckCircle2 className="w-16 h-16 text-white" />
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Tuyệt vời!</h1>
        <p className="text-xl text-slate-600 mb-6 font-medium">Đơn hàng của bạn đã được ghi nhận thành công.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Card 1: Order Details */}
        <section className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl shadow-slate-200/40 flex flex-col">
          <div className="flex justify-between items-start border-b border-gray-100 pb-5 mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Mã đơn hàng</h2>
              <p className="font-mono text-slate-500 font-medium text-lg mt-1">#{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-gray-100">
              <span className="text-sm font-semibold text-slate-600">
                {new Date(order.created_at).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>
          
          <div className="space-y-4 mb-6 flex-1">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex justify-between items-center group">
                <div className="flex-1 pr-4">
                  <p className="font-bold text-slate-700 line-clamp-1">{item.products?.name || 'Sản phẩm không xác định'}</p>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">
                    {item.quantity} {item.products?.unit || ''} × {item.price_at_time.toLocaleString('vi-VN')}đ
                  </p>
                </div>
                <span className="font-bold text-slate-900 whitespace-nowrap">
                  {(item.price_at_time * item.quantity).toLocaleString('vi-VN')}đ
                </span>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-gray-100 space-y-3">
            <div className="flex justify-between text-sm items-center">
              <span className="text-slate-500 font-medium">Thanh toán:</span>
              <span className="text-slate-700 font-bold bg-white px-3 py-1 rounded-md border border-gray-200 shadow-sm">
                {order.payment_method === 'cod' ? 'Tiền mặt (COD)' : 'Chuyển khoản'}
              </span>
            </div>
            <div className="flex justify-between items-end pt-3 mt-3 border-t border-gray-200 border-dashed">
              <span className="text-slate-600 font-bold text-lg">Tổng cộng</span>
              <span className="text-3xl font-black text-orange-500">
                {order.total_amount.toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>
        </section>

        {/* Card 2: Payment & Delivery Guide */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-50/30 border border-blue-100 rounded-3xl p-8 shadow-xl shadow-blue-100/40 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Wallet className="w-40 h-40" />
          </div>
          
          <h2 className="text-xl font-bold text-blue-800 mb-6 flex items-center gap-2 relative z-10">
            <span className="w-2 h-6 bg-blue-500 rounded-full block"></span>
            Hướng dẫn thanh toán
          </h2>
          
          <div className="space-y-5 relative z-10 flex-1">
            {order.payment_method === 'transfer' ? (
              <>
                <p className="text-slate-600 font-medium">Chuyển khoản vào tài khoản dưới đây để chúng tôi xử lý đơn ngay:</p>
                <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-bold text-blue-600">Ngân hàng Agribank</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <p className="font-mono text-3xl font-black tracking-wider text-slate-800">4801205175150</p>
                    <button 
                      onClick={copyToClipboard}
                      className="p-2.5 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-xl transition-all border border-gray-100 active:scale-95"
                      title="Copy số tài khoản"
                    >
                      {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-slate-600 font-bold mb-4">LÊ MINH QUYẾT</p>
                  
                  <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-100 flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-blue-600/80 font-medium">Nội dung CK:</span>
                    <span className="font-bold text-blue-700 bg-white px-2.5 py-1 rounded-md shadow-sm">{transferContent}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center flex flex-col items-center justify-center h-full">
                <Wallet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-700 font-bold text-lg mb-1">Thanh toán khi nhận hàng</p>
                <p className="text-slate-500 text-sm">Vui lòng chuẩn bị sẵn số tiền <span className="font-bold text-slate-700">{order.total_amount.toLocaleString('vi-VN')}đ</span></p>
              </div>
            )}

            {/* Delivery Alert */}
            <div className="mt-auto pt-6 border-t border-blue-100">
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex gap-3 items-start">
                <div className="bg-orange-100 p-2.5 rounded-xl text-orange-600 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-orange-800 mb-1">Lưu ý nhận hàng:</p>
                  <p className="text-orange-700/80 text-sm leading-relaxed font-medium">
                    {deliveryStr} <br/>
                    Đơn <strong className="text-orange-600 font-bold">&lt; 5kg</strong> nhớ nhận tại công ty nhé!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-16">
        <Link 
          href="/products" 
          className="flex-1 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 text-lg"
        >
          <Package className="w-6 h-6" />
          Tiếp tục mua sắm
        </Link>
        <Link 
          href="/profile?tab=orders" 
          className="flex-1 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-95 text-slate-700 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-lg"
        >
          Xem lịch sử đơn
          <ChevronRight className="w-6 h-6" />
        </Link>
      </div>
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

export default function OrderSuccessPage() {
  return (
    <div className="w-full flex flex-col items-center">
      <Suspense fallback={
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="font-medium animate-pulse">Đang tải...</p>
        </div>
      }>
        <OrderSuccessContent />
      </Suspense>
    </div>
  )
}
