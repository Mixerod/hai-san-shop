'use client'

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
  Check
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

  // Orders states
  const [orders, setOrders] = useState<Order[]>([])
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({})

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

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleConfirmOrder(orderId: string) {
    if (!window.confirm('Bạn xác nhận đã nhận được đầy đủ hàng và hài lòng với chất lượng chứ?')) return

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'done' })
        .eq('id', orderId)

      if (error) throw error
      
      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'done' } : o))
    } catch (error) {
      console.error('Error confirming order:', error)
      alert('Không thể cập nhật trạng thái đơn hàng.')
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="font-bold animate-pulse">Đang tải dữ liệu hồ sơ...</p>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-3xl">
        
        {/* Header & Logout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Tài khoản của bạn</h1>
            <p className="text-slate-500 text-sm font-medium">{session?.user?.email}</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-red-50 text-red-600 rounded-xl transition-all border border-gray-200 hover:border-red-200 self-start sm:self-auto text-sm font-bold shadow-sm active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-1.5 bg-white rounded-2xl mb-8 border border-gray-100 shadow-sm">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'profile' 
                ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent'
            }`}
          >
            <User className="w-5 h-5" />
            Hồ sơ cá nhân
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'orders' 
                ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent'
            }`}
          >
            <Package className="w-5 h-5" />
            Lịch sử mua hàng
          </button>
        </div>

        {/* Tab Content: Profile */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
              <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
              Thông tin giao hàng mặc định
            </h2>

            {profileMsg.text && (
              <div className={`mb-8 flex items-start gap-3 p-4 rounded-xl text-sm font-medium border ${
                profileMsg.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {profileMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                <p>{profileMsg.text}</p>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">Họ và tên</label>
                <input
                  type="text"
                  value={profile.full_name || ''}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  placeholder="Nhập họ tên của bạn"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">Số điện thoại</label>
                <input
                  type="tel"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">Địa chỉ giao hàng</label>
                <textarea
                  value={profile.address || ''}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
                  placeholder="Nhập địa chỉ nhà, tên đường, phường xã..."
                />
              </div>

               <div className="pt-4">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:bg-blue-300 text-white font-bold py-3 px-10 rounded-xl transition-all shadow-md shadow-blue-500/20"
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
          </div>
        )}

        {/* Tab Content: Orders */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Banner Gọi Điện Khẩn Cấp */}
            <div className="bg-orange-50 border border-orange-200 rounded-3xl p-6 sm:p-8 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 shadow-sm ring-1 ring-orange-500/5">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 text-orange-600 font-black text-sm uppercase tracking-widest">
                  <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
                  Hỗ trợ khẩn cấp
                </div>
                <div className="text-orange-900 text-sm sm:text-base font-medium leading-relaxed">
                  Bạn cần ghi chú thêm, đổi món hoặc cần hỗ trợ giao hàng? Hãy gọi/Zalo ngay cho Quyết: 
                  <a href="tel:0964671009" className="inline-block ml-2 font-black text-2xl text-orange-600 hover:text-orange-700 transition-colors border-b-2 border-orange-200 hover:border-orange-500">
                    0964671009
                  </a>
                </div>
              </div>
              <a 
                href="https://zalo.me/0964671009"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 bg-[#0068FF] hover:bg-[#0054cc] active:scale-95 text-white px-8 py-4 rounded-2xl font-black transition-all flex items-center gap-3 text-base shadow-xl shadow-blue-500/30 w-full xl:w-auto justify-center group"
              >
                <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                Nhắn Zalo ngay
              </a>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
                  <Package className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Chưa có đơn hàng nào</h3>
                <p className="text-slate-500 mb-8 font-medium">Bạn chưa thực hiện bất kỳ giao dịch nào.</p>
                <Link href="/products" className="inline-flex bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-md shadow-orange-500/20">
                  Bắt đầu mua sắm ngay
                </Link>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                  
                  {/* Order Header / Toggle */}
                  <div 
                    onClick={() => toggleOrder(order.id)}
                    className="p-5 sm:p-6 cursor-pointer hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-md text-sm border border-gray-200">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-5 text-sm text-slate-500 font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {new Date(order.created_at).toLocaleDateString('vi-VN')}
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-slate-400" />
                          {order.payment_method === 'cod' ? 'Tiền mặt COD' : 'Chuyển khoản'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full border-t border-gray-100 sm:border-0 pt-4 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Tổng tiền</p>
                        <p className="font-black text-orange-500 text-xl">
                          {order.total_amount.toLocaleString('vi-VN')}đ
                        </p>
                      </div>
                      <div className="bg-slate-100 group-hover:bg-blue-50 p-2.5 rounded-xl transition-colors border border-gray-200 group-hover:border-blue-100">
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
                    <div className="bg-slate-50/50 border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
                      
                      {/* Timeline / Stepper */}
                      <OrderStepper status={order.status} />

                      {order.status === 'delivering' && (
                        <div className="px-5 sm:px-10 pb-8 flex justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmOrder(order.id);
                            }}
                            className="bg-green-600 hover:bg-green-500 text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-green-500/30 active:scale-95 transition-all flex items-center gap-3 animate-bounce-subtle"
                          >
                            <CheckCircle2 className="w-6 h-6" />
                            Xác nhận đã nhận hàng
                          </button>
                        </div>
                      )}

                      <div className="px-5 sm:px-10 pb-10 pt-10">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="h-[1px] flex-1 bg-slate-200"></div>
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Danh sách món hàng</h4>
                          <div className="h-[1px] flex-1 bg-slate-200"></div>
                        </div>
                        <div className="space-y-4">
                          {order.order_items?.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-sm font-black text-blue-600">
                                  {item.quantity}
                                </div>
                                <div>
                                  <p className="text-slate-800 font-bold leading-tight">{item.products?.name || 'Sản phẩm'}</p>
                                  <p className="text-slate-400 text-xs font-bold mt-0.5">{item.products?.unit || 'kg'}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-slate-900 font-black">
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
