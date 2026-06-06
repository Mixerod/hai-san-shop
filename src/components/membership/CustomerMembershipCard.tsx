'use client'

// ─── B8 — UI KHÁCH: huy hiệu hạng + thanh tiến độ (tab "Thành viên" ở /profile) ──────
// Màn KHÁCH (đã đăng nhập). CHỈ ĐỌC qua RLS:
//   • profiles của chính mình (owner-read) — tier_code + tích lũy
//   • membership_tiers công khai (is_active=true) — để hiển thị quyền lợi + ngưỡng hạng kế
// KHÔNG ghi hạng/tích lũy từ client, KHÔNG gọi RPC admin_*. Xếp hạng theo TIỀN lifetime (02 mục 6).
// Theme SÁNG khớp /profile (khác với ui.tsx admin theme tối).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Crown,
  Loader2,
  AlertCircle,
  Percent,
  Truck,
  Sparkles,
  TrendingUp,
  ShoppingBag,
} from 'lucide-react'

// ─── Types khớp schema 03 ───────────────────────────────────────────────────────────
type MembershipTier = {
  code: string
  name: string
  sort_order: number
  color: string | null
  min_spend: number
  min_kg: number
  discount_percent: number
  free_ship: boolean
  perks: string[]
  is_active: boolean
}

type MembershipProfile = {
  tier_code: string
  lifetime_spend: number
  lifetime_kg: number
  tier_updated_at: string | null
}

const DEFAULT_TIER_COLOR = '#94a3b8' // slate-400, fallback khi tier.color null

function formatVND(n: number): string {
  return (n ?? 0).toLocaleString('vi-VN') + 'đ'
}

