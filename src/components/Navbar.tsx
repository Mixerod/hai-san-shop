'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCart } from '@/store/cart'
import { supabase } from '@/lib/supabase'
import { ShoppingCart, Anchor, User, LogOut, LogIn, Menu, X, Bell } from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { items } = useCart()
  const [hasHydrated, setHasHydrated] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  
  // Realtime Notifications state
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Cửa Ẩn: Lắng nghe phím tắt Ctrl + Shift + / toàn cục
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === '/' || e.key === '?' || e.code === 'Slash')) {
        e.preventDefault()
        router.push('/admin')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  // Hydration state cho Cart để tránh Hydration Mismatch
  useEffect(() => {
    setHasHydrated(true)
  }, [])

  // Theo dõi Auth State realtime từ Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Theo dõi hành động cuộn chuột để làm hẹp Navbar và tăng Blur
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Load and subscribe to notifications
  useEffect(() => {
    async function loadNotifications() {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)
        if (!error && data) {
          setNotifications(data)
          const lastRead = localStorage.getItem('last_read_notification_time') || '0'
          const lastReadTime = new Date(lastRead).getTime()
          const unread = data.filter(n => new Date(n.created_at).getTime() > lastReadTime).length
          setUnreadCount(unread)
        }
      } catch (err) {
        console.error('Failed to load notifications:', err)
      }
    }
    
    loadNotifications()

    // Realtime channel listener
    const channel = supabase
      .channel('realtime_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications(prev => [payload.new, ...prev.slice(0, 4)])
        setUnreadCount(c => c + 1)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications)
    if (!showNotifications) {
      setUnreadCount(0)
      localStorage.setItem('last_read_notification_time', new Date().toISOString())
    }
  }

  const cartItemsCount = items.reduce((acc, item) => acc + item.quantity, 0)

  const baseNavLinks = [
    { name: 'Trang chủ', href: '/' },
    { name: 'Sản phẩm', href: '/products' },
    { name: 'Đơn hàng', href: '/profile?tab=orders' },
    { name: 'Góp ý', href: '/feedback' },
  ]

  // Logic tàng hình: Chỉ hiện nút Quản trị nếu đúng Email admin
  const isAdmin = hasHydrated && session?.user?.email === 'minhquyet08122003@gmail.com'
  
  const navLinks = isAdmin 
    ? [...baseNavLinks, { name: 'Quản trị (Admin)', href: '/admin' }]
    : baseNavLinks

  const isActive = (path: string) => pathname === path

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      isScrolled 
        ? 'bg-slate-950/85 backdrop-blur-lg border-b border-blue-900/30 shadow-[0_10px_30px_rgba(8,18,45,0.6)] py-3.5 sm:py-4' 
        : 'bg-slate-900/95 border-b border-blue-950/40 py-5 sm:py-6'
    }`}>
      {/* Khung viền phát sáng neon siêu mảnh chạy ngang dưới cùng Navbar */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-600 via-cyan-400 to-orange-500 opacity-80" />

      {/* CSS Nhúng cao cấp cho Shimmer và Online dot */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sweep-logo {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-logo-text {
          background: linear-gradient(
            120deg,
            #ffffff 30%,
            #38bdf8 45%,
            #06b6d4 50%,
            #38bdf8 55%,
            #ffffff 70%
          );
          background-size: 200% auto;
          animation: sweep-logo 7s infinite linear;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        @keyframes pulse-glow-cart {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(249, 115, 22, 0); }
        }
        .animate-pulse-glow-cart {
          animation: pulse-glow-cart 2s infinite;
        }
        @keyframes shimmer-auth {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer-auth {
          background: linear-gradient(
            120deg,
            #f97316 20%,
            #fdba74 40%,
            #ffedd5 50%,
            #fdba74 60%,
            #f97316 80%
          );
          background-size: 200% auto;
          animation: shimmer-auth 4s infinite linear;
        }
      `}} />

      <div className="max-w-7xl mx-auto w-full flex justify-between items-center px-4 sm:px-6 lg:px-8">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-800 to-cyan-500 flex items-center justify-center border border-cyan-400/30 group-hover:border-cyan-300 shadow-md group-hover:scale-105 transition-all duration-300">
              <Anchor className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <div className="flex flex-col text-left justify-center py-0.5 select-none">
              <span className="font-black text-xl tracking-wider uppercase shimmer-logo-text leading-[1.2] pb-0.5 whitespace-nowrap">Hải Sản Sạch</span>
              <span className="text-[10px] text-cyan-400 font-semibold tracking-wide uppercase leading-none whitespace-nowrap">Phan Thiết Port</span>
            </div>
          </Link>

          {/* Desktop Nav - Frosted glass links style */}
          <div className="hidden md:flex items-center gap-x-3">
            {navLinks.map((link) => {
              const isLinkActive = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{ padding: '12px 26px' }}
                  className={`rounded-full text-xs font-bold tracking-wide uppercase leading-none transition-all duration-300 border ${
                    isLinkActive
                      ? 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : link.href === '/admin'
                        ? 'text-emerald-400 border-emerald-500/20 hover:text-emerald-300 hover:bg-emerald-950/40 hover:border-emerald-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-white/5 border-transparent'
                  }`}
                >
                  {link.name}
                </Link>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            
            {/* Notification Bell (Visible on all devices) */}
            <div className="relative">
              <button
                onClick={handleToggleNotifications}
                className={`p-3 rounded-xl transition-all duration-300 relative border cursor-pointer ${
                  showNotifications
                    ? 'bg-blue-950/60 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                    : 'text-slate-300 hover:bg-white/5 border border-white/5 hover:text-white hover:border-white/10'
                }`}
                title="Thông báo từ Quyết"
              >
                <Bell className="w-5.5 h-5.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-900 animate-pulse shadow-lg shadow-red-500/30">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 sm:right-0 -right-12 mt-3 w-[300px] sm:w-80 bg-slate-950/95 backdrop-blur-xl border border-blue-900/40 rounded-2xl shadow-2xl p-4 z-[70] animate-in fade-in slide-in-from-top-3 duration-250">
                  <div className="flex items-center justify-between pb-3 border-b border-blue-900/20 mb-3">
                    <span className="font-extrabold text-[10px] tracking-wider uppercase text-cyan-400">Thông báo của Quyết</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Realtime ⚡</span>
                  </div>
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-xs font-semibold leading-relaxed">
                        <span className="text-2xl block mb-2">🔔</span>
                        Chưa có thông báo nào từ cửa hàng.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] hover:border-blue-500/10 transition-all duration-200">
                          <div className="flex gap-2">
                            <span className="text-sm shrink-0">
                              {n.type === 'price_change' ? '🏷️' : n.type === 'new_product' ? '🐟' : '📢'}
                            </span>
                            <div className="space-y-1">
                              <p className="text-xs text-slate-200 font-bold leading-relaxed whitespace-pre-wrap">{n.message}</p>
                              <p className="text-[9px] text-slate-500 font-extrabold uppercase">
                                {new Date(n.created_at).toLocaleTimeString('vi-VN')} {new Date(n.created_at).toLocaleDateString('vi-VN')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Cart with Premium Glowing indicator (Always visible on Mobile & Desktop) */}
            <Link 
              href="/cart"
              className={`relative p-3 rounded-xl transition-all duration-300 ${
                isActive('/cart') 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25 border border-orange-400/50' 
                  : 'text-slate-300 hover:bg-white/5 border border-white/5 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-5.5 h-5.5 transition-transform group-hover:scale-110" />
              {hasHydrated && cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md animate-pulse-glow-cart">
                  {cartItemsCount}
                </span>
              )}
            </Link>

            {/* Desktop Auth/Profile premium glass button */}
            <div className="hidden md:flex items-center gap-2">
              {session ? (
                <div className="flex items-center gap-2">
                  <Link 
                    href="/profile"
                    style={{ padding: '10px 22px' }}
                    className={`flex items-center gap-2 rounded-full leading-none transition-all duration-300 border ${
                      isActive('/profile') 
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300' 
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/10 hover:text-white'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-cyan-950/80 flex items-center justify-center border border-cyan-500/30 relative">
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-slate-900 animate-pulse" />
                    </div>
                    <span className="text-xs font-bold tracking-wide uppercase truncate max-w-[90px]">
                      {session.user.email?.split('@')[0]}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{ padding: '11px' }}
                    className="rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-300 leading-none cursor-pointer"
                    title="Đăng xuất"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                  </button>
                </div>
              ) : (
                <Link 
                  href="/auth"
                  style={{ padding: '12px 26px' }}
                  className="flex items-center gap-2.5 text-white text-xs font-black tracking-widest uppercase rounded-full leading-none transition-all shadow-lg hover:shadow-orange-500/30 hover:scale-102 active:scale-95 group overflow-hidden border border-orange-400/20 animate-shimmer-auth"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập</span>
                </Link>
              )}
            </div>

            {/* Mobile Hamburger Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-3 text-slate-300 hover:text-white hover:bg-white/5 border border-white/5 rounded-xl transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
      </div>

      {/* Mobile Menu Dropdown with slide-down glassmorphism */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-blue-900/30 bg-slate-950/95 backdrop-blur-xl absolute w-full left-0 right-0 shadow-[0_15px_30px_rgba(8,18,45,0.8)] transition-all duration-300 animate-in slide-in-from-top-5 duration-300 z-50">
          <div className="px-4 py-6 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-5 py-3.5 rounded-xl text-sm font-black tracking-wide uppercase transition-all duration-200 border ${
                  isActive(link.href)
                    ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                    : link.href === '/admin'
                      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20'
                      : 'text-slate-300 border-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            ))}

            {/* Mobile Auth Links rendered in the same clean, uniform style */}
            {session ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-5 py-3.5 rounded-xl text-sm font-black tracking-wide uppercase transition-all duration-200 border ${
                    isActive('/profile')
                      ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                      : 'text-slate-300 border-transparent hover:bg-white/5 hover:text-white'
                  }`}
                >
                  Tài khoản ({session.user.email?.split('@')[0]})
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleLogout()
                  }}
                  className="w-full text-left block px-5 py-3.5 rounded-xl text-sm font-black tracking-wide uppercase transition-all duration-200 border text-red-400 border-transparent hover:bg-red-500/10 cursor-pointer"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2.5 text-white text-xs font-black tracking-wide uppercase rounded-xl py-3.5 leading-none transition-all shadow-lg hover:shadow-orange-500/30 hover:scale-102 active:scale-95 group overflow-hidden border border-orange-400/20 animate-shimmer-auth text-center"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
