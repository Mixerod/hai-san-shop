'use client'

import { useEffect } from 'react'
import { useCart } from '@/store/cart'

export default function CartExitGuard() {
  const { items } = useCart()

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Chỉ kích hoạt nếu có hàng trong giỏ
      if (items.length > 0) {
        // Ghi chú: Các trình duyệt hiện đại thường bỏ qua message tùy chỉnh 
        // và hiển thị thông báo mặc định của hệ thống để bảo mật.
        const message = 'Bạn vẫn còn sản phẩm trong giỏ hàng chưa đặt. Bạn có chắc muốn rời đi không?'
        e.preventDefault()
        e.returnValue = message
        return message
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [items.length])

  return null
}
