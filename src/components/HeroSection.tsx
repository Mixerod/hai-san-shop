'use client'

import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'

export default function HeroSection() {
  return (
    <section
      className="w-full relative overflow-hidden min-h-[90vh] flex flex-col items-center justify-center text-center px-4 py-24"
      style={{ isolation: 'isolate' }}
    >
      {/* CSS animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes wave-crest-sweep {
          0%   { transform: translateX(-150%) skewX(-30deg); opacity: 0; }
          10%  { opacity: 1; }
          30%  { transform: translateX(250%) skewX(-30deg); opacity: 0; }
          100% { transform: translateX(250%) skewX(-30deg); opacity: 0; }
        }
        @keyframes sweep-text {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes sparkle-float {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.7; }
          50%       { transform: translateY(-12px) scale(1.1); opacity: 1; }
        }
        .animate-wave-crest {
          background: linear-gradient(
            to right,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.08) 20%,
            rgba(255,255,255,0.35) 50%,
            rgba(255,255,255,0.08) 80%,
            rgba(255,255,255,0) 100%
          );
          animation: wave-crest-sweep 6s infinite ease-in-out;
        }
        .shimmer-text-ocean-blue {
          background: linear-gradient(
            120deg,
            #67e8f9 0%, #22d3ee 25%, #e0f7fa 50%, #22d3ee 75%, #67e8f9 100%
          );
          background-size: 200% auto;
          animation: sweep-text 6s infinite linear;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .shimmer-text-orange {
          background: linear-gradient(
            120deg,
            #fb923c 30%, #fb923c 42%, #ffedd5 50%, #fb923c 58%, #fb923c 70%
          );
          background-size: 200% auto;
          animation: sweep-text 6s infinite linear;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .sparkle-dot {
          animation: sparkle-float var(--dur, 3s) infinite ease-in-out;
          animation-delay: var(--delay, 0s);
        }
      `}} />

      {/* Ảnh nền — 100% opacity, không filter tối */}
      <img
        src="/images/seafood.jpg"
        style={{ objectFit: 'cover', zIndex: -20, position: 'absolute', width: '100%', height: '100%', inset: 0 }}
        alt="Hải sản tươi ngon"
      />

      {/* Hiệu ứng ánh sáng lấp lánh quét qua — không che ảnh */}
      <div style={{ position: 'absolute', inset: 0, zIndex: -10, overflow: 'hidden' }} className="pointer-events-none">
        <div className="absolute inset-0 animate-wave-crest" />
        {/* Second crest with delay */}
        <div className="absolute inset-0 animate-wave-crest" style={{ animationDelay: '3s' }} />
      </div>

      {/* Đốm sáng lấp lánh nhẹ — không che ảnh */}
      <div style={{ position: 'absolute', inset: 0, zIndex: -10, overflow: 'hidden' }} className="pointer-events-none">
        <div
          className="sparkle-dot absolute top-[20%] left-[15%] w-32 h-32 rounded-full blur-2xl"
          style={{ background: 'rgba(255,255,255,0.18)', '--dur': '4s', '--delay': '0s' } as React.CSSProperties}
        />
        <div
          className="sparkle-dot absolute top-[60%] right-[12%] w-40 h-40 rounded-full blur-3xl"
          style={{ background: 'rgba(255,255,255,0.12)', '--dur': '5s', '--delay': '1.5s' } as React.CSSProperties}
        />
        <div
          className="sparkle-dot absolute bottom-[15%] left-[40%] w-24 h-24 rounded-full blur-2xl"
          style={{ background: 'rgba(255,255,255,0.2)', '--dur': '3.5s', '--delay': '0.8s' } as React.CSSProperties}
        />
        <div
          className="sparkle-dot absolute top-[35%] right-[30%] w-20 h-20 rounded-full blur-xl"
          style={{ background: 'rgba(255,255,255,0.15)', '--dur': '4.5s', '--delay': '2s' } as React.CSSProperties}
        />
      </div>

      {/* Badge */}
      <div
        className="relative z-10 inline-flex items-center gap-3 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-400/60 text-cyan-300 text-xs font-extrabold uppercase tracking-widest mb-8 shadow-[0_4px_25px_rgba(34,211,238,0.25)] hover:border-cyan-300 transition-all duration-300"
        style={{ padding: '12px 36px' }}
      >
        <ShieldCheck className="w-4 h-4 text-cyan-400 animate-pulse" />
        Hải Sản Sạch – Tươi Ngon
      </div>

      {/* Tiêu đề — drop-shadow đậm để nổi bật trên nền ảnh sáng */}
      <h1 className="relative z-10 text-5xl sm:text-7xl font-extrabold leading-tight max-w-4xl mx-auto mb-4"
        style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9)) drop-shadow(0 4px 24px rgba(0,0,0,0.8))' }}
      >
        <span className="shimmer-text-ocean-blue">Đặc Sản Miền Biển</span>
      </h1>
      <h2 className="relative z-10 text-3xl sm:text-5xl font-bold mb-8"
        style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9)) drop-shadow(0 4px 20px rgba(0,0,0,0.8))' }}
      >
        <span className="shimmer-text-orange">Dành Riêng Cho Bạn</span>
      </h2>

      {/* Mô tả — khung kính mờ nhẹ để đọc được trên ảnh sáng */}
      <div className="relative z-10 bg-slate-950/70 backdrop-blur-md border border-white/10 px-6 rounded-2xl max-w-2xl mx-auto mb-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        style={{ padding: '18px 24px' }}
      >
        <p className="text-base sm:text-lg text-white leading-relaxed font-semibold">
          Cung cấp cá tươi, cá khô, chả cá, chả mực chất lượng cao trực tiếp từ cảng cá. Giải pháp bữa ăn sạch, tiện lợi cho mọi người.
        </p>
      </div>

      {/* Nút CTA */}
      <div className="relative z-10">
        <Link
          href="/products"
          className="inline-flex items-center gap-3 bg-orange-500 hover:bg-orange-400 active:scale-95 text-white text-xl font-bold rounded-2xl transition-all shadow-2xl shadow-orange-500/40 hover:shadow-orange-500/60 group"
          style={{ padding: '18px 48px' }}
        >
          Mua ngay
          <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </section>
  )
}
