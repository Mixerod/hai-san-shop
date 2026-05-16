import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ShieldCheck, Truck, CreditCard, Fish } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="w-full">

      {/* ── Hero Banner ── High-impact immersive section ── */}
      <section className="w-full relative overflow-hidden px-4 py-24 md:py-32 min-h-[85vh] flex flex-col items-center justify-center text-center space-y-10">
        <Image 
          src="/images/seafood.jpg" 
          fill 
          style={{ objectFit: 'cover' }} 
          className="opacity-20 -z-10" 
          alt="Fresh seafood background"
          priority
        />

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-blue-100 text-blue-600 text-sm font-semibold animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
          <ShieldCheck className="w-4 h-4" />
          Hải Sản Sạch – Tươi Ngon
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold text-blue-600 tracking-tight leading-tight max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 relative z-10">
          Đặc Sản Miền Biển <br className="hidden sm:block" />
          <span className="mt-2 inline-block">
            Dành Riêng Cho Bạn
          </span>
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-slate-600 max-w-4xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 relative z-10">
          Cung cấp cá tươi, cá khô, chả cá, chả mực chất lượng cao trực tiếp từ cảng cá. <br className="hidden md:block" />
          Giải pháp bữa ăn sạch, tiện lợi cho mọi người.
        </p>

        <div className="pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 relative z-10">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-12 py-5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xl font-bold rounded-2xl transition-all shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 group"
          >
            Mua ngay
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ── Chính sách đặc biệt ── Tightened Layout ── */}
      <section className="w-full bg-slate-50 border-y border-slate-200 py-10 px-6 flex flex-col items-center">
        <div className="w-full max-w-3xl">

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-blue-800 mb-1">Chính sách đặc biệt</h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Delivery */}
            <div className="group flex flex-col items-center text-center cursor-pointer p-4 rounded-xl hover:bg-blue-100/50 transition-all duration-300">
              <Truck className="w-10 h-10 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-blue-800 text-sm">Giao Hàng</h3>
              <div className="max-h-0 group-hover:max-h-48 overflow-hidden transition-all duration-500 text-xs text-slate-600 mt-2 leading-relaxed">
                Đơn hàng tổng dưới 5kg: Nhận trực tiếp tại công ty với phí ship siêu rẻ chỉ{' '}
                <strong className="text-blue-600 font-semibold">~5.000đ – 10.000đ</strong>{' '}
                (chia đều theo chuyến). Đơn lớn (≥5kg) hỗ trợ Viettel Post tận nhà.
              </div>
            </div>

            {/* Payment */}
            <div className="group flex flex-col items-center text-center cursor-pointer p-4 rounded-xl hover:bg-blue-100/50 transition-all duration-300">
              <CreditCard className="w-10 h-10 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-blue-800 text-sm">Thanh Toán</h3>
              <div className="max-h-0 group-hover:max-h-48 overflow-hidden transition-all duration-500 text-xs text-slate-600 mt-2 leading-relaxed">
                Linh hoạt COD hoặc chuyển khoản nhanh chóng, uy tín 100%. Thông tin tài khoản: <br/> 
                <span className="font-bold text-blue-600">Agribank: 4801205175150 - LÊ MINH QUYẾT</span>
              </div>
            </div>

            {/* Quality */}
            <div className="group flex flex-col items-center text-center cursor-pointer p-4 rounded-xl hover:bg-blue-100/50 transition-all duration-300">
              <Fish className="w-10 h-10 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-blue-800 text-sm">Chất Lượng</h3>
              <div className="max-h-0 group-hover:max-h-48 overflow-hidden transition-all duration-500 text-xs text-slate-600 mt-2 leading-relaxed">
                Hàng đảm bảo chất lượng, không có hàn the, không sử dụng chất độn vào sản phẩm. 
                Sản phẩm được làm 100% từ hải sản tươi ngon tuyển chọn kỹ lưỡng.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Lời cảm ơn ── Full Width 2-Line Layout ── */}
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

    </div>
  )
}