'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ShieldCheck } from 'lucide-react'

export default function HeroSection() {
  return (
    <section
      className="w-full relative overflow-hidden min-h-[90vh] flex flex-col items-center justify-center text-center px-4 py-24"
    >
      {/* Custom CSS for ocean wave sweeps and shimmering lights */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ocean-shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes wave-crest-sweep {
          0% { transform: translateX(-150%) skewX(-30deg); }
          30% { transform: translateX(250%) skewX(-30deg); }
          100% { transform: translateX(250%) skewX(-30deg); }
        }
        @keyframes sweep-text {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .ocean-wave-gradient {
          background: linear-gradient(
            135deg,
            rgba(14, 165, 233, 0.05) 0%,
            rgba(255, 255, 255, 0.02) 25%,
            rgba(56, 189, 248, 0.16) 50%,
            rgba(255, 255, 255, 0.02) 75%,
            rgba(14, 165, 233, 0.05) 100%
          );
          background-size: 400% 400%;
          animation: ocean-shimmer 12s infinite ease-in-out;
        }
        .animate-wave-crest {
          background: linear-gradient(
            to right,
            rgba(56, 189, 248, 0) 0%,
            rgba(186, 230, 253, 0.08) 20%,
            rgba(255, 255, 255, 0.22) 50%,
            rgba(186, 230, 253, 0.08) 80%,
            rgba(56, 189, 248, 0) 100%
          );
          animation: wave-crest-sweep 8s infinite ease-in-out;
        }
        .shimmer-text-ocean-blue {
          background: linear-gradient(
            120deg,
            #67e8f9 0%,
            #22d3ee 25%,
            #e0f7fa 50%,
            #22d3ee 75%,
            #67e8f9 100%
          );
          background-size: 200% auto;
          animation: sweep-text 6s infinite linear;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .shimmer-text-orange {
          background: linear-gradient(
            120deg,
            #fb923c 30%,
            #fb923c 42%,
            #ffedd5 50%,
            #fb923c 58%,
            #fb923c 70%
          );
          background-size: 200% auto;
          animation: sweep-text 6s infinite linear;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}} />

      {/* Ảnh nền với độ rực rỡ và sắc nét 100% */}
      <Image
        src="/images/seafood.jpg"
        fill
        style={{ objectFit: 'cover' }}
        className="-z-20 brightness-110 contrast-105"
        alt="Hải sản tươi ngon"
        priority
        quality={100}
      />

      {/* Lớp phủ siêu trong suốt để bảo toàn màu sắc nguyên bản của hải sản */}
      <div
        className="-z-10 absolute inset-0 bg-gradient-to-b from-blue-950/25 via-transparent to-blue-950/35"
      />

      {/* Hiệu ứng sóng biển lấp lánh (Ocean Wave Gradient Shimmer) */}
      <div
        className="-z-10 absolute inset-0 ocean-wave-gradient pointer-events-none"
      />

      {/* Đường sóng sáng quét qua nền (Ocean Wave Crest Sweeper) */}
      <div className="-z-10 absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 animate-wave-crest pointer-events-none" />
      </div>

      {/* Đốm sáng huyền ảo (Pulsing ocean water lights) */}
      <div className="-z-10 absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-400/12 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-300/8 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Badge - Tối ưu nổi bật tối đa với hiệu ứng phát sáng Cyan */}
      <div 
        className="relative z-10 inline-flex items-center gap-3 rounded-full bg-blue-950/95 backdrop-blur-md border border-cyan-400/60 text-cyan-300 text-xs font-extrabold uppercase tracking-widest mb-8 shadow-[0_4px_25px_rgba(34,211,238,0.25)] hover:border-cyan-300 hover:shadow-[0_4px_30px_rgba(34,211,238,0.45)] transition-all duration-300"
        style={{ padding: '12px 36px' }}
      >
        <ShieldCheck className="w-4 h-4 text-cyan-400 animate-pulse" />
        Hải Sản Sạch – Tươi Ngon
      </div>

      {/* Tiêu đề đặc sắc biển tối màu với viền sáng neon lung linh bảo toàn độ tương phản tuyệt đối */}
      <h1 className="relative z-10 text-5xl sm:text-7xl font-extrabold leading-tight max-w-4xl mx-auto mb-4 filter drop-shadow-[0_2px_4px_rgba(2,6,23,0.98)] drop-shadow-[0_4px_16px_rgba(2,6,23,0.95)]">
        <span className="shimmer-text-ocean-blue">Đặc Sản Miền Biển</span>
      </h1>
      <h2 className="relative z-10 text-3xl sm:text-5xl font-bold mb-8 filter drop-shadow-[0_4px_12px_rgba(8,18,45,0.9)] drop-shadow-[0_2px_4px_rgba(8,18,45,0.6)]">
        <span className="shimmer-text-orange">Dành Riêng Cho Bạn</span>
      </h2>

      {/* Mô tả trong khung kính mờ cao cấp để chữ 100% nổi bật và siêu dễ đọc */}
      <div className="relative z-10 bg-slate-950/65 backdrop-blur-md border border-cyan-500/20 px-6 py-4.5 rounded-2xl max-w-2xl mx-auto mb-10 shadow-[0_8px_32px_rgba(8,18,45,0.6)]">
        <p className="text-base sm:text-lg text-white leading-relaxed font-semibold">
          Cung cấp cá tươi, cá khô, chả cá, chả mực chất lượng cao trực tiếp từ cảng cá. Giải pháp bữa ăn sạch, tiện lợi cho mọi người.
        </p>
      </div>

      {/* Nút CTA */}
      <div className="relative z-10">
        <Link
          href="/products"
          className="inline-flex items-center gap-3 bg-orange-500 hover:bg-orange-400 active:scale-95 text-white text-xl font-bold rounded-2xl transition-all shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 group"
          style={{ padding: '18px 48px' }}
        >
          Đặt ngay
          <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </section>
  )
}
