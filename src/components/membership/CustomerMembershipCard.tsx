'use client'

// ─── B8/B9 — UI KHÁCH: huy hiệu hạng + tiến độ + ví voucher + quà (tab "Thành viên" /profile) ──
// Màn KHÁCH (đã đăng nhập). CHỈ ĐỌC qua RLS:
//   • profiles của chính mình (owner-read) — tier_code + tích lũy
//   • membership_tiers công khai (is_active=true) — để hiển thị quyền lợi + ngưỡng hạng kế
//   • customer_vouchers của chính mình (owner-read) + join voucher_definitions (đọc công khai) — KHỐI C
//   • customer_gifts của chính mình (owner-read) + join gifts (đọc công khai) — KHỐI D
// KHÔNG ghi hạng/tích lũy/voucher từ client, KHÔNG gọi RPC admin_*. Xếp hạng theo TIỀN lifetime (02 mục 6).
// Việc ÁP voucher (đánh dấu used) thực hiện ở /checkout qua RPC SECURITY DEFINER (B9) — KHÔNG ghi ở đây.
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
  Ticket,
  Gift,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  PackageCheck,
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

// ─── Types ví voucher / quà (KHỐI C, D) — khớp schema 03 mục 4 ──────────────────────
type VoucherType = 'percent' | 'fixed' | 'free_ship'
type VoucherStatus = 'active' | 'used' | 'expired' | 'revoked'

type VoucherDefinition = {
  name: string
  type: VoucherType
  value: number
  min_order: number
  max_discount: number | null
}

type CustomerVoucher = {
  id: string
  status: VoucherStatus
  issued_at: string
  expires_at: string | null
  used_at: string | null
  discount_applied: number | null
  voucher_definitions: VoucherDefinition | null
}

type GiftStatus = 'granted' | 'delivered' | 'cancelled'

type GiftDefinition = {
  name: string
  image_url: string | null
}

type CustomerGift = {
  id: string
  status: GiftStatus
  granted_at: string
  gifts: GiftDefinition | null
}

const DEFAULT_TIER_COLOR = '#94a3b8' // slate-400, fallback khi tier.color null

function formatVND(n: number): string {
  return (n ?? 0).toLocaleString('vi-VN') + 'đ'
}

function formatKg(n: number): string {
  return (n ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' kg'
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Mô tả giá trị voucher để khách đọc nhanh.
function describeVoucher(def: VoucherDefinition | null): string {
  if (!def) return 'Ưu đãi'
  if (def.type === 'percent') {
    const cap = def.max_discount ? ` (tối đa ${formatVND(def.max_discount)})` : ''
    return `Giảm ${def.value}%${cap}`
  }
  if (def.type === 'fixed') return `Giảm ${formatVND(def.value)}`
  return 'Miễn phí vận chuyển'
}

// Voucher còn dùng được không (active + chưa hết hạn). Hết hạn nhưng vẫn status='active'
// (cron expire chưa chạy) thì coi như hết hạn ở phía hiển thị.
function isVoucherExpired(v: CustomerVoucher): boolean {
  if (!v.expires_at) return false
  const exp = new Date(v.expires_at).getTime()
  return !Number.isNaN(exp) && exp < Date.now()
}

// perks lưu jsonb — supabase trả về mảng JS; vẫn guard cho dữ liệu lệch.
function normalizePerks(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((p): p is string => typeof p === 'string')
  return []
}

// Quan hệ join (to-one) đôi khi được supabase-js trả về dạng mảng 1 phần tử — lấy phần tử đầu.
function pickOne<T>(rel: unknown): T | null {
  if (Array.isArray(rel)) return (rel[0] as T) ?? null
  if (rel && typeof rel === 'object') return rel as T
  return null
}

function normalizeVouchers(raw: unknown): CustomerVoucher[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row): CustomerVoucher => {
    const r = row as Record<string, unknown>
    const def = pickOne<Record<string, unknown>>(r.voucher_definitions)
    return {
      id: String(r.id),
      status: (r.status as VoucherStatus) ?? 'active',
      issued_at: String(r.issued_at ?? ''),
      expires_at: (r.expires_at as string | null) ?? null,
      used_at: (r.used_at as string | null) ?? null,
      discount_applied: r.discount_applied != null ? Number(r.discount_applied) : null,
      voucher_definitions: def
        ? {
            name: String(def.name ?? 'Ưu đãi'),
            type: (def.type as VoucherType) ?? 'fixed',
            value: Number(def.value ?? 0),
            min_order: Number(def.min_order ?? 0),
            max_discount: def.max_discount != null ? Number(def.max_discount) : null,
          }
        : null,
    }
  })
}

