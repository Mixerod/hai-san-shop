"use client"

import { useState, useEffect, useRef } from 'react'
import { Truck, CreditCard, Fish } from 'lucide-react'
import HeroSection from '@/components/HeroSection'

export default function HomePage() {
  const [activePolicy, setActivePolicy] = useState<string | null>(null)
  const [hasAutoOpened, setHasAutoOpened] = useState(false)
  const [copyToast, setCopyToast] = useState('')
  const sectionRef = useRef<HTMLElement>(null)
  
  const touchStartTimes = useRef<Record<string, number>>({})
  const activeBeforeTouch = useRef<Record<string, boolean>>({})
  const touchMoved = useRef<Record<string, boolean>>({})
  const touchStartX = useRef<Record<string, number>>({})
  const touchStartY = useRef<Record<string, number>>({})
  const holdTimer = useRef<Record<string, NodeJS.Timeout | null>>({})
  const isHolding = useRef<Record<string, boolean>>({})

  // Staggered auto-open sequence on scroll (mobile only)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const isMobile = window.innerWidth < 768
    if (!isMobile) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasAutoOpened) {
          setHasAutoOpened(true)
          
          // Beautiful staggered reveal sequence
          setActivePolicy('delivery')
          
          const t1 = setTimeout(() => {
            setActivePolicy('payment')
          }, 2000)
          
          const t2 = setTimeout(() => {
            setActivePolicy('quality')
          }, 4000)

          const t3 = setTimeout(() => {
            setActivePolicy(null)
          }, 6000)

          return () => {
            clearTimeout(t1)
            clearTimeout(t2)
            clearTimeout(t3)
          }
        }
      })
    }, { threshold: 0.2 })

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [hasAutoOpened])

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchStartTimes.current[id] = Date.now()
    touchMoved.current[id] = false
    touchStartX.current[id] = e.touches[0].clientX
    touchStartY.current[id] = e.touches[0].clientY
    activeBeforeTouch.current[id] = activePolicy === id
    isHolding.current[id] = false

    if (holdTimer.current[id]) clearTimeout(holdTimer.current[id])
    holdTimer.current[id] = setTimeout(() => {
      if (!touchMoved.current[id]) {
        setActivePolicy(id)
        isHolding.current[id] = true
      }
    }, 350)
  }

  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    const dx = e.touches[0].clientX - (touchStartX.current[id] || 0)
    const dy = e.touches[0].clientY - (touchStartY.current[id] || 0)
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      touchMoved.current[id] = true
      if (holdTimer.current[id]) {
        clearTimeout(holdTimer.current[id])
        holdTimer.current[id] = null
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent, id: string) => {
    // Ngăn chặn sự kiện onClick mô phỏng từ trình duyệt gây double-trigger
    e.preventDefault()

    if (holdTimer.current[id]) {
      clearTimeout(holdTimer.current[id])
      holdTimer.current[id] = null
    }

    if (touchMoved.current[id]) {
      return // Đang cuộn màn hình, không kích hoạt
    }

    if (isHolding.current[id]) {
      setActivePolicy(null)
      isHolding.current[id] = false
    } else {
      // Nhấp nhanh -> Đổi trạng thái
      setActivePolicy(prev => prev === id ? null : id)
    }
  }

  const handleCopyPayment = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText('4801205175150')
    setCopyToast('Đã copy Số tài khoản Agribank: 4801205175150 & số điện thoại Momo: 0964671009!')
    setTimeout(() => setCopyToast(''), 3000)
  }

  return (
    <div className="w-full">
      {/* ── Hero Banner ── */}
      <HeroSection />

      {/* ── Chính sách đặc biệt ── */}
      <section 
        ref={sectionRef}
        className="w-full bg-slate-50 border-y border-slate-200 py-10 px-6 flex flex-col items-center"
      >
        <div className="w-full max-w-3xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-blue-800 mb-1">Chính sách đặc biệt</h2>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block md:hidden">
              👉 chạm hoặc giữ đè để xem chi tiết
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Delivery */}
            <div 
              onTouchStart={(e) => handleTouchStart(e, 'delivery')}
              onTouchMove={(e) => handleTouchMove(e, 'delivery')}
              onTouchEnd={(e) => handleTouchEnd(e, 'delivery')}
              onClick={() => {
                if (window.innerWidth >= 768) return
                setActivePolicy(prev => prev === 'delivery' ? null : 'delivery')
              }}
              className={`group flex flex-col items-center text-center cursor-pointer p-4 rounded-2xl transition-all duration-300 select-none ${
                activePolicy === 'delivery' 
                  ? 'bg-blue-100/70 shadow-inner scale-98 border border-blue-200/50' 
                  : 'hover:bg-blue-100/50 border border-transparent'
              }`}
            >
              <Truck className={`w-10 h-10 text-blue-600 mb-3 transition-transform duration-300 ${
                activePolicy === 'delivery' ? 'scale-110 rotate-3' : 'group-hover:scale-110'
              }`} />
              <h3 className="font-semibold text-blue-800 text-sm">Giao Hàng</h3>
              <div 
                className={`overflow-hidden transition-all duration-550 text-xs text-slate-650 mt-2 leading-relaxed ${
                  activePolicy === 'delivery' ? 'max-h-48 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0 group-hover:max-h-48 group-hover:opacity-100 group-hover:mt-2'
                }`}
              >
                Đơn hàng tổng dưới 5kg: Nhận trực tiếp tại công ty với phí ship siêu rẻ chỉ{' '}
                <strong className="text-blue-600 font-semibold">~5.000đ – 10.000đ</strong>{' '}
                (chia đều theo chuyến). Đơn lớn (≥5kg) hỗ trợ Viettel Post tận nhà.
              </div>
            </div>

            {/* Payment */}
            <div 
              onTouchStart={(e) => handleTouchStart(e, 'payment')}
              onTouchMove={(e) => handleTouchMove(e, 'payment')}
              onTouchEnd={(e) => handleTouchEnd(e, 'payment')}
              onClick={() => {
                if (window.innerWidth >= 768) return
                setActivePolicy(prev => prev === 'payment' ? null : 'payment')
              }}
              className={`group flex flex-col items-center text-center cursor-pointer p-4 rounded-2xl transition-all duration-300 select-none ${
                activePolicy === 'payment' 
                  ? 'bg-blue-100/70 shadow-inner scale-98 border border-blue-200/50' 
                  : 'hover:bg-blue-100/50 border border-transparent'
              }`}
            >
              <CreditCard className={`w-10 h-10 text-blue-600 mb-3 transition-transform duration-300 ${
                activePolicy === 'payment' ? 'scale-110 rotate-3' : 'group-hover:scale-110'
              }`} />
              <h3 className="font-semibold text-blue-800 text-sm">Thanh Toán</h3>
              <div 
                className={`overflow-hidden transition-all duration-550 text-xs text-slate-650 mt-2 leading-relaxed ${
                  activePolicy === 'payment' ? 'max-h-48 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0 group-hover:max-h-48 group-hover:opacity-100 group-hover:mt-2'
                }`}
              >
                Linh hoạt COD hoặc chuyển khoản nhanh chóng, uy tín 100%. Thông tin tài khoản (chạm để copy): <br />
                <span 
                  onClick={handleCopyPayment}
                  onTouchEnd={handleCopyPayment}
                  className="font-bold text-blue-600 bg-blue-50 border border-blue-200/50 rounded px-1.5 py-0.5 mt-1 inline-block cursor-pointer hover:bg-blue-100 hover:text-blue-700 active:scale-95 transition-all select-all"
                >
                  Agribank: 4801205175150
                </span> <br />
                <span 
                  onClick={handleCopyPayment}
                  onTouchEnd={handleCopyPayment}
                  className="font-bold text-blue-600 bg-blue-50 border border-blue-200/50 rounded px-1.5 py-0.5 mt-1 inline-block cursor-pointer hover:bg-blue-100 hover:text-blue-700 active:scale-95 transition-all select-all"
                >
                  LÊ MINH QUYẾT / Momo: 0964671009
                </span>
              </div>
            </div>

            {/* Quality */}
            <div 
              onTouchStart={(e) => handleTouchStart(e, 'quality')}
              onTouchMove={(e) => handleTouchMove(e, 'quality')}
              onTouchEnd={(e) => handleTouchEnd(e, 'quality')}
              onClick={() => {
                if (window.innerWidth >= 768) return
                setActivePolicy(prev => prev === 'quality' ? null : 'quality')
              }}
              className={`group flex flex-col items-center text-center cursor-pointer p-4 rounded-2xl transition-all duration-300 select-none ${
                activePolicy === 'quality' 
                  ? 'bg-blue-100/70 shadow-inner scale-98 border border-blue-200/50' 
                  : 'hover:bg-blue-100/50 border border-transparent'
              }`}
            >
              <Fish className={`w-10 h-10 text-blue-600 mb-3 transition-transform duration-300 ${
                activePolicy === 'quality' ? 'scale-110 rotate-3' : 'group-hover:scale-110'
              }`} />
              <h3 className="font-semibold text-blue-800 text-sm">Chất Lượng</h3>
              <div 
                className={`overflow-hidden transition-all duration-550 text-xs text-slate-650 mt-2 leading-relaxed ${
                  activePolicy === 'quality' ? 'max-h-48 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0 group-hover:max-h-48 group-hover:opacity-100 group-hover:mt-2'
                }`}
              >
                Hàng đảm bảo chất lượng, không có hàn the, không sử dụng chất độn vào sản phẩm.
                Sản phẩm được làm 100% từ hải sản tươi ngon tuyển chọn kỹ lưỡng.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Lời cảm ơn ── */}
      <section className="w-full py-10 px-6 flex flex-col items-center justify-center text-center bg-white border-t border-slate-50">
        <div className="w-full space-y-2">
          <p className="text-slate-500 italic text-sm sm:text-base leading-relaxed">
            "Gia đình em xin chân thành cảm ơn mọi người đã tin tưởng và ghé ủng hộ shop của mẹ em.
          </p>
          <p className="text-slate-500 italic text-sm sm:text-base leading-relaxed">
            Sự ủng hộ của mọi người là niềm vui và động lực để mẹ em mang đến những món hải sản tươi ngon nhất."
          </p>
          <p className="text-blue-600 font-bold uppercase tracking-widest text-xs pt-2">Trân trọng cảm ơn!</p>
        </div>
      </section>

      {/* Reusable Toast Notification */}
      {copyToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-2xl z-[99] border border-blue-500/30 flex items-center gap-2.5 font-bold animate-in fade-in slide-in-from-bottom-5 duration-300 w-[90%] max-w-sm text-center justify-center">
          <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 animate-bounce">⚡</span>
          <span>{copyToast}</span>
        </div>
      )}
    </div>
  )
}