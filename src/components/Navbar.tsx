'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCart } from '@/store/cart'
import { supabase } from '@/lib/supabase'
import { ShoppingCart, Anchor, User, LogOut, LogIn, Menu, X, Bell, Trash2, Zap, ArrowRight, Plus, Minus } from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { items, remove, updateQty, total, isOpen, setIsOpen } = useCart()
  const [hasHydrated, setHasHydrated] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  
  // Realtime Notifications state
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [readIds, setReadIds] = useState<string[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'new' | 'read'>('new')

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

  // Block scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const getQtyStep = (unit: string) => {
    const u = (unit || '').toLowerCase()
    return (u.includes('kg') || u.includes('ký') || u.includes('ky') || u.includes('kg/')) ? 0.5 : 1
  }

  const getQtyMin = (unit: string) => getQtyStep(unit)

  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({})
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)

  const handleDecreaseQty = (id: string, currentQty: number, unit: string) => {
    const step = getQtyStep(unit)
    const min = step
    const newVal = Math.max(min, Math.round((currentQty - step) * 10) / 10)
    updateQty(id, newVal)
  }

  const handleIncreaseQty = (id: string, currentQty: number, unit: string) => {
    const step = getQtyStep(unit)
    const newVal = Math.round((currentQty + step) * 10) / 10
    updateQty(id, newVal)
  }

  const handleQtyInputChange = (id: string, val: string, unit: string) => {
    setQtyInputs(prev => ({ ...prev, [id]: val }))
  }

  const handleInputBlur = (id: string, currentQty: number, unit: string) => {
    setFocusedItemId(null)
    const valStr = qtyInputs[id]
    if (valStr !== undefined) {
      let val = parseFloat(valStr)
      const min = getQtyMin(unit)
      if (isNaN(val) || val < min) {
        val = min
      } else {
        const step = getQtyStep(unit)
        val = Math.round(val / step) * step
        if (val < min) val = min
      }
      updateQty(id, val)
      setQtyInputs(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

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

  // Ref to track latest showNotifications state to avoid stale closure in realtime listener
  const showNotificationsRef = useRef(showNotifications)
  useEffect(() => {
    showNotificationsRef.current = showNotifications
  }, [showNotifications])

  // Load and subscribe to notifications
  useEffect(() => {
    async function loadNotifications() {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(40)
        if (!error && data) {
          setNotifications(data)
          
          const readIdsString = localStorage.getItem('read_notification_ids') || '[]'
          let rIds: string[] = []
          try {
            rIds = JSON.parse(readIdsString)
          } catch {
            rIds = []
          }
          setReadIds(rIds)

          const deletedIdsString = localStorage.getItem('deleted_notification_ids') || '[]'
          let dIds: string[] = []
          try {
            dIds = JSON.parse(deletedIdsString)
          } catch {
            dIds = []
          }
          setDeletedIds(dIds)

          // Unread notifications: not read and not deleted
          const unread = data.filter(n => !rIds.includes(String(n.id)) && !dIds.includes(String(n.id))).length
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
        const newNotification = payload.new
        setNotifications(prev => {
          // Add the new notification, filter out possible duplicate, and keep top 40
          const updated = [newNotification, ...prev.filter(n => n.id !== newNotification.id).slice(0, 39)]
          return updated
        })
        
        // Brand new notification is unread and not deleted
        setUnreadCount(c => c + 1)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications)
  }

  const handleMarkAsRead = (id: string) => {
    const stringId = String(id)
    if (!readIds.includes(stringId)) {
      const updatedReadIds = [...readIds, stringId]
      setReadIds(updatedReadIds)
      localStorage.setItem('read_notification_ids', JSON.stringify(updatedReadIds))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const stringId = String(id)
    if (!deletedIds.includes(stringId)) {
      const updatedDeletedIds = [...deletedIds, stringId]
      setDeletedIds(updatedDeletedIds)
      localStorage.setItem('deleted_notification_ids', JSON.stringify(updatedDeletedIds))
      if (!readIds.includes(stringId)) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    }
  }

  const cartItemsCount = items.reduce((acc, item) => acc + item.quantity, 0)

  const baseNavLinks = [
    { name: 'Trang chủ', href: '/' },
    { name: 'Sản phẩm', href: '/products' },
    { name: 'Đơn hàng', href: '/profile?tab=orders' },
    { name: 'Săn hải sản', href: '/feedback' },
  ];

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
          display: inline-block;
          line-height: 1.65 !important;
          padding-top: 0.35em !important;
          padding-bottom: 0.25em !important;
          margin-top: -0.35em !important;
          margin-bottom: -0.25em !important;
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
        @keyframes text-gold-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .text-gold-gradient {
          background: linear-gradient(120deg, #fbbf24 10%, #f59e0b 30%, #f97316 50%, #f59e0b 70%, #fbbf24 90%);
          background-size: 200% auto;
          animation: text-gold-shimmer 3s infinite linear;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-flex;
          align-items: center;
          line-height: 1.5 !important;
          padding-top: 0.22em !important;
          padding-bottom: 0.16em !important;
        }
        @keyframes gold-border-sparkle {
          0%, 100% { border-color: rgba(245, 158, 11, 0.25); box-shadow: 0 0 6px rgba(245, 158, 11, 0.05); }
          50% { border-color: rgba(245, 158, 11, 0.85); box-shadow: 0 0 16px rgba(245, 158, 11, 0.35); }
        }
        .sparkle-gold-btn {
          animation: gold-border-sparkle 2.5s infinite ease-in-out;
        }
        @keyframes text-cyan-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .text-cyan-gradient {
          background: linear-gradient(120deg, #22d3ee 10%, #06b6d4 30%, #38bdf8 50%, #06b6d4 70%, #22d3ee 90%);
          background-size: 200% auto;
          animation: text-cyan-shimmer 3.2s infinite linear;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-flex;
          align-items: center;
          line-height: 1.4;
          padding: 0.25em 0;
          margin: -0.25em 0;
        }
        @keyframes cyan-border-glow {
          0%, 100% { border-color: rgba(6, 182, 212, 0.25); box-shadow: 0 0 6px rgba(6, 182, 212, 0.05); }
          50% { border-color: rgba(6, 182, 212, 0.85); box-shadow: 0 0 16px rgba(6, 182, 212, 0.35); }
        }
        .sparkle-cyan-btn {
          animation: cyan-border-glow 2.8s infinite ease-in-out;
        }
      `}} />

      <div className="max-w-7xl mx-auto w-full flex justify-between items-center px-2.5 min-[380px]:px-4 sm:px-6 lg:px-8">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 min-[360px]:gap-1.5 min-[380px]:gap-3 group shrink-0">
            <div className="w-7.5 h-7.5 min-[360px]:w-8 min-[360px]:h-8 min-[380px]:w-9 min-[380px]:h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-blue-800 to-cyan-500 flex items-center justify-center border border-cyan-400/30 group-hover:border-cyan-300 shadow-md group-hover:scale-105 transition-all duration-300 shrink-0">
              <Anchor className="w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4 min-[380px]:w-5 min-[380px]:h-5 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <div className="flex flex-col text-left justify-center py-0.5 select-none min-w-0">
              <span className="font-black text-xs min-[360px]:text-sm min-[380px]:text-base sm:text-xl tracking-wider uppercase shimmer-logo-text whitespace-nowrap">Hải Sản Sạch</span>
              <span className="text-[7px] min-[380px]:text-[8px] sm:text-[10px] text-cyan-400 font-semibold tracking-wide uppercase leading-none whitespace-nowrap hidden min-[360px]:block">Phan Thiết Port</span>
            </div>
          </Link>

          {/* Desktop Nav - Frosted glass links style */}
          <div className="hidden md:flex items-center gap-x-3">
            {navLinks.map((link) => {
              const isLinkActive = isActive(link.href)
              
              // Custom highlighting classes for specific tabs
              let customClasses = ''
              if (link.href === '/feedback') {
                customClasses = isLinkActive 
                  ? 'bg-amber-950/50 sparkle-gold-btn border border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.35)] font-black' 
                  : 'bg-amber-950/15 sparkle-gold-btn border border-amber-500/25 hover:bg-amber-950/30 hover:border-amber-500/50 font-black'
              } else if (link.href === '/products') {
                customClasses = isLinkActive
                  ? 'bg-cyan-950/50 sparkle-cyan-btn border border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.35)] font-black'
                  : 'bg-cyan-950/15 sparkle-cyan-btn border border-cyan-500/25 hover:bg-cyan-950/30 hover:border-cyan-500/50 font-black'
              } else if (isLinkActive) {
                customClasses = 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
              } else if (link.href === '/admin') {
                customClasses = 'text-emerald-400 border-emerald-500/20 hover:text-emerald-300 hover:bg-emerald-950/40 hover:border-emerald-500/40'
              } else {
                customClasses = 'text-slate-300 hover:text-white hover:bg-white/5 border-transparent'
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{ padding: '12px 26px' }}
                  className={`rounded-full text-xs font-bold tracking-wide uppercase leading-none transition-all duration-300 ${customClasses}`}
                >
                  {link.href === '/feedback' ? (
                    <span className="text-gold-gradient">{link.name}</span>
                  ) : link.href === '/products' ? (
                    <span className="text-cyan-gradient">{link.name}</span>
                  ) : (
                    link.name
                  )}
                </Link>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 min-[340px]:gap-1 min-[380px]:gap-1.5 sm:gap-4 shrink-0">
            
            {/* Mobile "Săn hải sản" Button (Extremely neat and compact with premium breathing room) */}
            <Link
              href="/feedback"
              style={{ padding: '8px 20px' }}
              className={`md:hidden shrink-0 flex items-center justify-center rounded-xl font-black uppercase tracking-wider transition-all duration-300 border sparkle-gold-btn 
                text-[9px] 
                min-[360px]:text-[10px] 
                min-[380px]:text-[11px] ${
                isActive('/feedback')
                  ? 'bg-amber-950/60 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.25)] text-amber-350'
                  : 'bg-amber-950/15 border-amber-500/30 text-amber-400 hover:bg-amber-950/30'
              }`}
            >
              <span className="text-gold-gradient whitespace-nowrap">Săn hải sản</span>
            </Link>
            
            {/* Notification Bell (Visible on all devices) */}
            <div className="relative shrink-0">
              <button
                onClick={handleToggleNotifications}
                className={`rounded-xl transition-all duration-300 relative border cursor-pointer shrink-0 
                  p-1 
                  min-[360px]:p-1.5 
                  min-[380px]:p-2 
                  sm:p-3 ${
                  showNotifications
                    ? 'bg-blue-950/60 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                    : 'text-slate-300 hover:bg-white/5 border border-white/5 hover:text-white hover:border-white/10'
                }`}
                title="Thông báo"
              >
                <Bell className="w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4 min-[380px]:w-5 min-[380px]:h-5 sm:w-5.5 sm:h-5.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] min-[380px]:text-[9px] font-black w-3.5 h-3.5 min-[380px]:w-4.5 min-[380px]:h-4.5 rounded-full flex items-center justify-center border border-slate-900 animate-pulse shadow-lg shadow-red-500/30">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 sm:right-0 -right-12 mt-3 w-[300px] sm:w-80 bg-slate-950/95 backdrop-blur-xl border border-blue-900/40 rounded-2xl shadow-2xl p-4 z-[70] animate-in fade-in slide-in-from-top-3 duration-250">
                  {/* Compact Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-blue-900/20 mb-2">
                    <span className="font-extrabold text-[11px] tracking-wider uppercase text-cyan-400">Thông báo</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Realtime ⚡</span>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex bg-slate-900/80 border border-white/5 rounded-lg p-0.5 gap-1 mb-2.5 text-[10px] font-bold">
                    <button
                      onClick={() => setActiveTab('new')}
                      className={`flex-1 py-1 rounded-md text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        activeTab === 'new'
                          ? 'bg-blue-600/30 text-cyan-300 border border-blue-500/20'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Mới
                      {notifications.filter(n => !deletedIds.includes(String(n.id)) && !readIds.includes(String(n.id))).length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('read')}
                      className={`flex-1 py-1 rounded-md text-center transition-all cursor-pointer ${
                        activeTab === 'read'
                          ? 'bg-blue-600/30 text-cyan-300 border border-blue-500/20'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Đã xem
                    </button>
                  </div>

                  {/* List Container */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {(() => {
                      const visible = notifications.filter(n => !deletedIds.includes(String(n.id)))
                      const filtered = visible.filter(n => {
                        const isRead = readIds.includes(String(n.id))
                        if (activeTab === 'new') return !isRead
                        if (activeTab === 'read') return isRead
                        return true
                      })

                      if (filtered.length === 0) {
                        return (
                           <div className="py-8 text-center text-slate-500 text-[11px] font-semibold leading-relaxed">
                            <span className="text-xl block mb-1">🔔</span>
                            {activeTab === 'new' 
                              ? 'Không có thông báo mới nào.' 
                              : 'Chưa có thông báo nào đã xem.'}
                          </div>
                        )
                      }

                      return filtered.map(n => {
                        const isRead = readIds.includes(String(n.id))
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleMarkAsRead(n.id)}
                            className={`group relative p-2.5 border rounded-xl transition-all duration-200 cursor-pointer ${
                              isRead
                                ? 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03]'
                                : 'bg-blue-950/20 border-blue-500/25 hover:bg-blue-950/35 shadow-[inset_0_0_10px_rgba(6,182,212,0.03)]'
                            }`}
                          >
                            <div className="flex gap-2 pr-6">
                              <span className="text-xs shrink-0 self-start mt-0.5">
                                {n.type === 'price_change' ? '🏷️' : n.type === 'new_product' ? '🐟' : '📢'}
                              </span>
                              <div className="space-y-0.5 min-w-0">
                                <p className={`text-[11px] leading-relaxed whitespace-pre-wrap break-words ${
                                  isRead ? 'text-slate-400' : 'text-slate-100 font-semibold'
                                }}`}>
                                  {n.message}
                                </p>
                                <p className="text-[8px] text-slate-500 font-bold uppercase flex items-center gap-1.5">
                                  <span>
                                    {new Date(n.created_at).toLocaleTimeString('vi-VN')} {new Date(n.created_at).toLocaleDateString('vi-VN')}
                                  </span>
                                  {!isRead && (
                                    <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse inline-block" />
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Client-side Delete Button */}
                            <button
                              onClick={(e) => handleDeleteNotification(e, n.id)}
                              className="absolute top-2.5 right-2.5 p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                              title="Xóa thông báo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Cart with Premium Glowing indicator (Always visible on Mobile & Desktop) */}
            <button 
              onClick={() => setIsOpen(true)}
              className={`relative rounded-xl transition-all duration-300 cursor-pointer shrink-0 
                p-1 
                min-[360px]:p-1.5 
                min-[380px]:p-2 
                sm:p-3 ${
                isOpen 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25 border border-orange-400/50' 
                  : 'text-slate-300 hover:bg-white/5 border border-white/5 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4 min-[380px]:w-5 min-[380px]:h-5 sm:w-5.5 sm:h-5.5 transition-transform group-hover:scale-110" />
              {hasHydrated && cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[8px] min-[380px]:text-[10px] font-black w-4.5 h-4.5 min-[380px]:w-5 min-[380px]:h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md animate-pulse-glow-cart">
                  {cartItemsCount}
                </span>
              )}
            </button>

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

            {/* Mobile Auth/Profile Button */}
            <div className="flex md:hidden items-center shrink-0">
              {hasHydrated && (
                session ? (
                  <Link
                    href="/profile"
                    className="relative rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-center transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] shrink-0 
                      p-0.5 text-xs 
                      min-[360px]:p-1 min-[360px]:text-sm 
                      min-[380px]:p-1.5 min-[380px]:text-lg hover:bg-cyan-900/60"
                    title="Hồ sơ cá nhân"
                  >
                    🦀
                    <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 min-[380px]:w-2 min-[380px]:h-2 rounded-full bg-emerald-500 border border-slate-900" />
                  </Link>
                ) : (
                  <Link
                    href="/auth"
                    className="flex items-center justify-center rounded-xl bg-gradient-to-tr from-orange-500 to-orange-400 border border-orange-300/30 text-white shadow-lg shadow-orange-500/20 shrink-0 
                      p-1 
                      min-[360px]:p-1.5 
                      min-[380px]:p-2 
                      sm:p-2.5"
                    title="Đăng nhập"
                  >
                    <LogIn className="w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4 min-[380px]:w-5 min-[380px]:h-5 sm:w-5.5 sm:h-5.5" />
                  </Link>
                )
              )}
            </div>

            {/* Mobile Hamburger Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-slate-300 hover:text-white hover:bg-white/5 border border-white/5 rounded-xl transition-colors cursor-pointer shrink-0 
                p-1 
                min-[360px]:p-1.5 
                min-[380px]:p-2 
                sm:p-3"
            >
              {mobileMenuOpen ? (
                <X className="w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4 min-[380px]:w-5.5 min-[380px]:h-5.5 sm:w-6 sm:h-6" />
              ) : (
                <Menu className="w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4 min-[380px]:w-5.5 min-[380px]:h-5.5 sm:w-6 sm:h-6" />
              )}
            </button>
          </div>
      </div>

      {/* Mobile Menu Dropdown with slide-down glassmorphism */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-blue-900/30 bg-slate-950/95 backdrop-blur-xl absolute w-full left-0 right-0 shadow-[0_15px_30px_rgba(8,18,45,0.8)] transition-all duration-300 animate-in slide-in-from-top-5 duration-300 z-50">
          <div className="px-4 py-6 space-y-2">
            {navLinks.filter(link => link.href !== '/feedback').map((link) => {
              const isLinkActive = isActive(link.href)
              
              let customMobileClasses = ''
              if (link.href === '/products') {
                customMobileClasses = isLinkActive
                  ? 'bg-cyan-950/60 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                  : 'bg-cyan-950/20 border-cyan-500/30 hover:bg-cyan-950/30'
              } else if (isLinkActive) {
                customMobileClasses = 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
              } else if (link.href === '/admin') {
                customMobileClasses = 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20'
              } else {
                customMobileClasses = 'text-slate-300 border-transparent hover:bg-white/5 hover:text-white'
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-5 py-3.5 rounded-xl text-sm font-black tracking-wide uppercase transition-all duration-200 border ${customMobileClasses}`}
                >
                  {link.href === '/products' ? (
                    <span className="text-cyan-gradient">{link.name}</span>
                  ) : (
                    link.name
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
      {/* Premium Slide-out Cart Drawer */}
      {/* Backdrop */}
      {hasHydrated && isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-[4px] z-[100] transition-opacity duration-300 animate-in fade-in cursor-pointer"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Drawer Panel */}
      {hasHydrated && (
        <div className={`fixed top-0 right-0 h-full w-full sm:w-[440px] bg-slate-950/95 backdrop-blur-2xl border-l border-blue-900/30 z-[101] shadow-[0_0_50px_rgba(8,18,45,0.8)] transition-all duration-300 transform flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          {/* Header */}
          <div className="p-5 border-b border-blue-900/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5.5 h-5.5 text-cyan-400" />
              <h2 className="font-extrabold text-base text-slate-100 uppercase tracking-wider">Giỏ hàng của bạn</h2>
              <span className="bg-blue-900/50 text-cyan-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-800/30">
                {items.length}
              </span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="text-6xl mb-4 animate-bounce">🦐</div>
                <p className="text-slate-300 font-extrabold text-base mb-2">Giỏ hàng đang trống</p>
                <p className="text-slate-500 text-xs font-semibold max-w-[260px] leading-relaxed mb-6">
                  Hải sản tươi sống cập bến Phan Thiết mỗi ngày. Hãy chọn những món tươi ngon nhất nhé!
                </p>
                <button
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/products')
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  Mua sắm ngay
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-3 hover:bg-white/[0.04] hover:border-blue-500/10 transition-all duration-300"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <p className="font-extrabold text-sm text-slate-100 truncate">{item.name}</p>
                      <button 
                        onClick={() => remove(item.id)} 
                        className="text-slate-500 hover:text-red-450 transition-colors p-0.5 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center mt-2.5">
                      {/* Price / unit */}
                      <p className="text-xs text-slate-400 font-semibold">
                        {item.price.toLocaleString('vi-VN')}đ/{item.unit}
                      </p>

                      {/* Quantity Selector */}
                      <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleDecreaseQty(item.id, item.quantity, item.unit)}
                          className="w-7 h-7 rounded-md hover:bg-white/10 active:scale-90 text-slate-300 transition-all font-black flex items-center justify-center select-none cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            min={getQtyMin(item.unit)}
                            step={getQtyStep(item.unit)}
                            value={qtyInputs[item.id] !== undefined ? qtyInputs[item.id] : String(item.quantity)}
                            onChange={(e) => handleQtyInputChange(item.id, e.target.value, item.unit)}
                            onFocus={(e) => {
                              setFocusedItemId(item.id)
                              e.target.select()
                            }}
                            onBlur={() => handleInputBlur(item.id, item.quantity, item.unit)}
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                            className="w-8 bg-transparent text-center text-slate-100 font-extrabold text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleIncreaseQty(item.id, item.quantity, item.unit)}
                          className="w-7 h-7 rounded-md hover:bg-white/10 active:scale-90 text-slate-300 transition-all font-black flex items-center justify-center select-none cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Total for item */}
                    <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-white/[0.03]">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Thành tiền</span>
                      <span className="text-xs font-black text-cyan-400">
                        {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="p-5 border-t border-blue-900/20 bg-slate-950/80 backdrop-blur-md space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm font-bold">Tổng cộng:</span>
                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400 tracking-tight">
                  {total().toLocaleString('vi-VN')}đ
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {/* Checkout button */}
                <button
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/checkout')
                  }}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-98 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider border border-orange-600/10 cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-white animate-pulse" />
                  <span>Đặt hàng ngay</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>

              <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-wider">
                ⚡ Giao từ Phan Thiết • Cam kết 100% tươi sạch
              </p>
              <p className="text-[10px] text-center text-cyan-400/80 font-medium tracking-wide sm:hidden pt-1 animate-pulse">
                (Vuốt từ dưới lên trên để tiếp tục xem các sản phẩm khác)
              </p>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