function normalizeGifts(raw: unknown): CustomerGift[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row): CustomerGift => {
    const r = row as Record<string, unknown>
    const g = pickOne<Record<string, unknown>>(r.gifts)
    return {
      id: String(r.id),
      status: (r.status as GiftStatus) ?? 'granted',
      granted_at: String(r.granted_at ?? ''),
      gifts: g ? { name: String(g.name ?? 'Quà tặng'), image_url: (g.image_url as string | null) ?? null } : null,
    }
  })
}

export default function CustomerMembershipCard({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [profile, setProfile] = useState<MembershipProfile | null>(null)
  const [tiers, setTiers] = useState<MembershipTier[]>([])
  const [vouchers, setVouchers] = useState<CustomerVoucher[]>([])
  const [gifts, setGifts] = useState<CustomerGift[]>([])
  // B13 — tăng để tải lại thẻ sau khi gộp đơn vãng lai (tích lũy/hạng thay đổi).
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(false)
      try {
        const [profileRes, tiersRes, vouchersRes, giftsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('tier_code, lifetime_spend, lifetime_kg, tier_updated_at')
            .eq('id', userId)
            .maybeSingle(),
          supabase
            .from('membership_tiers')
            .select('code, name, sort_order, color, min_spend, min_kg, discount_percent, free_ship, perks, is_active')
            .order('sort_order', { ascending: true }),
          supabase
            .from('customer_vouchers')
            .select('id, status, issued_at, expires_at, used_at, discount_applied, voucher_definitions(name, type, value, min_order, max_discount)')
            .eq('user_id', userId)
            .order('issued_at', { ascending: false }),
          supabase
            .from('customer_gifts')
            .select('id, status, granted_at, gifts(name, image_url)')
            .eq('user_id', userId)
            .order('granted_at', { ascending: false }),
        ])

        if (!alive) return

        if (profileRes.error) throw profileRes.error
        if (tiersRes.error) throw tiersRes.error
        // Ví/quà lỗi nhẹ thì để rỗng — không làm vỡ thẻ hạng (Khối A/B vẫn hiện).
        if (vouchersRes.error) console.error('Error loading vouchers:', vouchersRes.error)
        if (giftsRes.error) console.error('Error loading gifts:', giftsRes.error)

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
        setVouchers(normalizeVouchers(vouchersRes.data))
        setGifts(normalizeGifts(giftsRes.data))
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
  }, [userId, refreshTick])

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

      {/* ─── KHỐI C — Ví voucher ──────────────────────────────────────────────────── */}
      <VoucherWallet vouchers={vouchers} />

      {/* ─── KHỐI D — Quà đã nhận ─────────────────────────────────────────────────── */}
      <GiftsReceived gifts={gifts} />

      {/* ─── KHỐI E — Gộp đơn vãng lai cũ (B13) ───────────────────────────────────── */}
      <MergeGuestOrders userId={userId} onMerged={() => setRefreshTick((t) => t + 1)} />

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

