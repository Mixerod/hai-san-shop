'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/store/cart'

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
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Product | null>(null)
  const [qty, setQty] = useState('1')
  const [added, setAdded] = useState<string | null>(null)
  const { add, items } = useCart()

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
      setProducts(data || [])
      setLoading(false)
    }
    load()
  }, [])

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
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-500 font-medium animate-pulse">Đang tải...</p>
    </div>
  )

  return (
    <div className="w-full flex flex-col items-center px-4 py-16">
    <main className="w-full max-w-6xl font-sans">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
        <div>
          <Link href="/" className="text-slate-500 text-sm hover:text-blue-600 transition-colors font-medium">← Trang chủ</Link>
          <h1 className="text-4xl font-extrabold mt-2 text-slate-900 tracking-tight">Sản phẩm tươi ngon</h1>
          <p className="text-slate-500 mt-2 text-lg">Hải sản chất lượng từ vùng biển Phan Thiết</p>
        </div>
        <Link href="/cart" className="relative bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all px-6 py-3 rounded-2xl flex items-center gap-3 group">
          <span className="text-xl group-hover:scale-110 transition-transform">🛒</span> 
          <span className="font-bold text-slate-700">Giỏ hàng</span>
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-sm shadow-orange-500/30">
              {cartCount}
            </span>
          )}
        </Link>
      </div>

      {/* Toast thêm thành công */}
      {added && (
        <div className="fixed top-24 right-6 bg-green-500 text-white px-6 py-4 rounded-2xl shadow-xl shadow-green-500/20 z-50 animate-in slide-in-from-right-8 font-semibold flex items-center gap-2">
          <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-sm">✓</span>
          Đã thêm vào giỏ hàng
        </div>
      )}

      {/* Danh sách sản phẩm */}
      {products.length === 0 ? (
        <p className="text-slate-500 text-center mt-24 text-lg">Chưa có sản phẩm nào.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((p) => (
            <div key={p.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col group relative">
              <div className="overflow-hidden w-full h-56 bg-slate-50 relative">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-500">🐟</div>
                )}
                {!p.in_stock && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                    <span className="bg-red-500 text-white px-4 py-1.5 rounded-full font-bold shadow-lg">Tạm hết hàng</span>
                  </div>
                )}
              </div>
              
              <div className="p-6 flex flex-col flex-1 relative z-20 bg-white">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-xl font-bold text-slate-800 line-clamp-2 leading-snug">{p.name}</h2>
                </div>
                
                {p.description && <p className="text-slate-500 text-sm mb-4 line-clamp-3 leading-relaxed">{p.description}</p>}
                
                {p.note && (
                  <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-2.5 mb-4 inline-flex items-start gap-2">
                    <span className="text-xs mt-0.5">💡</span>
                    <p className="text-yellow-700 text-xs font-medium leading-relaxed">{p.note}</p>
                  </div>
                )}
                
                <div className="mt-auto pt-4 border-t border-gray-50">
                  <div className="flex justify-between items-end mb-5">
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">Đơn giá</p>
                      <p className="text-blue-600 font-black text-2xl">
                        {p.price.toLocaleString('vi-VN')}đ<span className="text-sm font-medium text-slate-400">/{p.unit}</span>
                      </p>
                    </div>
                    <p className="text-slate-500 text-xs font-medium bg-slate-50 px-2.5 py-1 rounded-md border border-gray-100">Đã bán: {p.total_sold}</p>
                  </div>
                  <button
                    disabled={!p.in_stock}
                    onClick={() => openModal(p)}
                    className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:active:scale-100 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 flex items-center justify-center gap-2"
                  >
                    {p.in_stock ? (
                      <>
                        <span className="text-lg leading-none">+</span>
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