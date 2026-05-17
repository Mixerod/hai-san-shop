'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/store/cart'
import { Bell, Megaphone, Save, Send, ChevronDown, ChevronUp, Check, Loader2 } from 'lucide-react'

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Product | null>(null)
  const [qty, setQty] = useState('1')
  const [added, setAdded] = useState<string | null>(null)
  const { add, items } = useCart()

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)

  // Admin and Price Edit states
  const [session, setSession] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [broadcastId, setBroadcastId] = useState<string | null>(null)
  const [broadcastText, setBroadcastText] = useState('')
  const [adminToast, setAdminToast] = useState<string | null>(null)
  
  // Global Broadcast states
  const [globalMessage, setGlobalMessage] = useState('')
  const [globalType, setGlobalType] = useState<'general' | 'new_product' | 'price_change'>('general')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [showGlobalPanel, setShowGlobalPanel] = useState(true)

  // Category states
  const [selectedCategory, setSelectedCategory] = useState('Tất cả')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const categories = ['Tất cả', 'Cá tươi', 'Cá khô', 'Tôm', 'Cua', 'Mực', 'Chả', 'Mắm & Nước mắm', 'Khác']

  // Category fallback mapping for instant out-of-the-box compatibility
  function getFallbackCategory(p: Product) {
    if (p.category) return p.category
    const nameLower = p.name.toLowerCase()
    if (nameLower.includes('khô')) return 'Cá khô'
    if (nameLower.includes('chả')) return 'Chả'
    if (nameLower.includes('tôm') || nameLower.includes('ghẹ tôm')) return 'Tôm'
    if (nameLower.includes('cua') || nameLower.includes('ghẹ')) return 'Cua'
    if (nameLower.includes('mực') || nameLower.includes('bạch tuộc')) return 'Mực'
    if (nameLower.includes('mắm') || nameLower.includes('nước mắm')) return 'Mắm & Nước mắm'
    if (nameLower.includes('cá') || nameLower.includes('thu') || nameLower.includes('bớp') || nameLower.includes('nục') || nameLower.includes('mú') || nameLower.includes('hồi') || nameLower.includes('chỉ vàng')) return 'Cá tươi'
    return 'Khác'
  }

  // Save category change to Supabase
  async function handleSaveCategory(productId: string, newCategory: string) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ category: newCategory })
        .eq('id', productId)

      if (error) {
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          alert('💡 Chào Quyết! Để lưu danh mục sản phẩm, bạn cần thêm cột "category" vào bảng "products" trong database.\n\nVui lòng mở Supabase Dashboard -> SQL Editor và chạy dòng lệnh sau:\n\nALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text DEFAULT \'Khác\';')
          return
        }
        throw error
      }

      setProducts(prev => prev.map(p => p.id === productId ? { ...p, category: newCategory } : p))
      showAdminToast('Đã lưu danh mục sản phẩm! 🏷️')
    } catch (err: any) {
      console.error(err)
      alert('Lỗi cập nhật danh mục: ' + err.message)
    }
  }

  const showAdminToast = (msg: string) => {
    setAdminToast(msg)
    setTimeout(() => setAdminToast(null), 3000)
  }

  // Load session and check admin
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsAdmin(session?.user?.email === 'minhquyet08122003@gmail.com')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setIsAdmin(session?.user?.email === 'minhquyet08122003@gmail.com')
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
      setProducts(data || [])
      
      // Initialize price inputs
      const inputs: Record<string, string> = {}
      data?.forEach(p => {
        inputs[p.id] = String(p.price)
      })
      setPriceInputs(inputs)
      setLoading(false)
    }
    load()
  }, [])

  // Price change handler
  async function handleSavePrice(productId: string, originalProduct: Product) {
    const rawVal = priceInputs[productId]
    const newPrice = parseFloat(rawVal)
    if (isNaN(newPrice) || newPrice <= 0) {
      alert('Vui lòng nhập giá trị hợp lệ lớn hơn 0!')
      return
    }

    if (newPrice === originalProduct.price) {
      showAdminToast('Không có thay đổi về giá.')
      return
    }

    setSavingId(productId)
    try {
      const { error } = await supabase
        .from('products')
        .update({ price: newPrice })
        .eq('id', productId)

      if (error) throw error

      setProducts(prev => prev.map(p => p.id === productId ? { ...p, price: newPrice } : p))
      showAdminToast('Đã lưu giá mới!')

      // Ask if admin wants to send a broadcast notification
      const oldPriceStr = originalProduct.price.toLocaleString('vi-VN')
      const newPriceStr = newPrice.toLocaleString('vi-VN')
      const autoMsg = newPrice < originalProduct.price
        ? `📢 Tin vui cả nhà ơi! Hải sản ${originalProduct.name} vừa GIẢM GIÁ từ ${oldPriceStr}đ xuống chỉ còn ${newPriceStr}đ/${originalProduct.unit}! Ghé shop chốt đơn ngay nà! 🐟`
        : `📢 Thông báo: Hải sản ${originalProduct.name} vừa cập nhật giá mới từ ${oldPriceStr}đ thành ${newPriceStr}đ/${originalProduct.unit} do biến động nguồn hàng biển Phan Thiết. Cảm ơn cả nhà đã luôn ủng hộ shop! 🐟`
      setBroadcastText(autoMsg)
      setBroadcastId(productId)
    } catch (err: any) {
      console.error(err)
      alert('Lỗi cập nhật giá: ' + err.message)
    } finally {
      setSavingId(null)
    }
  }

  // Send broadcast notification to Supabase
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
        // Fallback: If table doesn't exist, prompt the admin to create it
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          alert('💡 Chào Quyết! Tính năng gửi thông báo yêu cầu có bảng "notifications" trong database.\n\nBạn vui lòng mở Supabase Dashboard -> SQL Editor và chạy đoạn code sau để tạo bảng:\n\nCREATE TABLE public.notifications (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  message text NOT NULL,\n  type text DEFAULT \'general\',\n  created_at timestamptz DEFAULT now() NOT NULL\n);\nALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Allow anon select" ON public.notifications FOR SELECT USING (true);\nCREATE POLICY "Allow admin all" ON public.notifications FOR ALL USING (true);')
          return
        }
        throw error
      }

      showAdminToast('Đã phát thông báo thành công! ⚡')
      setBroadcastId(null)
      setGlobalMessage('')
    } catch (err: any) {
      console.error(err)
      alert('Lỗi khi gửi thông báo: ' + err.message)
    } finally {
      setSendingBroadcast(false)
    }
  }

  function openModal(p: Product) {
    setSelected(p)
    setQty('1')
  }

  function confirmAdd() {
    if (!selected) return
    const quantity = parseFloat(qty)
    if (isNaN(quantity) || quantity <= 0) return
    add({ id: selected.id, name: selected.name, price: selected.price, unit: selected.unit, quantity })
    setAdded(selected.id)
    setSelected(null)
    setTimeout(() => setAdded(null), 2000)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
        <p className="text-slate-500 font-bold animate-pulse text-sm uppercase tracking-widest">Đang tải danh sách...</p>
      </div>
    </div>
  )

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/15 to-slate-100/50 flex flex-col items-center px-4 py-16">
    <main className="w-full max-w-6xl font-sans">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-5 px-2">
        <div>
          <Link href="/" className="inline-flex items-center gap-1 text-slate-500 text-xs hover:text-blue-600 transition-colors font-bold uppercase tracking-wider">
            <span>←</span> Trang chủ
          </Link>
          <h1 className="text-4xl font-extrabold mt-3 text-slate-900 tracking-tight leading-tight">
            Sản phẩm tươi ngon
          </h1>
          <p className="text-slate-500 mt-2 text-base sm:text-lg">
            Hải sản chất lượng từ vùng biển Phan Thiết
          </p>
        </div>
        <Link 
          href="/cart" 
          className="relative bg-white border border-gray-200/80 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-orange-200 transition-all duration-300 px-6 py-3.5 rounded-2xl flex items-center gap-3 group active:scale-95 animate-in fade-in"
        >
          <span className="text-xl group-hover:scale-120 group-hover:rotate-6 transition-all duration-300">🛒</span> 
          <span className="font-extrabold text-slate-700 text-sm tracking-wide">Giỏ hàng</span>
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-black shadow-lg shadow-orange-500/30 animate-pulse">
              {cartCount}
            </span>
          )}
        </Link>
      </div>

      {/* Admin Quick Broadcast Board */}
      {isAdmin && (
        <div className="mb-10 w-full bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-blue-900/40 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-6 duration-300">
          {/* Background ambient glowing gradient */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-orange-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />
          
          <div className="flex items-center justify-between border-b border-blue-900/30 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center border border-cyan-400/20">
                <Megaphone className="w-5 h-5 text-white animate-bounce" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">Bảng Phát Tin Nhanh</h2>
                <p className="text-xs text-slate-400 font-semibold">Gửi thông báo real-time tới tất cả khách hàng</p>
              </div>
            </div>
            <button
              onClick={() => setShowGlobalPanel(!showGlobalPanel)}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
            >
              {showGlobalPanel ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {showGlobalPanel && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Loại thông báo</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'general', label: '📢 Thông báo chung', bg: 'bg-blue-950/40 border-blue-500/20 text-blue-300 hover:bg-blue-950/60' },
                    { id: 'new_product', label: '🐟 Có cá mới nà', bg: 'bg-emerald-950/40 border-emerald-500/20 text-emerald-300 hover:bg-emerald-950/60' },
                    { id: 'price_change', label: '🏷️ Có đổi giá nè', bg: 'bg-amber-950/40 border-amber-500/20 text-amber-300 hover:bg-amber-950/60' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setGlobalType(t.id as any)}
                      className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                        globalType === t.id
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 scale-102 font-black'
                          : t.bg
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nội dung tin nhắn</label>
                <textarea
                  rows={3}
                  value={globalMessage}
                  onChange={(e) => setGlobalMessage(e.target.value)}
                  placeholder="Nhập nội dung cần thông báo cho khách hàng... (Ví dụ: Có cá hồi tươi Phan Thiết vừa cập bến nà cả nhà ơi!)"
                  className="w-full bg-slate-950/80 border border-blue-900/30 rounded-2xl px-4 py-3 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold leading-relaxed transition-all shadow-inner"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={sendingBroadcast || !globalMessage.trim()}
                  onClick={() => handleSendNotification(globalMessage, globalType)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-95 flex items-center gap-2 border border-cyan-400/20 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  {sendingBroadcast ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang gửi tin...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Phát tin toàn quốc 🚀</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin alerts toast */}
      {adminToast && (
        <div className="fixed top-24 right-6 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-[85] animate-in slide-in-from-right-8 font-extrabold flex items-center gap-2.5 border border-blue-500/30">
          <span className="bg-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm">⚡</span>
          {adminToast}
        </div>
      )}

      {/* Custom Global Styles for Hiding Scrollbars */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />

      {/* Bộ lọc danh mục (Dropdown Filter Box with absolute overlay) */}
      <div className="w-full mb-8 relative flex justify-start z-[70]">
        <div className="relative">
          <button
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-350 text-slate-700 font-extrabold text-xs sm:text-sm px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl transition-all shadow-sm hover:shadow active:scale-95 flex items-center gap-2 sm:gap-3 cursor-pointer select-none"
          >
            <span className="text-blue-500 text-sm sm:text-base">🔍</span>
            <span>Danh mục: <strong className="text-blue-600 font-black">{selectedCategory}</strong></span>
            <span className={`text-slate-400 text-[10px] sm:text-xs transition-transform duration-300 ${showCategoryDropdown ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {/* Underlay to close dropdown when clicked outside */}
          {showCategoryDropdown && (
            <div 
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setShowCategoryDropdown(false)}
            />
          )}

          {/* Dropdown Floating overlay panel */}
          {showCategoryDropdown && (
            <div className="absolute top-full left-0 mt-2 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-900/10 p-3 sm:p-4 w-[280px] sm:w-[420px] max-w-[92vw] z-50 animate-in fade-in slide-in-from-top-3 duration-250">
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-2 px-1">Chọn loại hải sản lọc</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const count = cat === 'Tất cả' 
                    ? products.length 
                    : products.filter(p => getFallbackCategory(p) === cat).length;
                  
                  const isSelected = selectedCategory === cat;
                  
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setShowCategoryDropdown(false);
                      }}
                      className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all duration-200 cursor-pointer select-none flex items-center justify-between border ${
                        isSelected
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20 scale-102'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200/60 text-slate-650'
                      }`}
                    >
                      <span className="truncate pr-1">{cat}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-md shrink-0 font-bold ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : 'bg-slate-200/60 text-slate-550'
                      }`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Danh sách sản phẩm */}
      {products.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm w-full">
          <div className="text-6xl mb-4 animate-bounce">🐟</div>
          <p className="text-slate-500 font-bold text-lg">Chưa có sản phẩm nào được bày bán.</p>
        </div>
      ) : products.filter(p => selectedCategory === 'Tất cả' || getFallbackCategory(p) === selectedCategory).length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm w-full">
          <div className="text-6xl mb-4 animate-pulse">🔎</div>
          <p className="text-slate-500 font-bold text-lg">Không tìm thấy sản phẩm nào trong danh mục "{selectedCategory}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-6 md:gap-8">
          {products
            .filter((p) => selectedCategory === 'Tất cả' || getFallbackCategory(p) === selectedCategory)
            .map((p) => (
              <div 
                key={p.id} 
                className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-2 hover:border-blue-500/10 transition-all duration-500 flex flex-col group relative"
              >
                {/* Image Container with Zoom effect */}
                <div className="overflow-hidden w-full h-36 sm:h-56 bg-slate-50 relative border-b border-slate-100/50">
                  {p.image_url ? (
                    <img 
                      src={p.image_url} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl sm:text-6xl group-hover:scale-112 group-hover:rotate-3 transition-all duration-500">
                      🐟
                    </div>
                  )}
                  {!p.in_stock && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[3px] flex items-center justify-center z-10">
                      <span className="bg-red-500 text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-black text-[9px] sm:text-xs uppercase tracking-widest shadow-lg shadow-red-500/30">
                        Hết hàng
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Product Info Block */}
                <div className="p-3 sm:p-6 flex flex-col flex-1 relative z-20 bg-white transition-all duration-300">
                  <div className="flex justify-between items-start mb-1 sm:mb-3">
                    <h2 className="text-xs sm:text-xl font-extrabold text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                      {p.name}
                    </h2>
                  </div>
                  
                  {p.description && (
                    <p className="text-slate-500 text-xs sm:text-sm mb-2 sm:mb-4 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                  
                  {p.note && (
                    <div className="bg-amber-50 border border-amber-100/70 rounded-xl p-2 sm:p-3 mb-2 sm:mb-4 inline-flex items-start gap-1.5 sm:gap-2">
                      <span className="text-[10px] sm:text-xs mt-0.5">💡</span>
                      <p className="text-amber-700 text-[10px] sm:text-xs font-semibold leading-relaxed">{p.note}</p>
                    </div>
                  )}
                  
                  <div className="mt-auto pt-2.5 sm:pt-4 border-t border-slate-50">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2 mb-3 sm:mb-5">
                      <div className="flex-1">
                        <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold mb-0.5 sm:mb-1.5 uppercase tracking-wider">Đơn giá</p>
                        {isAdmin ? (
                          <div className="flex items-center gap-1 sm:gap-2">
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                value={priceInputs[p.id] !== undefined ? priceInputs[p.id] : p.price}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setPriceInputs(prev => ({ ...prev, [p.id]: val }))
                                }}
                                className="w-16 sm:w-24 bg-blue-50/60 border border-blue-200/80 rounded-lg sm:rounded-xl px-1.5 sm:px-2.5 py-1 sm:py-1.5 text-blue-700 font-extrabold text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-center shadow-sm"
                              />
                              <span className="absolute right-1 sm:right-2 text-slate-450 text-[10px] sm:text-xs font-bold pointer-events-none">đ</span>
                            </div>
                            
                            <button
                              onClick={() => handleSavePrice(p.id, p)}
                              disabled={savingId === p.id}
                              className="p-1 sm:p-2 bg-emerald-500 hover:bg-emerald-600 active:scale-90 text-white rounded-lg sm:rounded-xl transition-all shadow-md shadow-emerald-500/25 border border-emerald-600/10 cursor-pointer animate-in fade-in"
                              title="Lưu giá mới"
                            >
                              {savingId === p.id ? (
                                <Loader2 className="w-3 sm:w-3.5 h-3 sm:h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3 sm:w-3.5 h-3 sm:h-3.5 font-bold" />
                              )}
                            </button>
                            
                            <span className="text-[10px] sm:text-xs font-semibold text-slate-400">/{p.unit}</span>
                          </div>
                        ) : (
                          <p className="text-blue-600 font-black text-[13px] sm:text-2xl tracking-tight">
                            {p.price.toLocaleString('vi-VN')}đ<span className="text-[9px] sm:text-sm font-medium text-slate-400">/{p.unit}</span>
                          </p>
                        )}
                      </div>
                      
                      {!isAdmin && (
                        <p className="text-slate-500 text-[10px] sm:text-xs font-bold bg-slate-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors self-start sm:self-end shrink-0">
                          Đã bán: {p.total_sold}
                        </p>
                      )}
                    </div>

                    {/* Inline Price Broadcast Announcement Panel */}
                    {isAdmin && broadcastId === p.id && (
                      <div className="mt-3 mb-4 bg-blue-50/70 border border-blue-200/50 rounded-2xl p-4 space-y-3 animate-in slide-in-from-bottom-2 duration-300 relative z-[40]">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
                          <span>📢</span>
                          <span>Phát thông báo đổi giá?</span>
                        </div>
                        <textarea
                          rows={2}
                          value={broadcastText}
                          onChange={(e) => setBroadcastText(e.target.value)}
                          className="w-full bg-white border border-blue-250 rounded-xl p-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 leading-relaxed shadow-sm"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setBroadcastId(null)}
                            className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm transition-all cursor-pointer"
                          >
                            Bỏ qua
                          </button>
                          <button
                            type="button"
                            disabled={sendingBroadcast}
                            onClick={() => handleSendNotification(broadcastText, 'price_change')}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-[10px] rounded-lg shadow-md shadow-blue-500/25 border border-blue-600/10 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            {sendingBroadcast ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-3 h-3" />
                                <span>Gửi ngay</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Admin Category Inline Selector */}
                    {isAdmin && (
                      <div className="mt-2.5 mb-4 pt-2.5 border-t border-slate-100 flex flex-col gap-1 w-full text-left">
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Phân loại danh mục</span>
                        <select
                          value={p.category || getFallbackCategory(p)}
                          onChange={async (e) => {
                            const newCat = e.target.value
                            await handleSaveCategory(p.id, newCat)
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-[11px] text-slate-700 font-extrabold outline-none focus:border-blue-500 cursor-pointer shadow-inner"
                        >
                          {categories.filter(c => c !== 'Tất cả').map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      disabled={!p.in_stock}
                      onClick={() => openModal(p)}
                      className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:active:scale-100 disabled:cursor-not-allowed text-white font-black h-10 sm:h-auto py-0 sm:py-3.5 text-[10px] sm:text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-orange-500/10 hover:shadow-lg hover:shadow-orange-500/25 flex items-center justify-center gap-1 sm:gap-2 border border-orange-600/10 cursor-pointer"
                    >
                      {p.in_stock ? (
                        <>
                          <span className="text-base sm:text-lg leading-none font-bold">+</span>
                          <span>Thêm vào giỏ</span>
                        </>
                      ) : 'Hết hàng'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Toast thêm thành công */}
      {added && (
        <div className="fixed top-24 right-6 bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-emerald-500/20 z-50 animate-in slide-in-from-right-8 font-semibold flex items-center gap-2 border border-emerald-400/20">
          <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-sm">✓</span>
          Đã thêm vào giỏ hàng
        </div>
      )}

      {/* Modal nhập số lượng */}
      {selected && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100">
              <span className="text-3xl">🛒</span>
            </div>
            
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">{selected.name}</h2>
            <p className="text-blue-600 font-bold text-xl mb-4">{selected.price.toLocaleString('vi-VN')}đ<span className="text-base font-medium text-slate-500">/{selected.unit}</span></p>
            
            <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-gray-100">
              <label className="text-slate-700 font-bold text-sm mb-3 block">Chọn số lượng mua ({selected.unit})</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-slate-900 font-bold text-lg focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all text-center shadow-sm"
                autoFocus
              />
            </div>

            {qty && !isNaN(parseFloat(qty)) && parseFloat(qty) > 0 && (
              <div className="flex justify-between items-center mb-8 px-2">
                <span className="text-slate-500 font-medium">Tạm tính:</span>
                <span className="text-orange-500 font-black text-2xl">{(selected.price * parseFloat(qty)).toLocaleString('vi-VN')}đ</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setSelected(null)}
                className="flex-[0.4] bg-white border-2 border-gray-100 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-gray-50 hover:border-gray-200 active:scale-95 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={confirmAdd}
                disabled={!qty || isNaN(parseFloat(qty)) || parseFloat(qty) <= 0}
                className="flex-[0.6] bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:active:scale-100 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/25 border border-orange-600/20"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
    </div>
  )
}