"use client";

// B7 — Ngăn chi tiết 1 khách: trao hạng/voucher/quà thủ công, điều chỉnh tích lũy,
// thu hồi voucher, xem ví + audit log (05 mục 6).
// MỌI thao tác GHI đi qua RPC SECURITY DEFINER (admin_set_*/admin_grant_*/...).
// KHÔNG supabase.from(...).insert/update — RLS chỉ cho service_role ghi (07 mục 5).

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  X,
  Loader2,
  Crown,
  Ticket,
  Gift,
  Lock,
  Unlock,
  RefreshCw,
  SlidersHorizontal,
  Ban,
  Save,
  History,
} from "lucide-react";
import {
  inputClass,
  formatVND,
  formatDateShort,
  isoToLocalInput,
  localInputToIso,
  Field,
} from "./ui";

// ─── Types ───────────────────────────────────────────────────────────────────────

export type CustomerRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  tier_code: string | null;
  tier_name: string | null;
  tier_color: string | null;
  lifetime_spend: number;
  lifetime_kg: number;
  tier_locked: boolean;
  tier_updated_at: string | null;
};

type VoucherWallet = {
  id: string;
  voucher_def_id: string;
  voucher_name: string;
  type: string;
  value: number;
  source: string;
  status: string;
  issued_at: string;
  expires_at: string | null;
  used_at: string | null;
};

type GiftWallet = {
  id: string;
  gift_id: string;
  gift_name: string;
  source: string;
  status: string;
  granted_at: string;
};

type EventRow = {
  id: string;
  event_type: string;
  from_tier: string | null;
  to_tier: string | null;
  amount: number | null;
  reason: string | null;
  actor: string;
  created_at: string;
};

type VoucherOption = { id: string; name: string; is_active: boolean };
type GiftOption = { id: string; name: string; stock: number; is_active: boolean };

const EVENT_LABEL: Record<string, string> = {
  tier_up: "Lên hạng (tự động)",
  tier_down: "Xuống hạng",
  tier_recompute: "Tính lại hạng",
  tier_set_manual: "Đặt hạng thủ công",
  tier_unlocked: "Mở khóa hạng",
  voucher_issued: "Trao voucher",
  voucher_revoked: "Thu hồi voucher",
  gift_granted: "Trao quà",
  gift_skipped_out_of_stock: "Bỏ qua quà (hết kho)",
  accrual: "Cộng tích lũy",
  accrual_adjust: "Điều chỉnh tích lũy",
  backfill: "Backfill",
  merge_guest_orders: "Gộp đơn vãng lai",
};

// ─── Component ──────────────────────────────────────────────────────────────────────

