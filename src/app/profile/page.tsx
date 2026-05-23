'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { 
  User, 
  Package, 
  LogOut, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp,
  MapPin,
  Phone,
  Calendar,
  CreditCard,
  MessageCircle,
  Check,
  Info
} from 'lucide-react'

// Types
type Profile = {
  id: string
  full_name: string
  phone: string
  address: string
}

type OrderItem = {
  id: string
  quantity: number
  price_at_time: number
  products: {
    name: string
    unit: string
  }
}

type Order = {
  id: string
  total_amount: number
  status: string
  payment_method: string
  note: string
  created_at: string
  order_items: OrderItem[]
}

const getStepIndex = (status: string) => {
  if (status === 'cancelled') return -1;
  const order = ['pending', 'confirmed', 'delivering', 'done']
  return order.indexOf(status)
}

const OrderStepper = ({ status }: { status: string }) => {
  if (status === 'cancelled') {
    return (
      <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-center font-bold text-sm my-4">
        Đơn hàng này đã bị hủy.
      </div>
    )
  }

  const steps = [
    { id: 'pending', label: 'Chờ xác nhận' },
    { id: 'confirmed', label: 'Đang chuẩn bị' },
    { id: 'delivering', label: 'Đang giao' },
    { id: 'done', label: 'Hoàn thành' }
  ]
  const currentIndex = getStepIndex(status)

  return (
    <div className="relative pt-6 pb-4 w-full max-w-2xl mx-auto px-2">
      <div className="relative flex justify-between items-start z-10">
        {/* Background Line */}
        <div className="absolute left-[10%] right-[10%] top-5 h-1 bg-gray-200 -z-10 rounded-full" />
        
        {/* Active Line */}
        <div 
          className="absolute left-[10%] top-5 h-1 bg-blue-500 -z-10 rounded-full transition-all duration-1000 ease-in-out" 
          style={{ width: `${currentIndex <= 0 ? 0 : (currentIndex / (steps.length - 1)) * 80}%` }}
        />

        {steps.map((step, idx) => {
          const isActive = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 shadow-sm z-20 mb-3 ${
                isActive 
                  ? 'text-white bg-blue-500 border-4 border-white ring-2 ring-blue-500' 
                  : 'text-gray-400 bg-white border-4 border-gray-100'
              }`}>
                {isActive ? <Check className="w-5 h-5" /> : idx + 1}
              </div>
              <div className={`text-center w-full px-1 ${
                isCurrent ? 'text-blue-600 font-extrabold' : isActive ? 'text-slate-700 font-bold' : 'text-gray-400 font-medium'
              }`}>
                <p className="text-[9px] sm:text-[10px] leading-tight break-words uppercase tracking-tighter">
                  {step.label}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="font-bold animate-pulse">Đang chuẩn bị dữ liệu...</p>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  )
}

function ProfileContent() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile')

  // Profile states
  const [profile, setProfile] = useState<Profile>({ id: '', full_name: '', phone: '', address: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })

  // Security states
  const [linkEmail, setLinkEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [savingSecurity, setSavingSecurity] = useState(false)
  const [securityMsg, setSecurityMsg] = useState({ type: '', text: '' })

  // Orders states
  const [orders, setOrders] = useState<Order[]>([])
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({})
  const [showPaymentInfo, setShowPaymentInfo] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')

  useEffect(() => {
    if (tabParam === 'orders') {
      setActiveTab('orders')
    }
  }, [tabParam])

  useEffect(() => {
    async function getSession() {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        router.push('/auth')
        return
      }
      
      setSession(session)
      
      // Fetch data concurrently
      Promise.all([
        fetchProfile(session.user.id),
        fetchOrders(session.user.id)
      ]).finally(() => setLoading(false))
    }

    getSession()
  }, [router])

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
      }
      
      if (data) {
        setProfile(data as Profile)
      } else {
        setProfile(prev => ({ ...prev, id: userId }))
      }
    } catch (error) {
      console.error(error)
    }
  }

  async function fetchOrders(userId: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name, unit))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        
      if (error) throw error
      
      if (data) {
        setOrders(data as Order[])
        // Automatically expand the most recent order if it's pending or confirmed
        if (data.length > 0 && ['pending', 'confirmed', 'delivering'].includes(data[0].status)) {
          setExpandedOrders({ [data[0].id]: true })
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg({ type: '', text: '' })

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
        })

      if (error) throw error
      setProfileMsg({ type: 'success', text: 'Cập nhật hồ sơ thành công!' })
    } catch (error: any) {
      console.error(error)
      setProfileMsg({ type: 'error', text: error.message || 'Không thể cập nhật hồ sơ.' })
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleLinkEmail() {
    if (!linkEmail) return
    setSavingSecurity(true)
    setSecurityMsg({ type: '', text: '' })
    try {
      const { error } = await supabase.auth.updateUser({ email: linkEmail })
      if (error) throw error

      // Tương thích ngược: Trích xuất username cũ nếu họ đang dùng email ảo để tự động điền vào bảng profiles
      const currentAuthEmail = session?.user?.email || ''
      const updatePayload: any = { email: linkEmail }
      if (currentAuthEmail.includes('@user.haisanshop.com')) {
        updatePayload.username = currentAuthEmail.split('@')[0]
      }

      // Lưu lại email thật (và username nếu có) vào bảng profiles để frontend có thể tra cứu chéo khi đăng nhập
      const { error: profileError } = await supabase.from('profiles').update(updatePayload).eq('id', session.user.id)
      if (profileError) throw profileError

      setSecurityMsg({ type: 'success', text: 'Đã gửi yêu cầu xác nhận đến Email mới. Vui lòng kiểm tra hộp thư.' })
      setLinkEmail('')
    } catch (error: any) {
      setSecurityMsg({ type: 'error', text: error.message || 'Không thể cập nhật Email.' })
    } finally {
      setSavingSecurity(false)
    }
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword.length < 6) return
    setSavingSecurity(true)
    setSecurityMsg({ type: '', text: '' })
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setSecurityMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' })
      setNewPassword('')
    } catch (error: any) {
      setSecurityMsg({ type: 'error', text: error.message || 'Không thể đổi mật khẩu.' })
    } finally {
      setSavingSecurity(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleConfirmOrder(orderId: string) {
    if (!window.confirm('Bạn xác nhận đã nhận được đầy đủ hàng và hài lòng với chất lượng chứ?')) return

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'done' })
        .eq('id', orderId)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error('row-level security policy block')
      }
      
      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'done' } : o))
    } catch (error: any) {
      console.error('Error confirming order:', error)
      const msg = (error?.message || '').toLowerCase()
      if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('block')) {
        alert('💡 Cập nhật không thành công do chính sách bảo mật (RLS) trên bảng "orders" của bạn đang chặn quyền chỉnh sửa.\n\nVui lòng báo Admin hệ thống mở thêm quyền UPDATE cho bảng orders!')
      } else {
        alert('Không thể cập nhật trạng thái đơn hàng.')
      }
    }
  }

  const toggleOrder = (id: string) => {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-md text-xs font-bold shadow-sm">Chờ xử lý</span>
      case 'confirmed': return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-md text-xs font-bold shadow-sm">Đã xác nhận</span>
      case 'delivering': return <span className="bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1 rounded-md text-xs font-bold shadow-sm">Đang giao hàng</span>
      case 'done': return <span className="bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-md text-xs font-bold shadow-sm">Hoàn thành</span>
      case 'cancelled': return <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-md text-xs font-bold shadow-sm">Đã hủy</span>
      default: return <span className="bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 rounded-md text-xs font-bold shadow-sm">{status}</span>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/30 flex flex-col items-center justify-center gap-4 text-slate-500">
        <div className="relative flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <div className="absolute w-6 h-6 rounded-full bg-blue-500/10 animate-ping"></div>
        </div>
        <p className="font-bold text-sm text-slate-600 animate-pulse tracking-wide">Đang tải hồ sơ của bạn...</p>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/15 to-slate-100/50 flex flex-col items-center px-3 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-3xl">
        
        {/* Header & Logout */}
        <div className="flex flex-col items-center justify-center gap-4 mb-10 px-2 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/20">
              {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : session?.user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
                {profile.full_name || 'Khách hàng'}
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-1 tracking-wide">
                {session?.user?.email?.includes('@user.haisanshop.com') 
                  ? <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50">Chưa liên kết Email</span> 
                  : session?.user?.email}
              </p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-rose-50 text-rose-600 rounded-xl transition-all border border-gray-200 hover:border-rose-200 text-xs font-black uppercase tracking-wider shadow-sm active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-1.5 bg-slate-100/80 rounded-2xl mb-8 border border-slate-200/50 shadow-inner">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2.5 py-3 sm:py-4 px-2 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${
              activeTab === 'profile' 
                ? 'bg-white text-blue-600 shadow-md shadow-blue-900/5 border border-slate-200/30' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40 border border-transparent'
            }`}
          >
            <User className="w-4.5 h-4.5" />
            Hồ sơ cá nhân
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2.5 py-3 sm:py-4 px-2 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${
              activeTab === 'orders' 
                ? 'bg-white text-blue-600 shadow-md shadow-blue-900/5 border border-slate-200/30' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40 border border-transparent'
            }`}
          >
            <Package className="w-4.5 h-4.5" />
            Lịch sử mua hàng
          </button>
        </div>

        {/* Tab Content: Profile */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-0.5 hover:border-blue-500/10 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 duration-500 custom-card-feedback">
            <div className="flex flex-col items-center text-center custom-header-margin">
              <h2 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-3">
                Thông tin giao hàng
              </h2>
              <div className="w-10 h-1 bg-blue-500 rounded-full mt-3 animate-pulse"></div>
            </div>

            {profileMsg.text && (
              <div 
                style={{ padding: '1rem' }} 
                className={`rounded-xl text-sm font-medium border animate-in fade-in duration-300 custom-form-group flex items-start gap-3 ${
                  profileMsg.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {profileMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                <p>{profileMsg.text}</p>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} style={{ display: 'block' }}>
              <div className="custom-form-group">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block custom-label-spacing">Họ và tên</label>
                <input
                  type="text"
                  value={profile.full_name || ''}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all text-sm"
                  placeholder="Nhập họ tên của bạn"
                />
              </div>

              <div className="custom-form-group">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block custom-label-spacing">Số điện thoại</label>
                <input
                  type="tel"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all text-sm"
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div className="custom-form-group">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block custom-label-spacing">Địa chỉ giao hàng</label>
                <textarea
                  value={profile.address || ''}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all resize-none text-sm leading-relaxed"
                  placeholder="Nhập địa chỉ nhà, tên đường, phường xã..."
                />
              </div>

               <div className="custom-btn-wrapper flex justify-center">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:bg-blue-300 text-white font-bold py-3.5 px-10 rounded-xl transition-all shadow-lg shadow-blue-500/15 hover:shadow-xl hover:shadow-blue-500/25 border border-blue-700/10"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang lưu...
                    </>
                  ) : 'Lưu thông tin'}
                </button>
              </div>
            </form>

            {/* Account Security Section */}
            <hr className="my-10 border-slate-100" />

            <div className="flex flex-col items-center text-center custom-header-margin">
              <h2 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-3">
                Bảo mật tài khoản
              </h2>
              <div className="w-10 h-1 bg-red-500 rounded-full mt-3 animate-pulse"></div>
            </div>

            {securityMsg.text && (
              <div 
                style={{ padding: '1rem' }} 
                className={`custom-form-group flex items-start gap-3 rounded-xl text-sm font-medium border animate-in fade-in duration-300 ${
                  securityMsg.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {securityMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                <p>{securityMsg.text}</p>
              </div>
            )}

            <div style={{ display: 'block' }}>
              {/* Liên kết Email */}
              <div 
                style={{ padding: '1.5rem' }} 
                className="bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-inner custom-form-group"
              >
                <h3 style={{ marginBottom: '0.5rem' }} className="text-sm font-bold text-slate-800">Liên kết Email khôi phục</h3>
                <p style={{ marginBottom: '1rem' }} className="text-xs text-slate-500 leading-relaxed">
                  Nếu bạn đang đăng nhập bằng Tên đăng nhập, hãy liên kết với một Email thật để khôi phục mật khẩu khi lỡ quên. 
                  <br/>
                  <strong className="text-emerald-600">Đặc quyền: Sau khi liên kết, bạn có thể dùng CẢ Tên đăng nhập gốc hoặc Email mới này để đăng nhập!</strong>
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    className="flex-1 bg-white border border-slate-200/80 rounded-xl px-4 py-3 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all text-sm"
                    placeholder={session?.user?.email?.includes('@user.haisanshop.com') ? "Nhập Email thật của bạn..." : session?.user?.email}
                  />
                  <button
                    type="button"
                    onClick={handleLinkEmail}
                    disabled={savingSecurity || !linkEmail}
                    className="shrink-0 bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all text-sm"
                  >
                    Cập nhật Email
                  </button>
                </div>
              </div>

              {/* Đổi mật khẩu */}
              <div 
                style={{ padding: '1.5rem' }} 
                className="bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-inner custom-form-group"
              >
                <h3 style={{ marginBottom: '1rem' }} className="text-sm font-bold text-slate-800">Đổi mật khẩu mới</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    className="flex-1 bg-white border border-slate-200/80 rounded-xl px-4 py-3 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all text-sm"
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  />
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={savingSecurity || !newPassword || newPassword.length < 6}
                    className="shrink-0 bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all text-sm"
                  >
                    Đổi mật khẩu
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab Content: Orders */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Banner Gọi Điện Khẩn Cấp */}
            <div className="bg-gradient-to-r from-amber-500/[0.04] to-orange-500/[0.01] border border-orange-200/60 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center justify-center gap-4 shadow-sm hover:shadow-lg hover:border-orange-500/20 transition-all duration-500 ring-1 ring-orange-500/5">
              <div className="flex items-center justify-center gap-2 text-orange-600 font-extrabold text-xs uppercase tracking-widest">
                <span className="flex h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                Hỗ trợ khẩn cấp
              </div>
              <div className="text-slate-800 text-sm sm:text-base font-semibold leading-relaxed">
                Bạn cần ghi chú thêm, đổi món hoặc cần hỗ trợ giao hàng? Hãy gọi/Zalo ngay cho Quyết: 
                <br className="hidden sm:block" />
                <a href="tel:0964671009" className="inline-block mt-2 font-black text-2xl sm:text-3xl text-orange-600 hover:text-orange-700 transition-colors border-b-2 border-orange-200 hover:border-orange-500 leading-none">
                  0964671009
                </a>
              </div>
              <a 
                href="https://zalo.me/0964671009"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 shrink-0 bg-[#0068FF] hover:bg-[#0054cc] active:scale-95 text-white px-8 py-3.5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 text-base shadow-xl shadow-blue-500/25 border border-blue-600/10 w-full sm:w-auto"
              >
                <MessageCircle className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                Nhắn Zalo ngay
              </a>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner group">
                  <Package className="w-10 h-10 text-slate-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Chưa có đơn hàng nào</h3>
                <p className="text-slate-500 mb-8 font-semibold text-sm max-w-xs mx-auto leading-relaxed">Bạn chưa thực hiện bất kỳ giao dịch nào. Hãy khám phá ngay hải sản sạch Phan Thiết!</p>
                <Link href="/products" className="inline-flex bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/15 hover:shadow-orange-500/25 border border-orange-600/10">
                  Bắt đầu mua sắm ngay
                </Link>
              </div>
            ) : (
              orders.map((order) => (
                <div 
                  key={order.id} 
                  className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 hover:border-blue-500/10 transition-all duration-300 group"
                >
                  
                  {/* Order Header / Toggle */}
                  <div 
                    onClick={() => toggleOrder(order.id)}
                    className="p-4 sm:p-6 cursor-pointer hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg text-xs border border-slate-200">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400 font-bold uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {new Date(order.created_at).toLocaleDateString('vi-VN')}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-slate-400" />
                          {order.payment_method === 'cod' ? 'Tiền mặt COD' : 'Chuyển khoản'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full border-t border-slate-50 sm:border-0 pt-4 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tổng tiền</p>
                        <p className="font-black text-orange-500 text-xl tracking-tight">
                          {order.total_amount.toLocaleString('vi-VN')}đ
                        </p>
                      </div>
                      <div className="bg-slate-100 group-hover:bg-blue-50 p-2.5 rounded-xl transition-colors border border-slate-200 group-hover:border-blue-100/50">
                        {expandedOrders[order.id] ? (
                          <ChevronUp className="w-5 h-5 text-blue-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Details Expansion */}
                  {expandedOrders[order.id] && (
                    <div className="bg-slate-50/30 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                      
                      {/* Timeline / Stepper */}
                      <OrderStepper status={order.status} />

                      <div className="px-5 sm:px-10 pb-4 flex flex-wrap gap-4 justify-center">
                        {['pending', 'confirmed', 'delivering'].includes(order.status) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPaymentInfo(showPaymentInfo === order.id ? null : order.id);
                            }}
                            className="bg-orange-500 hover:bg-orange-400 text-white font-extrabold py-3.5 px-8 rounded-xl shadow-lg shadow-orange-500/15 hover:shadow-xl hover:shadow-orange-500/25 active:scale-95 transition-all flex items-center gap-2 border border-orange-600/20"
                          >
                            <CreditCard className="w-5 h-5" />
                            Thanh toán
                          </button>
                        )}
                        {order.status === 'delivering' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmOrder(order.id);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 px-8 rounded-xl shadow-lg shadow-emerald-500/15 hover:shadow-xl hover:shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-2 border border-emerald-700/10"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            Xác nhận đã nhận hàng
                          </button>
                        )}
                      </div>

                      {/* Payment Info Dropdown */}
                      {showPaymentInfo === order.id && (() => {
                        const noteLines = order.note ? order.note.split('\n') : []
                        const nameLine = noteLines.find(l => l.startsWith('Tên:'))
                        const nameStr = nameLine ? nameLine.replace('Tên:', '').trim() : ''
                        const phoneLine = noteLines.find(l => l.startsWith('SĐT:'))
                        const phoneStr = phoneLine ? phoneLine.replace('SĐT:', '').trim() : ''
                        const transferContent = nameStr && phoneStr ? `${nameStr} - ${phoneStr}` : (nameStr || phoneStr || '(Tên + SĐT của bạn)')
                        return (
                          <div className="px-5 sm:px-10 pb-8 animate-in slide-in-from-top-2">
                            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-sm text-orange-900 shadow-inner">
                              <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                Thông tin thanh toán
                              </h4>
                              <ul className="space-y-2 font-medium">
                                <li>• <strong className="text-orange-700">Tiền mặt:</strong> Thanh toán trực tiếp cho shipper khi nhận hàng.</li>
                                <li>• <strong className="text-orange-700">Chuyển khoản:</strong> Ngân hàng Agribank - STK <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-orange-200">4801205175150</span></li>
                                <li>• <strong className="text-orange-700">Ví điện tử:</strong> Momo - SĐT <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-orange-200">0964671009</span></li>
                                <li>• <strong className="text-orange-700">Chủ tài khoản:</strong> LÊ MINH QUYẾT</li>
                                <li>• <strong className="text-orange-700">Nội dung CK:</strong> <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-orange-200 text-blue-700">{transferContent}</span></li>
                              </ul>
                            </div>
                          </div>
                        )
                      })()}

                      <div className="px-5 sm:px-10 pb-10 pt-6">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="h-[1px] flex-1 bg-slate-200/60"></div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Danh sách món hàng</h4>
                          <div className="h-[1px] flex-1 bg-slate-200/60"></div>
                        </div>
                        <div className="space-y-4">
                          {order.order_items?.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-500/5 transition-all duration-300">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-50/50 border border-blue-100/50 flex items-center justify-center text-sm font-black text-blue-600">
                                  {item.quantity}
                                </div>
                                <div>
                                  <p className="text-slate-800 font-bold leading-tight">{item.products?.name || 'Sản phẩm'}</p>
                                  <p className="text-slate-400 text-[10px] font-bold uppercase mt-0.5">{item.products?.unit || 'kg'}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-slate-900 font-black tracking-tight">
                                  {(item.price_at_time * item.quantity).toLocaleString('vi-VN')}đ
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
        
      </div>
    </div>
  )
}