function formatKg(n: number): string {
  return (n ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' kg'
}

// perks lưu jsonb — supabase trả về mảng JS; vẫn guard cho dữ liệu lệch.
function normalizePerks(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((p): p is string => typeof p === 'string')
  return []
}

export default function CustomerMembershipCard({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [profile, setProfile] = useState<MembershipProfile | null>(null)
  const [tiers, setTiers] = useState<MembershipTier[]>([])

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(false)
      try {
        const [profileRes, tiersRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('tier_code, lifetime_spend, lifetime_kg, tier_updated_at')
            .eq('id', userId)
            .maybeSingle(),
          supabase
            .from('membership_tiers')
            .select('code, name, sort_order, color, min_spend, min_kg, discount_percent, free_ship, perks, is_active')
            .order('sort_order', { ascending: true }),
        ])

        if (!alive) return

        if (profileRes.error) throw profileRes.error
        if (tiersRes.error) throw tiersRes.error

        const prof = profileRes.data
        setProfile(
          prof
            ? {
                tier_code: prof.tier_code ?? 'member',
                lifetime_spend: Number(prof.lifetime_spend ?? 0),
                lifetime_kg: Number(prof.lifetime_kg ?? 0),
                tier_updated_at: prof.tier_updated_at ?? null,
              }
            : null
        )
        setTiers(
          (tiersRes.data ?? []).map((t) => ({
            ...t,
            min_spend: Number(t.min_spend ?? 0),
            min_kg: Number(t.min_kg ?? 0),
            discount_percent: Number(t.discount_percent ?? 0),
            perks: normalizePerks(t.perks),
          })) as MembershipTier[]
        )
      } catch (err) {
        console.error('Error loading membership:', err)
        if (alive) setError(true)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [userId])

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-3xl p-16 flex flex-col items-center justify-center gap-4 shadow-sm">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="font-bold text-sm text-slate-500 animate-pulse">Đang tải hạng thành viên...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 flex items-start gap-3 text-amber-800 shadow-sm">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm">Không tải được thông tin hạng thành viên</p>
          <p className="text-xs mt-1 font-medium text-amber-700">
            Vui lòng thử tải lại trang. Nếu vẫn lỗi, hãy liên hệ shop để được hỗ trợ.
          </p>
        </div>
      </div>
    )
  }

  // Trạng thái rỗng: chưa có profile (hiếm — auth page đã upsert profile khi đăng ký).
  if (!profile) {
    return <EmptyMembership />
  }

  const currentTier = tiers.find((t) => t.code === profile.tier_code) ?? null
  // Hạng kế tiếp = hạng đầu tiên có sort_order lớn hơn hạng hiện tại (danh sách đã sort tăng dần).
  const nextTier = currentTier
    ? tiers.find((t) => t.sort_order > currentTier.sort_order) ?? null
    : tiers[0] ?? null

  const tierColor = currentTier?.color || DEFAULT_TIER_COLOR

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ─── KHỐI A — Thẻ hạng hiện tại ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden bg-white border rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500"
        style={{ borderColor: `${tierColor}33` }}
      >
        {/* Dải màu trang trí theo màu hạng */}
        <div
          className="absolute inset-x-0 top-0 h-28 opacity-[0.07]"
          style={{ background: `linear-gradient(135deg, ${tierColor}, transparent)` }}
        />

        <div className="relative p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
              style={{
                background: `linear-gradient(135deg, ${tierColor}, ${tierColor}cc)`,
                boxShadow: `0 10px 25px -5px ${tierColor}55`,
              }}
            >
              <Crown className="w-8 h-8 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                Hạng thành viên
              </p>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-none" style={{ color: tierColor }}>
                {currentTier?.name ?? 'Thành viên'}
              </h2>
            </div>
          </div>

          {/* Số liệu tích lũy */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Tổng chi tiêu</p>
              <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tight break-words">
                {formatVND(profile.lifetime_spend)}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Tổng khối lượng</p>
              <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tight break-words">
                {formatKg(profile.lifetime_kg)}
              </p>
            </div>
          </div>

          {/* Quyền lợi hạng hiện tại */}
          {currentTier && (
            <div className="mt-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Quyền lợi của bạn
              </p>
              <div className="flex flex-wrap gap-2">
                {currentTier.discount_percent > 0 && (
                  <Perk icon={<Percent className="w-3.5 h-3.5" />} color={tierColor}>
                    Giảm {currentTier.discount_percent}% mọi đơn
                  </Perk>
                )}
                {currentTier.free_ship && (
                  <Perk icon={<Truck className="w-3.5 h-3.5" />} color={tierColor}>
                    Free ship khu vực Thủ Đức
                  </Perk>
                )}
                {currentTier.perks.map((perk) => (
                  <Perk key={perk} icon={<Sparkles className="w-3.5 h-3.5" />} color={tierColor}>
                    {perk}
                  </Perk>
                ))}
                {currentTier.discount_percent === 0 &&
                  !currentTier.free_ship &&
                  currentTier.perks.length === 0 && (
                    <p className="text-xs text-slate-400 font-medium italic">
                      Hãy mua sắm để lên hạng và nhận ưu đãi nhé!
                    </p>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── KHỐI B — Thanh tiến độ lên hạng kế ──────────────────────────────────── */}
      <ProgressToNextTier
        spend={profile.lifetime_spend}
        nextTier={nextTier}
        hasCurrentTier={!!currentTier}
      />

      {/* Gợi ý mua sắm */}
      <div className="text-center">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/15 hover:shadow-orange-500/25 border border-orange-600/10"
        >
          <ShoppingBag className="w-5 h-5" />
          Tiếp tục mua sắm
        </Link>
      </div>
    </div>
  )
}

// ─── Thanh tiến độ tới hạng kế (theo TIỀN — CĐ-2 money-only) ────────────────────────
function ProgressToNextTier({
  spend,
  nextTier,
  hasCurrentTier,
}: {
  spend: number
  nextTier: MembershipTier | null
  hasCurrentTier: boolean
}) {
  // Đã ở hạng cao nhất (có hạng hiện tại nhưng không còn hạng kế).
  if (hasCurrentTier && !nextTier) {
    return (
      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200/60 rounded-3xl p-8 text-center shadow-sm">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-cyan-100">
          <Crown className="w-7 h-7 text-cyan-500" />
        </div>
        <p className="text-lg font-black text-slate-800">Bạn đang ở hạng cao nhất 🎉</p>
        <p className="text-sm text-slate-500 font-medium mt-1">Cảm ơn bạn đã đồng hành cùng shop!</p>
      </div>
    )
  }

  if (!nextTier) return null

  const remaining = Math.max(0, nextTier.min_spend - spend)
  const percent =
    nextTier.min_spend > 0 ? Math.min(100, Math.round((spend / nextTier.min_spend) * 100)) : 0
  const nextColor = nextTier.color || DEFAULT_TIER_COLOR

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" />
          Tiến độ lên hạng
        </p>
        <span
          className="text-[11px] font-black px-3 py-1 rounded-full"
          style={{ backgroundColor: `${nextColor}1a`, color: nextColor }}
        >
          {nextTier.name}
        </span>
      </div>

      {/* Thanh tiến độ */}
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${nextColor}, ${nextColor}cc)`,
          }}
        />
      </div>

      <div className="flex items-center justify-between mt-3 text-xs">
        <span className="font-bold text-slate-700">{percent}%</span>
        <span className="font-medium text-slate-500">{formatVND(nextTier.min_spend)}</span>
      </div>

      <p className="mt-4 text-sm text-slate-600 font-medium text-center leading-relaxed">
        {remaining > 0 ? (
          <>
            Còn <span className="font-black text-slate-900">{formatVND(remaining)}</span> nữa để lên{' '}
            <span className="font-black" style={{ color: nextColor }}>
              {nextTier.name}
            </span>
          </>
        ) : (
          <span className="font-bold text-emerald-600">Bạn đã đủ điều kiện lên {nextTier.name}! 🎉</span>
        )}
      </p>
    </div>
  )
}

// ─── Chip quyền lợi ─────────────────────────────────────────────────────────────────
function Perk({
  icon,
  color,
  children,
}: {
  icon: React.ReactNode
  color: string
  children: React.ReactNode
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border"
      style={{ backgroundColor: `${color}12`, borderColor: `${color}33`, color }}
    >
      {icon}
      {children}
    </span>
  )
}

// ─── Trạng thái rỗng (chưa có profile/tích lũy) ─────────────────────────────────────
function EmptyMembership() {
  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm">
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
        <Crown className="w-10 h-10 text-slate-400" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">Chưa có hạng thành viên</h3>
      <p className="text-slate-500 mb-8 font-semibold text-sm max-w-xs mx-auto leading-relaxed">
        Hãy mua sắm để bắt đầu tích lũy và lên hạng thành viên nhận nhiều ưu đãi!
      </p>
      <Link
        href="/products"
        className="inline-flex bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/15 hover:shadow-orange-500/25 border border-orange-600/10"
      >
        Bắt đầu mua sắm ngay
      </Link>
    </div>
  )
}
