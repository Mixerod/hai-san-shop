'use client'
import Link from 'next/link'
import { ArrowLeft, Phone, MapPin, CreditCard, QrCode } from 'lucide-react'

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Back button */}
      <div className="absolute top-8 left-4 sm:left-8 z-10">
        <Link 
          href="/" 
          className="group flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Trang chủ
        </Link>
      </div>

      <div className="w-full max-w-5xl relative z-10 py-12">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Thông tin liên hệ</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Hỗ trợ giải đáp thắc mắc, tư vấn đặt hàng và xử lý giao nhận dành riêng cho đồng nghiệp trong công ty.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          
          {/* Thông tin Text */}
          <div className="space-y-6 flex flex-col justify-center">
            
            {/* Phone */}
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800/80 p-6 rounded-3xl flex gap-5 hover:border-gray-700/80 transition-colors animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="w-14 h-14 shrink-0 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner">
                <Phone className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Điện thoại hỗ trợ</h3>
                <p className="text-gray-400 text-sm mb-2">Gọi trực tiếp hoặc nhắn tin SMS/Zalo để được tư vấn nhanh nhất.</p>
                <a href="tel:0964671009" className="text-blue-400 font-mono text-xl font-bold hover:text-blue-300 transition-colors tracking-wide">
                  0964.671.009
                </a>
              </div>
            </div>

            {/* Address */}
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800/80 p-6 rounded-3xl flex gap-5 hover:border-gray-700/80 transition-colors animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
              <div className="w-14 h-14 shrink-0 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-inner">
                <MapPin className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Địa điểm nhận hàng</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Trực tiếp tại văn phòng công ty. Chỉ áp dụng cho các <strong className="text-gray-300">đơn hàng tổng dưới 5kg</strong> nhằm chia sẻ cước phí vận chuyển. Vui lòng ghi chú thời gian nhận hàng trong mục Thanh toán.
                </p>
              </div>
            </div>

            {/* Bank */}
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800/80 p-6 rounded-3xl flex gap-5 hover:border-gray-700/80 transition-colors animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <div className="w-14 h-14 shrink-0 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20 shadow-inner">
                <CreditCard className="w-6 h-6 text-green-400" />
              </div>
              <div className="w-full">
                <h3 className="text-lg font-bold text-white mb-2">Chuyển khoản thanh toán</h3>
                <div className="bg-gray-950/80 p-4 rounded-2xl border border-gray-800 shadow-inner">
                  <p className="text-sm text-gray-500 mb-1">Ngân hàng Agribank</p>
                  <p className="font-mono text-white text-xl tracking-widest font-semibold mb-1">4801205175150</p>
                  <p className="text-green-400 font-bold tracking-wide">LÊ MINH QUYẾT</p>
                </div>
              </div>
            </div>

          </div>

          {/* Zalo QR Code Area */}
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800/80 p-8 rounded-3xl flex flex-col items-center justify-center text-center hover:border-gray-700/80 transition-colors animate-in fade-in slide-in-from-right-8 duration-700 delay-300 h-full">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 mb-6 shadow-inner">
              <QrCode className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Kết nối Zalo cá nhân</h3>
            <p className="text-gray-400 text-sm mb-8 px-4">
              Mở ứng dụng Zalo và quét mã QR bên dưới để kết nối, theo dõi trạng thái đơn hàng và nhận thông báo ưu đãi nội bộ nhanh chóng.
            </p>
            
            {/* Vùng ảnh QR Placeholder */}
            <div className="bg-gray-950 p-4 rounded-3xl border border-gray-800 shadow-2xl inline-block">
              <div className="w-56 h-56 sm:w-72 sm:h-72 bg-gray-900/50 border-2 border-dashed border-gray-700 rounded-2xl flex items-center justify-center relative overflow-hidden group">
                <div className="flex flex-col items-center justify-center text-gray-600 gap-2 absolute z-10 group-hover:opacity-0 transition-opacity duration-300">
                  <QrCode className="w-10 h-10 opacity-50" />
                  <p className="text-xs font-mono px-6 text-center">
                    Gắn file ảnh thật vào:<br/> <span className="text-blue-500">/public/images/zalo-qr.png</span>
                  </p>
                </div>
                
                {/* 
                  Thẻ <img> chuẩn bị sẵn. 
                  Khi nào bỏ ảnh "zalo-qr.png" vào thư mục "public/images/", hình sẽ tự động hiển thị 
                */}
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src="/images/zalo-qr.png" 
                  alt="Mã QR Zalo Lê Minh Quyết" 
                  className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-100 transition-opacity duration-300 z-20"
                  onError={(e) => {
                    // Tạm thời ẩn hình nếu trình duyệt không tìm thấy file
                    (e.target as HTMLImageElement).style.opacity = '0';
                  }}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
