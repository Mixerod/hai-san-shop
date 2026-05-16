'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/store/cart'

export default function CartPage() {
  const { items, remove, updateQty, total, clear } = useCart()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [note, setNote] = useState('')

  const totalKg = items.reduce((acc, item) => acc + item.quantity, 0)

  function startEdit(id: string, current: number) {
    setEditingId(id)
    setEditVal(String(current))
  }

  function confirmEdit(id: string) {
    const val = parseFloat(editVal)
    if (!isNaN(val) && val > 0) updateQty(id, val)
    setEditingId(null)
  }

  if (items.length === 0) return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-5xl mb-2">🛒</p>
      <p className="text-gray-400 text-lg">Giỏ hàng trống</p>
      <Link href="/products" className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-6 py-3 rounded-xl transition">
        Xem sản phẩm
      </Link>
    </main>
  )

  return (
    <div className="w-full flex flex-col items-center px-4 py-12">
    <main className="w-full max-w-2xl">

      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <Link href="/products" className="text-slate-500 text-sm hover:text-blue-600 transition flex items-center gap-1 font-medium">
            <span>←</span> Tiếp tục mua sản phẩm
          </Link>
          <h1 className="text-4xl font-bold mt-2 text-slate-900">Giỏ hàng</h1>
        </div>
        <button onClick={clear} className="text-red-500 text-sm font-medium hover:underline">Xóa tất cả</button>
      </div>

      {/* Danh sách sản phẩm */}
      <div className="flex flex-col gap-3 mb-8">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-lg text-slate-900">{item.name}</p>
                <p className="text-blue-600 font-medium text-sm">{item.price.toLocaleString('vi-VN')}đ/{item.unit}</p>
              </div>
              <button onClick={() => remove(item.id)} className="text-slate-300 hover:text-red-500 transition text-2xl leading-none">×</button>
            </div>

            <div className="flex justify-between items-center">
              {/* Số lượng */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(item.id, Math.max(0.1, parseFloat((item.quantity - 0.5).toFixed(1))))}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition font-bold"
                >−</button>

                {editingId === item.id ? (
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    onBlur={() => confirmEdit(item.id)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmEdit(item.id)}
                    className="w-20 bg-white border border-blue-500 rounded-lg px-2 py-1 text-center text-slate-900 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => startEdit(item.id, item.quantity)}
                    className="w-20 text-center bg-white hover:bg-slate-50 border border-slate-200 rounded-lg py-1 transition text-slate-700 font-medium"
                    title="Bấm để nhập số lượng"
                  >
                    {item.quantity} {item.unit}
                  </button>
                )}

                <button
                  onClick={() => updateQty(item.id, parseFloat((item.quantity + 0.5).toFixed(1)))}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition font-bold"
                >+</button>
              </div>

              {/* Thành tiền */}
              <p className="font-bold text-lg text-slate-900">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</p>
            </div>
          </div>
        ))}
      </div>

      {/* Ghi chú đơn hàng */}
      <div className="mb-8">
        <label className="text-slate-500 text-sm font-semibold mb-2 block uppercase tracking-wide">Ghi chú đơn hàng (tùy chọn)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ví dụ: Giao sau 5h chiều, gọi trước khi đến..."
          rows={3}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none shadow-sm transition-all"
        />
      </div>

      {/* Tổng tiền */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex justify-between text-slate-500 text-sm mb-3">
          <span className="font-medium">Số mặt hàng</span>
          <span className="text-slate-900 font-bold">{items.length} loại</span>
        </div>
        <div className="flex justify-between items-start text-slate-500 text-sm mb-5">
          <span className="whitespace-nowrap font-medium">Phí giao hàng</span>
          {totalKg < 5 ? (
            <span className="text-orange-600 text-right ml-4 font-semibold">~5.000 – 10.000đ (chia đều đơn chung)</span>
          ) : (
            <span className="text-orange-600 text-right ml-4 font-semibold">Tính theo gói Viettel Post</span>
          )}
        </div>
        <div className="border-t border-slate-100 pt-5 flex justify-between items-center">
          <span className="text-slate-600 font-bold text-lg">Tổng cộng</span>
          <span className="text-3xl font-black text-blue-600">{total().toLocaleString('vi-VN')}đ</span>
        </div>
      </div>

      {/* Nút đặt hàng */}
      <Link
        href={{ pathname: '/checkout', query: { note } }}
        className="block w-full bg-blue-500 hover:bg-blue-400 text-white text-center font-semibold py-4 rounded-2xl transition text-lg"
      >
        Đặt hàng →
      </Link>
    </main>
    </div>
  )
}