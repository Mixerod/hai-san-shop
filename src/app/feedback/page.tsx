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
    <div className="w-full flex flex-col items-center px-4">
    <div className="w-full max-w-2xl mt-10 mb-20 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Page Header */}
      <div className="text-center mb-8 w-full">
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
          <MessageSquare className="w-7 h-7 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Góp ý & Đánh giá</h1>
        <p className="text-slate-500 text-base max-w-md mx-auto">
          Đánh giá chất lượng dịch vụ và để lại góp ý giúp chúng tôi phục vụ đồng nghiệp tốt hơn.
        </p>
      </div>

      {/* Form Card */}
      <div className="w-full bg-white p-8 rounded-3xl shadow-sm border border-slate-100">

        {success ? (
          <div className="text-center py-10 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Cảm ơn góp ý của bạn!</h2>
            <p className="text-slate-500 mb-8">Phản hồi của bạn đã được ghi nhận và sẽ được xem xét sớm nhất.</p>
            <button
              onClick={() => setSuccess(false)}
              className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold py-2.5 px-8 rounded-xl transition-all shadow-sm shadow-blue-500/20"
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
            <div className="flex flex-col items-center gap-2 py-2">
              <label className="text-sm font-medium text-slate-600">Đánh giá chung</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'fill-slate-100 text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Tiêu đề <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-sm"
                placeholder="Ví dụ: Đề xuất thêm món, Chất lượng sản phẩm..."
              />
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Nội dung chi tiết <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                minLength={10}
                rows={5}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none text-sm"
                placeholder="Vui lòng chia sẻ chi tiết góp ý của bạn (tối thiểu 10 ký tự)..."
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <span>Gửi đánh giá</span>
                  <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
