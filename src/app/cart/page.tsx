'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/store/cart'
import { supabase } from '@/lib/supabase'
import { Plus, Minus, Trash2, ShoppingCart, Zap, ArrowLeft, RefreshCw } from 'lucide-react'

type Product = {
  id: string
  name: string
  description: string
  price: number
  unit: string
  image_url: string
  total_sold: number
  in_stock: boolean
  note: string
  category?: string
}

export default function CartPage() {
  const { items, remove, updateQty, total, clear, add } = useCart()
  const [note, setNote] = useState('')
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({})
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
  
  const [recommended, setRecommended] = useState<Product[]>([])
  const [loadingRecs, setLoadingRecs] = useState(true)

  // Step and min quantity helper based on product unit
  const getQtyStep = (unit: string) => {
    const u = (unit || '').toLowerCase()
    if (u.includes('kg') || u.includes('ký') || u.includes('ky') || u.includes('kg/')) {
      return 0.5
    }
    return 1
  }

  const getQtyMin = (unit: string) => {
    return getQtyStep(unit)
  }

  // Calculate total kilograms for seafood weight
  const totalKg = items.reduce((acc, item) => {
    const u = (item.unit || '').toLowerCase()
    if (u.includes('kg') || u.includes('ký') || u.includes('ky') || u.includes('kg/')) {
      return acc + item.quantity
    }
    return acc
  }, 0)

  // Fetch best-selling recommended products for cross-selling
  useEffect(() => {
    async function fetchRecommended() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('in_stock', true)
          .order('total_sold', { ascending: false })
          .limit(8)
        
        if (data) {
          setRecommended(data)
        }
      } catch (err) {
        console.error('Lỗi khi tải gợi ý sản phẩm:', err)
      } finally {
        setLoadingRecs(false)
      }
    }
    
    fetchRecommended()
  }, [])

  // Synchronize store quantity with local input values when store updates
  useEffect(() => {
    const newInputs = { ...qtyInputs }
    let changed = false
    items.forEach(item => {
      if (qtyInputs[item.id] === undefined || (focusedItemId !== item.id && parseFloat(qtyInputs[item.id]) !== item.quantity)) {
        newInputs[item.id] = String(item.quantity)
        changed = true
      }
    })
    if (changed) {
      setQtyInputs(newInputs)
    }
  }, [items, focusedItemId])

  // Increase/Decrease quantity handlers
  const handleDecrease = (itemId: string, currentQty: number, unit: string) => {
    const step = getQtyStep(unit)
    const min = getQtyMin(unit)
    const newQty = Math.max(min, Math.round((currentQty - step) * 10) / 10)
    updateQty(itemId, newQty)
    setQtyInputs(prev => ({ ...prev, [itemId]: String(newQty) }))
  }

  const handleIncrease = (itemId: string, currentQty: number, unit: string) => {
    const step = getQtyStep(unit)
    const newQty = Math.round((currentQty + step) * 10) / 10
    updateQty(itemId, newQty)
    setQtyInputs(prev => ({ ...prev, [itemId]: String(newQty) }))
  }

  // Handle direct text field input
  const handleInputChange = (itemId: string, val: string, unit: string) => {
    setQtyInputs(prev => ({ ...prev, [itemId]: val }))
    
    const num = parseFloat(val)
    const min = getQtyMin(unit)
    if (!isNaN(num) && num >= min) {
      updateQty(itemId, num)
    }
  }

  // Validate on text box blur
  const handleInputBlur = (itemId: string, currentQty: number, unit: string) => {
    setFocusedItemId(null)
    const valStr = qtyInputs[itemId]
    let num = parseFloat(valStr)
    const min = getQtyMin(unit)
    
    if (isNaN(num) || num < min) {
      num = currentQty || min
    }
    
    const step = getQtyStep(unit)
    num = Math.round(num / step) * step
    num = parseFloat(num.toFixed(1))
    
    updateQty(itemId, num)
    setQtyInputs(prev => ({ ...prev, [itemId]: String(num) }))
  }

  // Empty State with cross-selling
  if (items.length === 0) return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/15 to-slate-100/50 flex flex-col items-center px-4 py-16">
      <main className="w-full max-w-4xl font-sans">
        
        {/* Hiding horizontal scrollbars on mobile */}
        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}} />

        {/* Empty state card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-12 text-center shadow-lg shadow-blue-900/5 mb-12 flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

          <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6 shadow-inner text-4xl animate-bounce">
            🛒
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Giỏ hàng của bạn đang trống trơn
          </h1>
          <p className="text-slate-500 max-w-md mx-auto mb-8 text-sm sm:text-base leading-relaxed">
            Có vẻ bạn chưa chọn được đặc sản Phan Thiết nào. Hãy tham khảo các gợi ý bán chạy bên dưới hoặc tiếp tục mua sắm nhé!
          </p>
          <Link 
            href="/products" 
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold px-8 py-3.5 rounded-2xl transition-all shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-0.5 active:scale-95 text-sm uppercase tracking-wider"
          >
            <span>Khám phá sản phẩm ngay</span>
            <span>→</span>
          </Link>
        </div>

        {/* Recommended Products Slider / Cross-selling Section */}
        {loadingRecs ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">Đang tìm các sản phẩm bán chạy...</p>
          </div>
        ) : recommended.length > 0 ? (
          <div className="animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-6 px-1">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="text-orange-500">🔥</span>
                  <span>Có thể bạn sẽ thích</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-semibold">Đặc sản bán chạy nhất được ưa chuộng nhất</p>
              </div>
              <Link href="/products" className="text-xs font-black text-blue-600 hover:text-blue-700 transition flex items-center gap-0.5 hover:underline">
                Xem tất cả <span>→</span>
              </Link>
            </div>

            {/* Horizontal scroll on mobile, nice grid on desktop */}
            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth hide-scrollbar -mx-4 sm:-mx-0 sm:px-0 sm:grid sm:grid-cols-2 md:grid-cols-4 sm:overflow-x-visible">
              {recommended.map((p) => (
                <div 
                  key={p.id}
                  className="w-[240px] shrink-0 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-500/10 transition-all duration-300 flex flex-col sm:w-full group"
                >
                  {/* Product Image */}
                  <div className="overflow-hidden w-full h-32 rounded-xl bg-slate-50 mb-3 relative shrink-0 border border-slate-100">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🐟</div>
                    )}
                    {p.total_sold > 0 && (
                      <span className="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow shadow-orange-500/25">
                        Bán chạy
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors mb-1">{p.name}</h3>
                      <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed mb-3 h-8">{p.description}</p>
                    </div>

                    <div className="space-y-3 mt-auto">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Giá bán</span>
                        <p className="text-blue-600 font-black text-sm">
                          {p.price.toLocaleString('vi-VN')}đ<span className="text-[10px] text-slate-400 font-medium lowercase">/{p.unit}</span>
                        </p>
                      </div>

                      {/* Add/Buy Now Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const minQty = getQtyMin(p.unit)
                          // Adds item to cart, which automatically switches layout since items.length changes
                          add({ id: p.id, name: p.name, price: p.price, unit: p.unit, quantity: minQty })
                        }}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white text-center text-xs font-black py-2.5 rounded-xl transition-all shadow shadow-orange-500/10 hover:shadow-md hover:shadow-orange-500/20 flex items-center justify-center gap-1 cursor-pointer border border-orange-600/10 animate-in fade-in"
                      >
                        <Zap className="w-3 h-3 fill-white animate-pulse" />
                        <span>Mua Ngay</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )

  // Filled Cart State
  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/15 to-slate-100/50 flex flex-col items-center px-4 py-16">
      <main className="w-full max-w-2xl font-sans animate-in fade-in duration-300">

        {/* Header */}
        <div className="flex justify-between items-end mb-10 px-2">
          <div>
            <Link href="/products" className="text-slate-500 text-xs sm:text-sm hover:text-blue-600 transition-colors flex items-center gap-1 font-bold uppercase tracking-wider">
              <ArrowLeft className="w-4 h-4" /> Tiếp tục chọn hải sản
            </Link>
            <h1 className="text-4xl font-extrabold mt-3 text-slate-900 tracking-tight leading-none">Giỏ hàng của bạn</h1>
          </div>
          <button 
            onClick={clear} 
            className="text-red-500 text-xs sm:text-sm font-extrabold hover:text-red-600 bg-red-50 hover:bg-red-100/70 px-4 py-2 rounded-xl transition-all active:scale-95"
          >
            Xóa tất cả
          </button>
        </div>

        {/* Product Items List */}
        <div className="flex flex-col gap-4 mb-8">
          {items.map((item) => {
            const step = getQtyStep(item.unit)
            const min = getQtyMin(item.unit)
            
            return (
              <div key={item.id} className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-blue-500/10 transition-all duration-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                
                {/* Product Meta details */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h2 className="font-extrabold text-lg sm:text-xl text-slate-900 leading-tight tracking-tight mb-1">{item.name}</h2>
                      <p className="text-blue-600 font-extrabold text-sm">
                        {item.price.toLocaleString('vi-VN')}đ<span className="text-slate-400 font-medium">/{item.unit}</span>
                      </p>
                    </div>
                    {/* Delete Item (Visible on mobile on the top right) */}
                    <button 
                      onClick={() => remove(item.id)} 
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90 sm:hidden shrink-0"
                      title="Xóa khỏi giỏ hàng"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Adjust Quantity Block */}
                <div className="flex justify-between items-center sm:gap-6 shrink-0 mt-2 sm:mt-0">
                  
                  {/* Quantity selector with dynamic stepper based on Unit */}
                  <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-2xl p-1 shadow-inner w-32 justify-between">
                    <button
                      type="button"
                      onClick={() => handleDecrease(item.id, item.quantity, item.unit)}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-blue-600 transition-all font-black flex items-center justify-center select-none shadow-sm cursor-pointer active:scale-90"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    
                    <div className="flex items-center justify-center flex-1">
                        <input
                          type="number"
                          min={min}
                          step={step}
                          value={qtyInputs[item.id] !== undefined ? qtyInputs[item.id] : String(item.quantity)}
                          onChange={(e) => handleInputChange(item.id, e.target.value, item.unit)}
                          onFocus={(e) => {
                            setFocusedItemId(item.id)
                            e.target.select()
                          }}
                          onBlur={() => handleInputBlur(item.id, item.quantity, item.unit)}
                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          className="w-10 bg-transparent text-center text-slate-800 font-extrabold text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase ml-0.5">{item.unit}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleIncrease(item.id, item.quantity, item.unit)}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-blue-600 transition-all font-black flex items-center justify-center select-none shadow-sm cursor-pointer active:scale-90"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Calculated Price */}
                  <div className="flex items-center gap-4">
                    <p className="font-black text-lg sm:text-xl text-slate-900 tracking-tight text-right min-w-[90px]">
                      {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                    </p>
                    {/* Delete Item (Visible on desktop) */}
                    <button 
                      onClick={() => remove(item.id)} 
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90 hidden sm:flex shrink-0"
                      title="Xóa khỏi giỏ hàng"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                </div>
              </div>
            )
          })}
        </div>

        {/* Order Notes Section */}
        <div className="mb-8 px-1">
          <label className="text-slate-500 text-xs font-bold mb-2.5 block uppercase tracking-wider">
            Ghi chú giao hàng (tùy chọn)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Giao sau 5h chiều, gọi trước khi đến, làm sạch mang cá giúp mình nhé..."
            rows={3}
            className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-2xl px-4 py-3.5 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 resize-none shadow-sm transition-all leading-relaxed"
          />
        </div>

        {/* Pricing Summary Block */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 mb-8 shadow-sm">
          <div className="flex justify-between text-slate-500 text-sm mb-4">
            <span className="font-semibold text-slate-650">Số lượng đặc sản</span>
            <span className="text-slate-900 font-extrabold">{items.length} loại</span>
          </div>

          <div className="flex justify-between items-start text-slate-500 text-sm mb-6 border-b border-slate-100 pb-5">
            <div className="flex flex-col">
              <span className="font-semibold text-slate-650">Ước tính phí giao hàng</span>
              {totalKg > 0 && (
                <span className="text-[11px] text-slate-400 mt-0.5">Tổng khối lượng: {totalKg.toFixed(1)}kg</span>
              )}
            </div>
            {totalKg < 5 ? (
              <span className="text-orange-600 text-right ml-4 font-extrabold bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100/50">
                ~5.000 – 10.000đ (Đơn chung)
              </span>
            ) : (
              <span className="text-orange-600 text-right ml-4 font-extrabold bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100/50">
                Tính theo Viettel Post
              </span>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-600 font-extrabold text-lg">Tổng cộng tạm tính</span>
            <span className="text-3xl sm:text-4xl font-black text-blue-600 tracking-tight">
              {total().toLocaleString('vi-VN')}đ
            </span>
          </div>
        </div>

        {/* Checkout Button */}
        <Link
          href={{ pathname: '/checkout', query: { note } }}
          className="block w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-center font-extrabold py-4.5 rounded-2xl transition-all shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-0.5 active:scale-98 text-lg uppercase tracking-wider border border-cyan-500/10"
        >
          Tiến hành đặt hàng →
        </Link>
      </main>
    </div>
  )
}