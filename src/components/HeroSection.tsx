'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

export default function HeroSection() {
  const [mouse, setMouse] = useState({ x: 50, y: 50 })
  const [isHovered, setIsHovered] = useState(false)

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setMouse({ x, y })
  }

  return (
    <section
      className="w-full relative overflow-hidden min-h-[90vh] flex flex-col items-center justify-center text-center px-4 py-24"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setMouse({ x: 50, y: 50 })
      }}
    >
      {/* Custom CSS for sweeping light and premium text-shadow */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sweep-bg {
          0% { transform: translateX(-150%) skewX(-20deg); }
          30% { transform: translateX(250%) skewX(-20deg); }
          100% { transform: translateX(250%) skewX(-20deg); }
        }
        @keyframes sweep-text {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-sweep-bg {
          animation: sweep-bg 8s infinite ease-in-out;
        }
        .shimmer-text-white {
          background: linear-gradient(
            120deg,
            #ffffff 30%,
            #ffffff 42%,
            #93c5fd 50%,
            #ffffff 58%,
            #ffffff 70%
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

      {/* Ảnh nền */}
      <Image
        src="/images/seafood.jpg"
        fill
        style={{ objectFit: 'cover' }}
        className="-z-20"
        alt="Hải sản tươi ngon"
        priority
        quality={100}
      />

      {/* Lớp tối phủ — có lỗ sáng theo chuột */}
      <div
        className="-z-10 absolute inset-0 transition-all duration-500 bg-gradient-to-b from-blue-950/40 via-blue-950/15 to-blue-950/50"
      />
      <div
        className="-z-10 absolute inset-0 pointer-events-none transition-all duration-300"
        style={{
          background: `radial-gradient(circle ${isHovered ? '280px' : '200px'} at ${mouse.x}% ${mouse.y}%, rgba(0,0,0,0.1) 0%, rgba(15,23,62,0.65) 55%, rgba(10,15,50,0.92) 100%)`
        }}
      />

      {/* Luồng ánh sáng quét qua nền */}
      <div className="-z-10 absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 bottom-0 left-0 w-[40%] bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none animate-sweep-bg" />
      </div>

      {/* Hiệu ứng ánh sáng lấp lánh */}
      <div className="-z-10 absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-400/15 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-300/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Badge - Tối ưu nổi bật tối đa với hiệu ứng phát sáng Cyan (Tăng khoảng cách padding thoáng đãng bằng inline style) */}
      <div 
        className="relative z-10 inline-flex items-center gap-3 rounded-full bg-blue-950/95 backdrop-blur-md border border-cyan-400/60 text-cyan-300 text-xs font-extrabold uppercase tracking-widest mb-8 shadow-[0_4px_25px_rgba(34,211,238,0.25)] hover:border-cyan-300 hover:shadow-[0_4px_30px_rgba(34,211,238,0.45)] transition-all duration-300"
        style={{ padding: '12px 36px' }}
      >
        <ShieldCheck className="w-4 h-4 text-cyan-400 animate-pulse" />
        Hải Sản Sạch – Tươi Ngon
      </div>

      {/* Tiêu đề */}
      <h1 className="relative z-10 text-5xl sm:text-7xl font-extrabold leading-tight max-w-4xl mx-auto mb-4 filter drop-shadow-[0_4px_16px_rgba(8,18,45,0.95)] drop-shadow-[0_2px_4px_rgba(8,18,45,0.6)]">
        <span className="shimmer-text-white">Đặc Sản Miền Biển</span>
      </h1>
      <h2 className="relative z-10 text-3xl sm:text-5xl font-bold mb-8 filter drop-shadow-[0_4px_12px_rgba(8,18,45,0.9)] drop-shadow-[0_2px_4px_rgba(8,18,45,0.6)]">
        <span className="shimmer-text-orange">Dành Riêng Cho Bạn</span>
      </h2>

      {/* Mô tả */}
      <p className="relative z-10 text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed mb-10 filter drop-shadow-[0_2px_4px_rgba(8,18,45,0.8)]">
        Cung cấp cá tươi, cá khô, chả cá, chả mực chất lượng cao trực tiếp từ cảng cá.
        Giải pháp bữa ăn sạch, tiện lợi cho mọi người.
      </p>

      {/* Nút CTA - Tăng padding thoáng đãng bằng inline style */}
      <div className="relative z-10">
        <Link
          href="/products"
          className="inline-flex items-center gap-3 bg-orange-500 hover:bg-orange-400 active:scale-95 text-white text-xl font-bold rounded-2xl transition-all shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 group"
          style={{ padding: '18px 48px' }}
        >
          Mua ngay
          <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </section>
  )
}
