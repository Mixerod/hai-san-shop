'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Mail, Lock, Loader2, AlertCircle, CheckCircle2, User } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
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

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setIsForgotPassword(false)
    setError('')
    setSuccessMsg('')
  }

  return (
    <div className="w-full min-h-[92vh] flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden bg-slate-950">
      
      {/* Premium Ocean Background Shimmers */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Decorative Wave Sweeper Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.1),rgba(2,6,23,0.85))] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">

        {/* Back link */}
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 text-sm font-extrabold uppercase tracking-wider text-slate-400 hover:text-cyan-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Quay lại trang chủ
        </Link>

        {/* Glassmorphism Card */}
        <div className="bg-slate-900/60 backdrop-blur-2xl rounded-3xl border border-slate-800 p-8 sm:p-10 shadow-[0_25px_60px_rgba(2,6,23,0.9)] relative overflow-hidden">
          
          {/* Subtle top light glow */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-cyan-950/60 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse">
              <Lock className="w-7 h-7 text-cyan-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              {isForgotPassword ? 'Khôi phục mật khẩu' : isLogin ? 'Chào mừng trở lại!' : 'Đăng ký tài khoản'}
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              {isForgotPassword 
                ? 'Nhập tên đăng nhập hoặc email để nhận liên kết khôi phục' 
                : isLogin ? 'Đăng nhập để lưu và quản lý đơn hàng của bạn' : 'Đăng ký nhanh chóng để mua sắm dễ dàng'}
            </p>
          </div>

          {/* Tab toggle */}
          {!isForgotPassword && (
            <div className="flex p-1 bg-slate-950/60 border border-slate-800 rounded-2xl mb-8">
              <button
                type="button"
                onClick={() => !isLogin && toggleMode()}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${
                  isLogin
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => isLogin && toggleMode()}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${
                  !isLogin
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Đăng ký
              </button>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="mb-6 flex items-start gap-3 bg-red-950/40 border border-red-500/30 text-red-300 p-4 rounded-2xl text-sm shadow-[0_0_15px_rgba(239,68,68,0.1)] animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5.5 h-5.5 flex-shrink-0 text-red-400 mt-0.5" />
              <p className="leading-relaxed font-semibold">{error}</p>
            </div>
          )}
          {successMsg && (
            <div className="mb-6 flex items-start gap-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 p-4 rounded-2xl text-sm shadow-[0_0_15px_rgba(16,185,129,0.1)] animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-5.5 h-5.5 flex-shrink-0 text-emerald-400 mt-0.5" />
              <p className="leading-relaxed font-semibold">{successMsg}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Email/Username */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                Tên đăng nhập hoặc Email
              </label>
              <input
                required
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-6 h-14 text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
                placeholder="Ví dụ: chamuc hoặc email..."
              />
            </div>

            {/* Password */}
            {!isForgotPassword && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                    Mật khẩu
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMsg(''); }}
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline transition-all cursor-pointer"
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
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-6 h-14 text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
                  placeholder="Tối thiểu 6 ký tự"
                />
              </div>
            )}

            {/* Confirm Password (register only) */}
            {!isLogin && !isForgotPassword && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                  Xác nhận mật khẩu
                </label>
                <input
                  required={!isLogin && !isForgotPassword}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-6 h-14 text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
                  placeholder="Nhập lại mật khẩu"
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 active:scale-[0.98] disabled:from-slate-850 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-sm rounded-2xl transition-all mt-4 shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>{isForgotPassword ? 'Gửi liên kết' : isLogin ? 'Đăng nhập ngay' : 'Đăng ký ngay'}</span>
              )}
            </button>

            {isForgotPassword && (
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMsg(''); }}
                  className="text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white transition-all cursor-pointer"
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
