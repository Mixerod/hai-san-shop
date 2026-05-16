import Link from 'next/link'
import { ArrowRight, ShieldCheck, Truck, CreditCard, Fish } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="w-full">

      {/* ── Hero Banner ── full width, content centered inside ── */}
      <section className="w-full px-4 py-16 md:py-24 flex flex-col items-center text-center space-y-8">

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-blue-100 text-blue-600 text-sm font-semibold animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ShieldCheck className="w-4 h-4" />
          Hải Sản Sạch – Tươi Ngon
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
          Đặc Sản Miền Biển <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500 mt-2 inline-block">
            Dành Riêng Cho Bạn
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 max-w-5xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          Cung cấp cá tươi, cá khô, chả cá, chả mực và các đặc sản biển chất lượng cao trực tiếp từ cảng cá. <br className="hidden md:block" />
          Giải pháp bữa ăn sạch, tiện lợi cho mọi người.
        </p>

        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 group"
          >
            Mua ngay
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ── Chính sách đặc biệt ── full-width background band ── */}
      <section className="w-full bg-slate-100/70 border-y border-slate-200 py-20 px-6 flex flex-col items-center">
        <div className="w-full max-w-6xl">

          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">Chính sách đặc biệt</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Được thiết kế riêng để mang lại sự tiện lợi tối đa cho mọi người trong công ty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Delivery */}
            <div className="bg-white border border-slate-100 shadow-sm hover:shadow-xl p-8 rounded-2xl transition-all duration-300 group flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 mb-6 group-hover:scale-110 transition-transform">
                <Truck className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Giao Hàng Siêu Tiết Kiệm</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Đơn hàng tổng dưới 5kg: Nhận trực tiếp tại công ty với phí ship siêu rẻ chỉ{' '}
                <strong className="text-blue-600 font-semibold">~5.000đ – 10.000đ</strong>{' '}
                (chia đều theo chuyến). Đơn lớn (≥5kg) hỗ trợ Viettel Post tận nhà.
              </p>
            </div>

            {/* Payment */}
            <div className="bg-white border border-slate-100 shadow-sm hover:shadow-xl p-8 rounded-2xl transition-all duration-300 group flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center border border-green-100 mb-6 group-hover:scale-110 transition-transform">
                <CreditCard className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Thanh Toán Dễ Dàng</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Linh hoạt COD hoặc chuyển khoản nhanh chóng, uy tín 100%. Thông tin tài khoản chính chủ:
              </p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 w-full mt-auto">
                <p className="text-xs text-slate-500 mb-1">Ngân hàng Agribank</p>
                <p className="font-mono text-slate-800 font-bold text-sm">4801205175150</p>
                <p className="text-green-600 font-semibold text-sm">LÊ MINH QUYẾT</p>
              </div>
            </div>

            {/* Quality */}
            <div className="bg-white border border-slate-100 shadow-sm hover:shadow-xl p-8 rounded-2xl transition-all duration-300 group flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center border border-purple-100 mb-6 group-hover:scale-110 transition-transform">
                <Fish className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Chất Lượng Đảm Bảo</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Hàng đảm bảo chất lượng, không có hàn the, không sử dụng chất độn vào sản phẩm.
                Sản phẩm được làm 100% từ hải sản tươi ngon tuyển chọn kỹ lưỡng.
              </p>
            </div>

          </div>
        </div>
      </section>
      {/* ── Lời cảm ơn ── */}
      <section className="w-full py-8 px-6 flex flex-col items-center bg-white border-t border-slate-50">
        <div className="w-full max-w-7xl text-center space-y-4">
          <p className="text-slate-500 italic text-sm leading-relaxed">
            "Gia đình em xin chân thành cảm ơn mọi người đã tin tưởng và ghé ủng hộ shop của mẹ em. <br className="hidden md:block" />
            Sự ủng hộ của mọi người là niềm vui và động lực để mẹ em mang đến những món hải sản tươi ngon, sạch sẽ nhất cho mọi người."
          </p>
          <p className="text-blue-600 font-bold uppercase tracking-widest text-xs">Trân trọng cảm ơn!</p>
        </div>
      </section>

    </div>
  )
}