// ─── KHỐI E — Gộp đơn vãng lai cũ (B13) ─────────────────────────────────────────────
// Khách từng đặt đơn KHÔNG đăng nhập (guest) có thể gộp vào tài khoản để được tính tích lũy.
// Khớp theo Tên + SĐT (parse phía server từ orders.note). Khách XÁC NHẬN trước khi gộp để
// giảm rủi ro khớp sai (07 mục 6). Mọi GHI qua RPC SECURITY DEFINER merge_guest_orders.
function MergeGuestOrders({ userId, onMerged }: { userId: string; onMerged: () => void }) {
  const [open, setOpen] = useState(false)
  const [prefilled, setPrefilled] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // Prefill Tên/SĐT từ profile của chính mình (owner-read) khi mở form.
  useEffect(() => {
    if (!open || prefilled) return
    let alive = true
    supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return
        if (data?.full_name) setName(String(data.full_name))
        if (data?.phone) setPhone(String(data.phone))
        setPrefilled(true)
      })
    return () => {
      alive = false
    }
  }, [open, prefilled, userId])

  const phoneDigits = phone.replace(/\D/g, '')
  const canMerge = name.trim().length > 0 && phoneDigits.length >= 9 && !busy

  async function handleMerge() {
    setBusy(true)
    setResult(null)
    try {
      const { data, error } = await supabase.rpc('merge_guest_orders', { p_name: name, p_phone: phone })
      if (error) throw error
      const count = Number(data ?? 0)
      if (count > 0) {
        setResult({ ok: true, msg: `Đã gộp ${count} đơn cũ vào tài khoản. Tích lũy & hạng đã được cập nhật.` })
        onMerged()
      } else {
        setResult({
          ok: false,
          msg: 'Không tìm thấy đơn vãng lai nào khớp Tên + SĐT. Hãy kiểm tra lại đúng tên & số điện thoại đã dùng khi đặt.',
        })
      }
    } catch (err) {
      console.error('merge_guest_orders error:', err)
      setResult({ ok: false, msg: 'Có lỗi khi gộp đơn. Vui lòng thử lại sau.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
        <PackageCheck className="w-3.5 h-3.5" />
        Gộp đơn mua trước đây
      </p>
      <p className="text-sm text-slate-500 font-medium mb-4 leading-relaxed">
        Từng đặt hàng khi <span className="font-bold text-slate-600">chưa đăng nhập</span>? Gộp các đơn đó
        vào tài khoản để được tính vào tích lũy & lên hạng. Cần đúng <span className="font-bold">Tên</span> và{' '}
        <span className="font-bold">Số điện thoại</span> đã dùng khi đặt.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
        >
          <PackageCheck className="w-4 h-4" />
          Gộp đơn cũ của tôi
        </button>
      ) : (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Họ tên (khi đặt đơn)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vd: Lê Minh Quyết"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Số điện thoại (khi đặt đơn)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xx xxx xxx"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {result && (
            <div
              className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ${
                result.ok
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border border-amber-200 text-amber-700'
              }`}
            >
              {result.ok ? (
                <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              )}
              <p className="font-medium leading-relaxed">{result.msg}</p>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={!canMerge}
              onClick={handleMerge}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:bg-blue-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
              {busy ? 'Đang gộp...' : 'Xác nhận gộp đơn'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setResult(null)
              }}
              className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors px-3 py-2.5"
            >
              Đóng
            </button>
          </div>
          {!canMerge && !busy && (
            <p className="text-[11px] text-slate-400 font-medium">
              Cần nhập Tên và Số điện thoại hợp lệ (tối thiểu 9 chữ số) để gộp.
            </p>
          )}
        </div>
      )}
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

// ─── KHỐI C — Ví voucher (active nổi bật + lịch sử thu gọn) ─────────────────────────
function VoucherWallet({ vouchers }: { vouchers: CustomerVoucher[] }) {
  const [showHistory, setShowHistory] = useState(false)

  // active + chưa hết hạn = dùng được; còn lại (used/expired/revoked/active-quá-hạn) -> lịch sử.
  const usable = vouchers.filter((v) => v.status === 'active' && !isVoucherExpired(v))
  const history = vouchers.filter((v) => !(v.status === 'active' && !isVoucherExpired(v)))

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5">
        <Ticket className="w-3.5 h-3.5" />
        Ví voucher của bạn
      </p>

      {usable.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
            <Ticket className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-500">Chưa có voucher khả dụng</p>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Mua sắm đạt mốc thưởng để nhận voucher ưu đãi nhé!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {usable.map((v) => (
            <VoucherTicket key={v.id} voucher={v} />
          ))}
          <Link
            href="/checkout"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors mt-1"
          >
            Dùng ngay khi thanh toán
            <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
          </Link>
        </div>
      )}

      {/* Lịch sử voucher (đã dùng / hết hạn / thu hồi) */}
      {history.length > 0 && (
        <div className="mt-5 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowHistory((s) => !s)}
            className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            Lịch sử voucher ({history.length})
          </button>
          {showHistory && (
            <div className="space-y-2 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
              {history.map((v) => (
                <VoucherTicket key={v.id} voucher={v} muted />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 1 thẻ voucher ──────────────────────────────────────────────────────────────────
function VoucherTicket({ voucher, muted = false }: { voucher: CustomerVoucher; muted?: boolean }) {
  const def = voucher.voucher_definitions
  const expired = isVoucherExpired(voucher)
  const statusLabel =
    voucher.status === 'used'
      ? 'Đã dùng'
      : voucher.status === 'revoked'
        ? 'Đã thu hồi'
        : voucher.status === 'expired' || expired
          ? 'Hết hạn'
          : 'Khả dụng'

  return (
    <div
      className={`relative flex items-stretch gap-3 rounded-2xl border p-4 transition-all ${
        muted
          ? 'border-slate-100 bg-slate-50/60 opacity-75'
          : 'border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50/50 hover:shadow-md'
      }`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          muted ? 'bg-slate-200/70 text-slate-400' : 'bg-orange-500 text-white shadow-sm'
        }`}
      >
        <Ticket className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`font-bold text-sm truncate ${muted ? 'text-slate-500' : 'text-slate-800'}`}>
          {def?.name ?? 'Ưu đãi'}
        </p>
        <p className={`text-xs font-semibold mt-0.5 ${muted ? 'text-slate-400' : 'text-orange-600'}`}>
          {describeVoucher(def)}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] font-medium text-slate-400">
          {def && def.min_order > 0 && <span>Đơn tối thiểu {formatVND(def.min_order)}</span>}
          {voucher.expires_at && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              HSD {formatDate(voucher.expires_at)}
            </span>
          )}
        </div>
      </div>
      <span
        className={`absolute top-3 right-3 text-[10px] font-black px-2 py-0.5 rounded-full ${
          statusLabel === 'Khả dụng'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-200 text-slate-500'
        }`}
      >
        {statusLabel}
      </span>
    </div>
  )
}

// ─── KHỐI D — Quà đã nhận ────────────────────────────────────────────────────────────
function GiftsReceived({ gifts }: { gifts: CustomerGift[] }) {
  // Quà đã hủy không hiển thị nổi bật (giữ gọn). Chỉ hiện granted/delivered.
  const visible = gifts.filter((g) => g.status !== 'cancelled')
  if (visible.length === 0) return null

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5">
        <Gift className="w-3.5 h-3.5" />
        Quà đã nhận
      </p>
      <div className="space-y-3">
        {visible.map((g) => {
          const delivered = g.status === 'delivered'
          return (
            <div
              key={g.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3"
            >
              {g.gifts?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={g.gifts.image_url}
                  alt={g.gifts?.name ?? 'Quà tặng'}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center shrink-0">
                  <Gift className="w-6 h-6 text-pink-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-slate-800 truncate">{g.gifts?.name ?? 'Quà tặng'}</p>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                  Nhận ngày {formatDate(g.granted_at)}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 ${
                  delivered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {delivered ? <PackageCheck className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                {delivered ? 'Đã giao' : 'Đã nhận'}
              </span>
            </div>
          )
        })}
      </div>
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
