'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Mail, Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  // Đã giữ nguyên logic cũ
  const [isLogin, setIsLogin] = useState(true)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const formatIdentifier = (input: string) => {
    if (input.includes('@')) return input.trim()
    return `${input.trim().toLowerCase()}@user.haisanshop.com`
  }

  // Đã giữ nguyên logic cũ - handleSubmit Supabase auth
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMsg('')

    try {
      let finalEmail = formatIdentifier(identifier)

      // Tra cứu chéo: Nếu nhập Username, tìm xem có email thật nào được liên kết trong bảng profiles không
      if (!identifier.includes('@')) {
        const username = identifier.trim().toLowerCase()
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', username)
          .single()
        
        if (profileData && profileData.email) {
          finalEmail = profileData.email
        }
      }

      if (isForgotPassword) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(finalEmail, {
          redirectTo: `${window.location.origin}/profile`,
        })
        if (resetError) throw resetError
        setSuccessMsg('Đã gửi hướng dẫn khôi phục! Vui lòng kiểm tra hộp thư của bạn (nếu bạn đã liên kết Email thật).')
        setIdentifier('')
      } else if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: finalEmail, password })
        if (signInError) throw signInError
        router.push('/')
        router.refresh()
      } else {
        if (password !== confirmPassword) {
          throw new Error('Mật khẩu xác nhận không khớp.')
        }
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: finalEmail, password })
        if (signUpError) throw signUpError
        
        // Lưu thông tin tra cứu vào bảng profiles
        if (signUpData.user) {
          await supabase.from('profiles').upsert({
            id: signUpData.user.id,
            username: identifier.trim().toLowerCase(),
            email: finalEmail
          })
        }

        // Cố gắng tự động đăng nhập sau khi đăng ký thành công
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: finalEmail, password })
        if (signInError) {
          setSuccessMsg('Đăng ký thành công! Vui lòng đăng nhập lại.')
          setIsLogin(true)
        } else {
          router.push('/')
          router.refresh()
        }
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  // Đã giữ nguyên logic cũ - toggleMode
  const toggleMode = () => {
    setIsLogin(!isLogin)
    setIsForgotPassword(false)
    setError('')
    setSuccessMsg('')
  }

  return (
    <div className="w-full flex flex-col items-center justify-center px-4 py-16 min-h-[calc(100vh-64px)]">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">

        {/* Back link */}
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Quay lại trang chủ
        </Link>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <Lock className="w-7 h-7 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              {isForgotPassword ? 'Khôi phục mật khẩu' : isLogin ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}
            </h1>
            <p className="text-slate-500 text-sm">
              {isForgotPassword 
                ? 'Nhập tên đăng nhập hoặc email để nhận liên kết khôi phục' 
                : isLogin ? 'Đăng nhập để quản lý đơn hàng của bạn' : 'Tham gia để nhận những ưu đãi tốt nhất'}
            </p>
          </div>

          {/* Tab toggle */}
          {!isForgotPassword && (
            <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
              <button
                type="button"
                onClick={() => !isLogin && toggleMode()}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  isLogin
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => isLogin && toggleMode()}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  !isLogin
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Đăng ký
              </button>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          {successMsg && (
            <div className="mb-5 flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-sm animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{successMsg}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email/Username */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Tên đăng nhập hoặc Email</label>
              <input
                required
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-sm"
                placeholder="Nhập tên đăng nhập hoặc email..."
              />
            </div>

            {/* Password */}
            {!isForgotPassword && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700">Mật khẩu</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMsg(''); }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-sm"
                  placeholder="Tối thiểu 6 ký tự"
                />
              </div>
            )}

            {/* Confirm Password (register only) */}
            {!isLogin && !isForgotPassword && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-semibold text-slate-700">Xác nhận mật khẩu</label>
                <input
                  required={!isLogin && !isForgotPassword}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-sm"
                  placeholder="Nhập lại mật khẩu"
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all mt-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>{isForgotPassword ? 'Gửi liên kết khôi phục' : isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}</span>
              )}
            </button>

            {isForgotPassword && (
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMsg(''); }}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Quay lại đăng nhập
                </button>
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  )
}
