import { Truck, CreditCard, Fish } from 'lucide-react'
import HeroSection from '@/components/HeroSection'

export default function HomePage() {
  return (
    <div className="w-full">

      {/* ── Hero Banner ── Dynamic client-side interactive component ── */}
      <HeroSection />
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
                Linh hoạt COD hoặc chuyển khoản nhanh chóng, uy tín 100%. Thông tin tài khoản: <br />
                <span className="font-bold text-blue-600">Agribank: 4801205175150</span> <br />
                <span className="font-bold text-blue-600">LÊ MINH QUYẾT / Momo: 0964671009</span>
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