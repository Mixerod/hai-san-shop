'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Send, 
  MessageSquare, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Star, 
  Calendar, 
  User, 
  Phone, 
  Fish, 
  Sparkles, 
  MessageCircle,
  HelpCircle
} from 'lucide-react'

type TabType = 'rating' | 'preorder' | 'chat'

export default function FeedbackPage() {
  const [session, setSession] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<TabType>('rating')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // 1. Standard Feedback States
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)

  // 2. Pre-Order Seafood States
  const [preorderName, setPreorderName] = useState('')
  const [preorderQty, setPreorderQty] = useState('')
  const [preorderContact, setPreorderContact] = useState('')
  const [preorderDesc, setPreorderDesc] = useState('')

  // 3. Live Chat States
  const [guestInfo, setGuestInfo] = useState<{ name: string; phone: string } | null>(null)
  const [guestNameInput, setGuestNameInput] = useState('')
  const [guestPhoneInput, setGuestPhoneInput] = useState('')
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [loadingChat, setLoadingChat] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Load guest info from localStorage if exists
    const stored = localStorage.getItem('haisan_chat_guest')
    if (stored) {
      try {
        setGuestInfo(JSON.parse(stored))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  // Auto scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // Fetch chat history periodically when on Chat tab
  useEffect(() => {
    if (activeTab !== 'chat') return

    fetchChats()
    const interval = setInterval(fetchChats, 4000) // Poll every 4 seconds
    return () => clearInterval(interval)
  }, [activeTab, session, guestInfo])

  const getChatIdentifier = () => {
    if (session?.user?.email) {
      return session.user.email
    }
    if (guestInfo?.phone) {
      return `${guestInfo.phone} (${guestInfo.name})`
    }
    return null
  }

  async function fetchChats() {
    const identifier = getChatIdentifier()
    if (!identifier) return

    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .or(`title.eq.[Chat] ${identifier},title.eq.[Reply] ${identifier}`)
        .order('created_at', { ascending: true })

      if (error) throw error
      if (data) {
        setChatHistory(data)
      }
    } catch (err) {
      console.error('Lỗi khi tải tin nhắn:', err)
    }
  }

  // Handle Guest Chat Registration
  const handleRegisterChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestNameInput.trim() || !guestPhoneInput.trim()) {
      alert('Vui lòng điền đầy đủ Tên và Số điện thoại!')
      return
    }
    const info = { name: guestNameInput.trim(), phone: guestPhoneInput.trim() }
    setGuestInfo(info)
    localStorage.setItem('haisan_chat_guest', JSON.stringify(info))
  }

  // Submit Feedback / Ratings
  async function handleRatingSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || content.trim().length < 10) {
      setError('Vui lòng điền tiêu đề và nội dung góp ý (tối thiểu 10 ký tự).')
      return
    }

    setLoading(true)
    setError('')
    try {
      const { error: insertError } = await supabase
        .from('feedbacks')
        .insert({
          user_id: session?.user?.id || null,
          title: `[Feedback] ${title.trim()}`,
          content: content.trim(),
          rating: rating
        })

      if (insertError) throw insertError

      setSuccess(true)
      setTitle('')
      setContent('')
      setRating(5)
    } catch (err: any) {
      setError(err.message || 'Lỗi khi gửi góp ý.')
    } finally {
      setLoading(false)
    }
  }

  // Submit Pre-Order Seafood Request
  async function handlePreorderSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!preorderName.trim() || !preorderContact.trim()) {
      setError('Vui lòng điền tên loại hải sản và thông tin liên hệ của bạn.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const structuredContent = `Số lượng cần tìm: ${preorderQty || 'Không giới hạn'} | Thông tin liên lạc: ${preorderContact} | Chi tiết: ${preorderDesc || 'Không có mô tả chi tiết'}`
      
      const { error: insertError } = await supabase
        .from('feedbacks')
        .insert({
          user_id: session?.user?.id || null,
          title: `[Pre-Order] ${preorderName.trim()}`,
          content: structuredContent,
          rating: 5
        })

      if (insertError) throw insertError

      setSuccess(true)
      setPreorderName('')
      setPreorderQty('')
      setPreorderContact('')
      setPreorderDesc('')
    } catch (err: any) {
      setError(err.message || 'Lỗi khi gửi yêu cầu đặt trước.')
    } finally {
      setLoading(false)
    }
  }

  // Send Chat Message
  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault()
    const identifier = getChatIdentifier()
    if (!identifier || !chatMessage.trim()) return

    setLoadingChat(true)
    try {
      const { error } = await supabase
        .from('feedbacks')
        .insert({
          user_id: session?.user?.id || null,
          title: `[Chat] ${identifier}`,
          content: chatMessage.trim(),
          rating: 5
        })

      if (error) throw error
      setChatMessage('')
      fetchChats()
    } catch (err: any) {
      alert('Không thể gửi tin nhắn: ' + err.message)
    } finally {
      setLoadingChat(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/10 to-slate-100/50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl mt-6 mb-20 flex flex-col items-center animate-in fade-in duration-500">
        
        {/* Navigation Tabs - Apple Style Glassmorphism */}
        <div className="w-full bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl p-1.5 flex gap-1 mb-8 shadow-sm">
          <button
            onClick={() => { setActiveTab('rating'); setSuccess(false); setError(''); }}
            className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'rating' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Đánh giá</span>
          </button>
          
          <button
            onClick={() => { setActiveTab('preorder'); setSuccess(false); setError(''); }}
            className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'preorder' 
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Fish className="w-4 h-4" />
            <span>Đặt trước hải sản hiếm</span>
          </button>

          <button
            onClick={() => { setActiveTab('chat'); setSuccess(false); setError(''); }}
            className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'chat' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/10' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat với Admin</span>
          </button>
        </div>

        {/* Tab 1: Ratings & Feedback */}
        {activeTab === 'rating' && (
          <div className="w-full bg-white p-6 sm:p-10 rounded-3xl shadow-lg shadow-slate-100 border border-slate-100">
            {success ? (
              <div className="text-center py-10 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-100">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Cảm ơn góp ý của bạn!</h2>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm leading-relaxed">Đánh giá của bạn đã được ghi nhận thành công và sẽ được Admin phản hồi sớm nhất.</p>
                <button
                  onClick={() => setSuccess(false)}
                  className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-xl"
                >
                  Gửi thêm góp ý
                </button>
              </div>
            ) : (
              <form onSubmit={handleRatingSubmit} className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-extrabold text-slate-900 flex items-center justify-center gap-2">
                    <Sparkles className="w-6 h-6 text-yellow-500" />
                    Đánh Giá Chất Lượng Dịch Vụ
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Ý kiến của bạn là động lực giúp chúng tôi mang hải sản tươi ngon hơn mỗi ngày.</p>
                </div>

                {error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">
                    <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                {/* Star Picker */}
                <div className="flex flex-col items-center gap-2.5 py-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chọn mức độ hài lòng</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-all hover:scale-125 duration-200 active:scale-90"
                      >
                        <Star
                          className={`w-9 h-9 transition-colors ${
                            star <= (hoverRating || rating)
                              ? 'fill-yellow-400 text-yellow-400 filter drop-shadow-[0_2px_8px_rgba(250,204,21,0.25)]'
                              : 'fill-slate-100 text-slate-350'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Tiêu đề đánh giá *</label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all text-sm font-semibold"
                    placeholder="VD: Hải sản giao rất tươi, Giao hàng nhanh..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Chi tiết góp ý *</label>
                  <textarea
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    minLength={10}
                    rows={5}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all resize-none text-sm font-medium leading-relaxed"
                    placeholder="Chia sẻ trải nghiệm ăn thử hải sản hoặc bất cứ điều gì bạn chưa hài lòng..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/15 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Gửi đánh giá ngay</span>}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Rare Seafood Pre-Order */}
        {activeTab === 'preorder' && (
          <div className="w-full bg-white p-6 sm:p-10 rounded-3xl shadow-lg shadow-slate-100 border border-slate-100">
            {success ? (
              <div className="text-center py-10 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-orange-100">
                  <CheckCircle2 className="w-8 h-8 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Đã gửi yêu cầu gom order!</h2>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm leading-relaxed">Chúng tôi đã lưu lại thông tin loại cá/hải sản bạn mong muốn. Khi tàu cập bến có đúng loại đó, chúng tôi sẽ lập tức gọi điện báo cho bạn.</p>
                <button
                  onClick={() => setSuccess(false)}
                  className="bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg"
                >
                  Đặt trước sản phẩm khác
                </button>
              </div>
            ) : (
              <form onSubmit={handlePreorderSubmit} className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-extrabold text-slate-900 flex items-center justify-center gap-2">
                    <Fish className="w-6 h-6 text-orange-500 animate-pulse" />
                    Đặt Trước Hải Sản Tươi Hiếm Theo Mùa
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Muốn ăn cá thu một nắng nguyên con, cá bớp khủng, ghẹ xanh Phan Thiết xịn lột vỏ... Hãy đặt trước để khi có chuyến tàu cập bến chúng tôi gom đơn giao luôn!</p>
                </div>

                {error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">
                    <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Tên loại cá / hải sản mong muốn *</label>
                  <input
                    required
                    value={preorderName}
                    onChange={(e) => setPreorderName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3.5 text-slate-800 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all text-sm font-semibold"
                    placeholder="VD: Cá mú đỏ đại dương, Cá chình biển, Ghẹ xanh trứng..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Số lượng ước tính</label>
                    <input
                      value={preorderQty}
                      onChange={(e) => setPreorderQty(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3.5 text-slate-800 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all text-sm font-semibold"
                      placeholder="VD: 2 kg, 1 con lớn..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Số điện thoại / Zalo liên hệ *</label>
                    <input
                      required
                      value={preorderContact}
                      onChange={(e) => setPreorderContact(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3.5 text-slate-800 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all text-sm font-semibold"
                      placeholder="Nhập SĐT để gọi khi có cá..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Yêu cầu đặc biệt (tùy chọn)</label>
                  <textarea
                    value={preorderDesc}
                    onChange={(e) => setPreorderDesc(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3.5 text-slate-800 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all resize-none text-sm font-medium leading-relaxed"
                    placeholder="Mô tả cụ thể (ví dụ: cần làm sạch mang cá, chỉ lấy cá còn sống, hoặc cắt khoanh sẵn giúp)..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/15 hover:shadow-xl transition-all flex items-center justify-center gap-2 border border-orange-600/10"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Đăng ký đặt trước ngay</span>}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 3: Chat with Admin */}
        {activeTab === 'chat' && (
          <div className="w-full bg-white rounded-3xl shadow-lg shadow-slate-100 border border-slate-150 flex flex-col h-[520px] overflow-hidden">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4 flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white border border-white/20">
                  💬
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base leading-tight">Admin Hải Sản Sạch</h3>
                  <span className="text-[10px] text-emerald-100 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                    Đang online để hỗ trợ bạn
                  </span>
                </div>
              </div>
            </div>

            {/* Content area */}
            {!getChatIdentifier() ? (
              <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-slate-50">
                <HelpCircle className="w-12 h-12 text-slate-350 mb-3 animate-bounce" />
                <h4 className="font-bold text-slate-800 text-lg mb-1">Trò chuyện trực tiếp</h4>
                <p className="text-slate-500 text-xs max-w-sm mb-6 leading-relaxed">Vui lòng cung cấp Tên và SĐT để chúng tôi lưu lại thông tin cuộc trò chuyện để tiện tư vấn nhé!</p>
                
                <form onSubmit={handleRegisterChat} className="w-full max-w-xs space-y-4">
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      required
                      type="text"
                      placeholder="Nhập tên của bạn"
                      value={guestNameInput}
                      onChange={(e) => setGuestNameInput(e.target.value)}
                      className="w-full border border-slate-200/80 bg-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      required
                      type="tel"
                      placeholder="Số điện thoại / Zalo"
                      value={guestPhoneInput}
                      onChange={(e) => setGuestPhoneInput(e.target.value)}
                      className="w-full border border-slate-200/80 bg-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-emerald-500/10"
                  >
                    Bắt đầu Chat
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
                
                {/* Messages view */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  {chatHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                      <span className="text-4xl mb-2">👋</span>
                      <p className="font-bold text-slate-700 text-sm">Xin chào {guestInfo?.name || 'bạn'}!</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Hãy gửi tin nhắn đầu tiên cho Admin để được tư vấn các loại hải sản đặc biệt nhé.</p>
                    </div>
                  ) : (
                    chatHistory.map((chat) => {
                      const isReply = chat.title.startsWith('[Reply]')
                      return (
                        <div key={chat.id} className={`flex flex-col ${isReply ? 'items-start' : 'items-end'}`}>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                            isReply 
                              ? 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-sm' 
                              : 'bg-emerald-600 text-white rounded-tr-sm'
                          }`}>
                            {chat.content}
                          </div>
                          <span className="text-[9px] text-slate-400 font-semibold mt-1 px-1">
                            {new Date(chat.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Message input */}
                <form onSubmit={handleSendChat} className="bg-white border-t border-slate-200/85 p-3 flex gap-2 shrink-0">
                  <input
                    required
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Nhập nội dung tư vấn..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={loadingChat || !chatMessage.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white p-3 rounded-xl transition-all shadow shadow-emerald-500/10 flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingChat ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
