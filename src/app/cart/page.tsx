'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/store/cart'
import { Loader2 } from 'lucide-react'

export default function CartPage() {
  const router = useRouter()
  const { setIsOpen } = useCart()

  useEffect(() => {
    // Open the cart drawer
    setIsOpen(true)
    // Seamlessly redirect to the product listing page
    router.replace('/products')
  }, [router, setIsOpen])

  return (
    <div className="w-full min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glowing gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20 animate-pulse" />

      <div className="flex flex-col items-center gap-4 relative z-10 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center border border-cyan-400/20 shadow-xl shadow-blue-500/10">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <h2 className="text-xl font-extrabold text-white tracking-tight mt-2">
          Đang mở giỏ hàng...
        </h2>
        <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase max-w-xs leading-relaxed animate-pulse">
          Đang chuyển hướng bạn đến danh sách đặc sản Phan Thiết
        </p>
      </div>
    </div>
  )
}