export default function CustomerDetailDrawer({
  customer,
  tierCodes,
  tierNames,
  onClose,
  onChanged,
  showToast,
}: {
  customer: CustomerRow;
  tierCodes: string[];
  tierNames: Record<string, string>;
  onClose: () => void;
  onChanged: () => void;
  showToast: (msg: string, ok?: boolean) => void;
}) {
  const userId = customer.id;
  const [busy, setBusy] = useState(false);
  const [vouchers, setVouchers] = useState<VoucherWallet[]>([]);
  const [gifts, setGifts] = useState<GiftWallet[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [voucherOpts, setVoucherOpts] = useState<VoucherOption[]>([]);
  const [giftOpts, setGiftOpts] = useState<GiftOption[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(true);

  // form state
  const [tierSel, setTierSel] = useState<string>(customer.tier_code ?? "");
  const [tierReason, setTierReason] = useState("");
  const [grantVoucherId, setGrantVoucherId] = useState("");
  const [grantVoucherExp, setGrantVoucherExp] = useState<string | null>(null);
  const [grantVoucherReason, setGrantVoucherReason] = useState("");
  const [grantGiftId, setGrantGiftId] = useState("");
  const [grantGiftReason, setGrantGiftReason] = useState("");
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjSpend, setAdjSpend] = useState(customer.lifetime_spend);
  const [adjKg, setAdjKg] = useState(customer.lifetime_kg);
  const [adjReason, setAdjReason] = useState("");

  const loadWallet = useCallback(async () => {
    setLoadingWallet(true);
    try {
      const [cv, cg, ev] = await Promise.all([
        supabase.rpc("admin_customer_vouchers", { p_user: userId }),
        supabase.rpc("admin_customer_gifts", { p_user: userId }),
        supabase.rpc("admin_customer_events", { p_user: userId, p_limit: 50, p_offset: 0 }),
      ]);
      if (cv.error) throw cv.error;
      if (cg.error) throw cg.error;
      if (ev.error) throw ev.error;
      setVouchers((cv.data || []) as VoucherWallet[]);
      setGifts((cg.data || []) as GiftWallet[]);
      setEvents((ev.data || []) as EventRow[]);
    } catch (err: unknown) {
      showToast("Lỗi tải dữ liệu khách: " + errMsg(err), false);
    } finally {
      setLoadingWallet(false);
    }
  }, [userId, showToast]);

  const loadOptions = useCallback(async () => {
    try {
      const [v, g] = await Promise.all([
        supabase.rpc("admin_list_vouchers"),
        supabase.rpc("admin_list_gifts"),
      ]);
      if (!v.error && v.data) setVoucherOpts((v.data as VoucherOption[]).filter((x) => x.is_active));
      if (!g.error && g.data) setGiftOpts((g.data as GiftOption[]).filter((x) => x.is_active));
    } catch {
      /* tùy chọn — không chặn drawer nếu lỗi tải danh sách chọn */
    }
  }, []);

  useEffect(() => {
    loadWallet();
    loadOptions();
  }, [loadWallet, loadOptions]);

  // wrapper gọi RPC + toast + refresh
  async function run(
    label: string,
    fn: () => PromiseLike<{ error: unknown }>,
    afterSuccess?: () => void,
  ) {
    setBusy(true);
    try {
      const { error } = await fn();
      if (error) throw error;
      showToast(label);
      afterSuccess?.();
      await loadWallet();
      onChanged();
    } catch (err: unknown) {
      showToast("Lỗi: " + errMsg(err), false);
    } finally {
      setBusy(false);
    }
  }

  function handleSetTier() {
    if (!tierSel) {
      showToast("Hãy chọn hạng cần đặt", false);
      return;
    }
    run(
      `Đã đặt hạng "${tierNames[tierSel] ?? tierSel}"`,
      () =>
        supabase.rpc("admin_set_customer_tier", {
          p_user: userId,
          p_tier_code: tierSel,
          p_reason: tierReason.trim() || null,
        }),
      () => setTierReason(""),
    );
  }

  function handleUnlock() {
    run("Đã mở khóa hạng (trả về tự động)", () =>
      supabase.rpc("admin_unlock_customer_tier", { p_user: userId }),
    );
  }

  function handleRecompute() {
    run("Đã áp lại hạng theo tích lũy", () =>
      supabase.rpc("admin_recompute_customer_tier", { p_user: userId }),
    );
  }

  function handleGrantVoucher() {
    if (!grantVoucherId) {
      showToast("Hãy chọn voucher cần trao", false);
      return;
    }
    run(
      "Đã trao voucher",
      () =>
        supabase.rpc("admin_grant_voucher", {
          p_user: userId,
          p_voucher_def_id: grantVoucherId,
          p_expires_at: grantVoucherExp,
          p_reason: grantVoucherReason.trim() || null,
        }),
      () => {
        setGrantVoucherId("");
        setGrantVoucherExp(null);
        setGrantVoucherReason("");
      },
    );
  }

  function handleGrantGift() {
    if (!grantGiftId) {
      showToast("Hãy chọn quà cần trao", false);
      return;
    }
    run(
      "Đã trao quà (đã trừ kho)",
      () =>
        supabase.rpc("admin_grant_gift", {
          p_user: userId,
          p_gift_id: grantGiftId,
          p_reason: grantGiftReason.trim() || null,
        }),
      () => {
        setGrantGiftId("");
        setGrantGiftReason("");
      },
    );
  }

  function handleRevoke(v: VoucherWallet) {
    run(`Đã thu hồi "${v.voucher_name}"`, () =>
      supabase.rpc("admin_revoke_voucher", { p_voucher_id: v.id, p_reason: null }),
    );
  }

  function handleAdjust() {
    if (!adjReason.trim()) {
      showToast("Điều chỉnh tích lũy bắt buộc nhập lý do", false);
      return;
    }
    run(
      "Đã điều chỉnh tích lũy",
      () =>
        supabase.rpc("admin_adjust_accumulation", {
          p_user: userId,
          p_new_spend: Math.max(0, Math.round(adjSpend)),
          p_new_kg: Math.max(0, adjKg),
          p_reason: adjReason.trim(),
        }),
      () => {
        setShowAdjust(false);
        setAdjReason("");
      },
    );
  }

  return (
    <div className="fixed inset-0 z-[150] flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-full bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col animate-in slide-in-from-right-10 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-700 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-sm text-gray-100 truncate">
                {customer.full_name || "(chưa đặt tên)"}
              </h3>
              <TierBadge code={customer.tier_code} name={customer.tier_name} color={customer.tier_color} />
              {customer.tier_locked && (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">
                  <Lock className="w-3 h-3" /> khóa hạng
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {customer.phone || "—"} · {customer.email || "—"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-lg cursor-pointer shrink-0"
          >
            <span className="sr-only">Đóng</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body cuộn */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Tích lũy tóm tắt */}
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Tổng chi tiêu" value={formatVND(customer.lifetime_spend)} />
            <Stat label="Tổng kg" value={`${customer.lifetime_kg} kg`} />
          </div>

          {/* HẠNG */}
          <Section icon={<Crown className="w-4 h-4 text-amber-400" />} title="Hạng thành viên">
            <Field label="Đặt hạng thủ công (sẽ khóa hạng)">
              <select
                value={tierSel}
                onChange={(e) => setTierSel(e.target.value)}
                className={inputClass}
              >
                <option value="">— chọn hạng —</option>
                {tierCodes.map((c) => (
                  <option key={c} value={c}>
                    {tierNames[c] ?? c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Lý do (tuỳ chọn)">
              <input
                value={tierReason}
                onChange={(e) => setTierReason(e.target.value)}
                placeholder="VD: khách VIP lâu năm"
                className={inputClass}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <ActionBtn onClick={handleSetTier} disabled={busy} icon={<Lock className="w-3.5 h-3.5" />}>
                Đặt &amp; khóa hạng
              </ActionBtn>
              {customer.tier_locked && (
                <ActionBtn
                  onClick={handleUnlock}
                  disabled={busy}
                  variant="ghost"
                  icon={<Unlock className="w-3.5 h-3.5" />}
                >
                  Mở khóa (về tự động)
                </ActionBtn>
              )}
              <ActionBtn
                onClick={handleRecompute}
                disabled={busy || customer.tier_locked}
                variant="ghost"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                title={customer.tier_locked ? "Mở khóa trước khi áp lại" : undefined}
              >
                Áp lại hạng
              </ActionBtn>
            </div>
          </Section>

          {/* TÍCH LŨY */}
          <Section
            icon={<SlidersHorizontal className="w-4 h-4 text-sky-400" />}
            title="Điều chỉnh tích lũy"
          >
            {!showAdjust ? (
              <ActionBtn
                onClick={() => {
                  setAdjSpend(customer.lifetime_spend);
                  setAdjKg(customer.lifetime_kg);
                  setShowAdjust(true);
                }}
                disabled={busy}
                variant="ghost"
                icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
              >
                Điều chỉnh tích lũy (hiếm dùng)
              </ActionBtn>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tổng chi tiêu (đ)">
                    <input
                      type="number"
                      min={0}
                      value={adjSpend}
                      onChange={(e) => setAdjSpend(Math.max(0, Number(e.target.value)))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Tổng kg">
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={adjKg}
                      onChange={(e) => setAdjKg(Math.max(0, Number(e.target.value)))}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field label="Lý do (bắt buộc)">
                  <input
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    placeholder="VD: bù trừ đơn hoàn"
                    className={inputClass}
                  />
                </Field>
                <div className="flex gap-2">
                  <ActionBtn onClick={handleAdjust} disabled={busy} icon={<Save className="w-3.5 h-3.5" />}>
                    Lưu điều chỉnh
                  </ActionBtn>
                  <ActionBtn onClick={() => setShowAdjust(false)} disabled={busy} variant="ghost">
                    Huỷ
                  </ActionBtn>
                </div>
              </div>
            )}
          </Section>

          {/* TRAO VOUCHER */}
          <Section icon={<Ticket className="w-4 h-4 text-fuchsia-400" />} title="Trao voucher thủ công">
            <Field label="Chọn voucher">
              <select
                value={grantVoucherId}
                onChange={(e) => setGrantVoucherId(e.target.value)}
                className={inputClass}
              >
                <option value="">— chọn voucher —</option>
                {voucherOpts.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hạn dùng" hint="Bỏ trống = theo hạn của voucher">
                <input
                  type="datetime-local"
                  value={isoToLocalInput(grantVoucherExp)}
                  onChange={(e) => setGrantVoucherExp(localInputToIso(e.target.value))}
                  className={inputClass}
                />
              </Field>
              <Field label="Lý do (tuỳ chọn)">
                <input
                  value={grantVoucherReason}
                  onChange={(e) => setGrantVoucherReason(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <ActionBtn onClick={handleGrantVoucher} disabled={busy} icon={<Ticket className="w-3.5 h-3.5" />}>
              Trao voucher
            </ActionBtn>
          </Section>

          {/* TRAO QUÀ */}
          <Section icon={<Gift className="w-4 h-4 text-emerald-400" />} title="Trao quà thủ công">
            <Field label="Chọn quà" hint="Hệ thống tự trừ kho khi trao">
              <select
                value={grantGiftId}
                onChange={(e) => setGrantGiftId(e.target.value)}
                className={inputClass}
              >
                <option value="">— chọn quà —</option>
                {giftOpts.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} {g.stock === -1 ? "(vô hạn)" : `(kho: ${g.stock})`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Lý do (tuỳ chọn)">
              <input
                value={grantGiftReason}
                onChange={(e) => setGrantGiftReason(e.target.value)}
                className={inputClass}
              />
            </Field>
            <ActionBtn onClick={handleGrantGift} disabled={busy} icon={<Gift className="w-3.5 h-3.5" />}>
              Trao quà
            </ActionBtn>
          </Section>

          {/* VÍ + AUDIT */}
          {loadingWallet ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang tải ví &amp; lịch sử...
            </div>
          ) : (
            <>
              <Section icon={<Ticket className="w-4 h-4 text-fuchsia-400" />} title={`Ví voucher (${vouchers.length})`}>
                {vouchers.length === 0 ? (
                  <Empty>Chưa có voucher nào.</Empty>
                ) : (
                  <div className="space-y-2">
                    {vouchers.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-200 truncate">{v.voucher_name}</p>
                          <p className="text-[10px] text-gray-500">
                            {v.source} · phát {formatDateShort(v.issued_at)} · HSD {formatDateShort(v.expires_at)}
                          </p>
                        </div>
                        <StatusPill status={v.status} />
                        {v.status === "active" && (
                          <button
                            onClick={() => handleRevoke(v)}
                            disabled={busy}
                            title="Thu hồi"
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg cursor-pointer disabled:opacity-50"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section icon={<Gift className="w-4 h-4 text-emerald-400" />} title={`Quà đã phát (${gifts.length})`}>
                {gifts.length === 0 ? (
                  <Empty>Chưa có quà nào.</Empty>
                ) : (
                  <div className="space-y-2">
                    {gifts.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-200 truncate">{g.gift_name}</p>
                          <p className="text-[10px] text-gray-500">
                            {g.source} · {formatDateShort(g.granted_at)}
                          </p>
                        </div>
                        <StatusPill status={g.status} />
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section icon={<History className="w-4 h-4 text-gray-400" />} title={`Nhật ký (${events.length})`}>
                {events.length === 0 ? (
                  <Empty>Chưa có sự kiện nào.</Empty>
                ) : (
                  <div className="space-y-1.5">
                    {events.map((e) => (
                      <div key={e.id} className="flex gap-3 px-3 py-2 rounded-lg border border-gray-800 bg-gray-800/30">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-200">
                            {EVENT_LABEL[e.event_type] ?? e.event_type}
                            {e.from_tier && e.to_tier && (
                              <span className="text-gray-500 font-normal">
                                {" "}
                                · {tierNames[e.from_tier] ?? e.from_tier} → {tierNames[e.to_tier] ?? e.to_tier}
                              </span>
                            )}
                          </p>
                          {e.reason && <p className="text-[10px] text-gray-500 mt-0.5">{e.reason}</p>}
                          <p className="text-[10px] text-gray-600 mt-0.5">
                            {formatDateTime(e.created_at)} · {e.actor === "system" ? "hệ thống" : e.actor}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────────────

export function TierBadge({
  code,
  name,
  color,
}: {
  code: string | null;
  name: string | null;
  color: string | null;
}) {
  if (!code) return <span className="text-[10px] text-gray-600">—</span>;
  const c = color || "#94a3b8";
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded font-semibold border"
      style={{ color: c, borderColor: c + "55", backgroundColor: c + "1a" }}
    >
      {name || code}
    </span>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-800/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-xs font-extrabold text-gray-200 uppercase tracking-wide">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-3">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-extrabold text-gray-100 mt-0.5">{value}</p>
    </div>
  );
}

function ActionBtn({
  onClick,
  disabled,
  icon,
  variant = "primary",
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  variant?: "primary" | "ghost";
  title?: string;
  children: React.ReactNode;
}) {
  const base =
    "flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-blue-600 hover:bg-blue-500 text-white"
      : "border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800";
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={`${base} ${styles}`}>
      {icon}
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    used: "bg-gray-700 border-gray-600 text-gray-400",
    expired: "bg-gray-700 border-gray-600 text-gray-500",
    revoked: "bg-red-500/15 border-red-500/30 text-red-300",
    granted: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    delivered: "bg-blue-500/15 border-blue-500/30 text-blue-300",
    cancelled: "bg-red-500/15 border-red-500/30 text-red-300",
  };
  const label: Record<string, string> = {
    active: "còn hiệu lực",
    used: "đã dùng",
    expired: "hết hạn",
    revoked: "đã thu hồi",
    granted: "đã trao",
    delivered: "đã giao",
    cancelled: "đã huỷ",
  };
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold shrink-0 ${
        map[status] || "bg-gray-700 border-gray-600 text-gray-400"
      }`}
    >
      {label[status] || status}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-gray-600 py-2">{children}</p>;
}

// ─── helpers ─────────────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN");
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err)
    return String((err as { message: unknown }).message);
  return "Lỗi không xác định";
}
