'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCart } from '@/store/cart'
import { supabase } from '@/lib/supabase'
import { ShoppingCart, Anchor, User, MessageSquare, LogOut, LogIn, Menu, X } from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { items } = useCart()
  const [hasHydrated, setHasHydrated] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center px-4 sm:px-6 lg:px-8 h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 group-hover:bg-blue-100 transition-colors">
              <Anchor className="w-6 h-6 text-blue-600" />
            </div>
            <span className="font-bold text-xl tracking-tight text-blue-600 hidden sm:block">Hải Sản Sạch</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-x-6 gap-y-1">
            {navLinks.map((link) => (
              <div key={link.href} className="relative group">
                <Link
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors block ${
                    isActive(link.href)
                      ? 'text-blue-600 bg-blue-50/50'
                      : link.href === '/admin'
                        ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  {link.name}
                </Link>
                <span className={`absolute -bottom-1.5 left-0 w-full h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300 ${
                  link.href === '/admin' ? 'bg-green-500' : 'bg-blue-600'
                } ${isActive(link.href) ? 'scale-x-100' : ''}`} />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            
            {/* Cart */}
            <Link 
              href="/cart"
              className={`relative p-2.5 rounded-xl transition-colors ${
                isActive('/cart') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              {hasHydrated && cartItemsCount > 0 && (
                <span className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {cartItemsCount}
                </span>
              )}
            </Link>

            {/* Auth/Profile */}
            {session ? (
              <Link 
                href="/profile"
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                  isActive('/profile') ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
                <span className="text-sm font-medium hidden sm:block truncate max-w-[100px]">
                  {session.user.email?.split('@')[0]}
                </span>
              </Link>
            ) : (
              <Link 
                href="/auth"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:block">Đăng nhập</span>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-md absolute w-full">
          <div className="px-4 pt-2 pb-6 space-y-1 shadow-lg">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl text-base font-medium ${
                  isActive(link.href)
                    ? 'bg-blue-50 text-blue-600'
                    : link.href === '/admin'
                      ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
