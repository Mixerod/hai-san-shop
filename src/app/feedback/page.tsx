'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, MessageSquare, Loader2, CheckCircle2, AlertCircle, Star } from 'lucide-react'

export default function FeedbackPage() {
  const [session, setSession] = useState<any>(null)
  
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề góp ý.')
      return
    }
    
    if (content.trim().length < 10) {
      setError('Vui lòng nhập nội dung tối thiểu 10 ký tự.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const finalUserId = session?.user?.id || null

      const { error: insertError } = await supabase
        .from('feedbacks')
        .insert({
          user_id: finalUserId,
          title: title.trim(),
          content: content.trim(),
          rating: rating
        })

      if (insertError) throw insertError

      setSuccess(true)
      setTitle('')
      setContent('')
      setRating(5)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Có lỗi xảy ra khi gửi góp ý. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/15 to-slate-100/50 flex flex-col items-center px-4 py-12">
    <div className="w-full max-w-2xl mt-6 mb-20 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Page Header */}
      <div className="text-center mb-8 w-full px-2">
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100/70 shadow-sm transition-transform">
          <MessageSquare className="w-7 h-7 text-blue-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Góp ý & Đánh giá</h1>
        <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          Đánh giá chất lượng dịch vụ và để lại góp ý giúp chúng tôi phục vụ bạn tốt hơn từng ngày.
        </p>
      </div>

      {/* Form Card */}
      <div className="w-full bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 hover:border-blue-500/10 transition-all duration-500">

        {success ? (
          <div className="text-center py-10 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-100">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Cảm ơn góp ý của bạn!</h2>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm leading-relaxed">Phản hồi của bạn đã được ghi nhận và sẽ được chúng tôi xem xét, cải thiện sớm nhất.</p>
            <button
              onClick={() => setSuccess(false)}
              className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30"
            >
              Gửi phản hồi khác
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm animate-in fade-in">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {/* Rating */}
            <div className="flex flex-col items-center gap-2.5 py-3 bg-slate-50/50 rounded-2xl border border-slate-100/50">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Đánh giá chung</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-all hover:scale-125 hover:rotate-6 active:scale-95 duration-200"
                  >
                    <Star
                      className={`w-9 h-9 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'fill-yellow-400 text-yellow-400 filter drop-shadow-[0_2px_8px_rgba(250,204,21,0.25)]'
                          : 'fill-slate-100 text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Tiêu đề góp ý <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all text-sm font-medium"
                placeholder="Ví dụ: Đề xuất thêm món mới, Chất lượng sản phẩm..."
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Nội dung chi tiết <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                minLength={10}
                rows={5}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all resize-none text-sm font-medium leading-relaxed"
                placeholder="Vui lòng chia sẻ chi tiết trải nghiệm hoặc góp ý của bạn (tối thiểu 10 ký tự)..."
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/15 hover:shadow-xl hover:shadow-blue-500/25 mt-4 border border-blue-700/10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang gửi phản hồi...</span>
                </>
              ) : (
                <>
                  <span>Gửi đánh giá</span>
                  <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform duration-300" />
                </>
              )}
            </button>

          </form>
        )}

      </div>
    </div>
    </div>
  )
}
