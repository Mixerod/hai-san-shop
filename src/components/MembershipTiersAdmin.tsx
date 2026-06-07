"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
  Crown,
  X,
  Save,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type MembershipTier = {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  color: string | null;
  min_spend: number;
  min_kg: number;
  threshold_logic: "or" | "and";
  discount_percent: number;
  free_ship: boolean;
  perks: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type TierFormData = Omit<MembershipTier, "id" | "created_at" | "updated_at">;

const DEFAULT_FORM: TierFormData = {
  code: "",
  name: "",
  sort_order: 0,
  color: "#6b7280",
  min_spend: 0,
  min_kg: 0,
  threshold_logic: "or",
  discount_percent: 0,
  free_ship: false,
  perks: [],
  is_active: true,
};

// 4 hạng mặc định được seed phía DB qua RPC admin_seed_default_tiers()
// (giá trị chuẩn ở docs/membership/03 mục 7) — không hard-code lại ở client.

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function validateTierForm(
  form: TierFormData,
  tiers: MembershipTier[],
  editingId: string | null
): string[] {
  const errors: string[] = [];
  if (!form.code.trim()) errors.push("Mã code không được để trống.");
  if (!form.name.trim()) errors.push("Tên hạng không được để trống.");
  if (form.min_spend < 0) errors.push("Ngưỡng tiền phải ≥ 0.");
  if (form.min_kg < 0) errors.push("Ngưỡng kg phải ≥ 0.");
  if (form.discount_percent < 0 || form.discount_percent > 100)
    errors.push("Giảm giá phải trong khoảng 0–100.");
  const codeConflict = tiers.find(
    (t) => t.code === form.code.trim() && t.id !== editingId
  );
  if (codeConflict) errors.push(`Code "${form.code}" đã tồn tại.`);
  return errors;
}

function checkSortOrderConsistency(tiers: MembershipTier[]): string | null {
  const active = [...tiers]
    .filter((t) => t.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  for (let i = 1; i < active.length; i++) {
    if (active[i].min_spend < active[i - 1].min_spend) {
      return `Cảnh báo: ngưỡng tiền của "${active[i].name}" (${formatVND(active[i].min_spend)}) thấp hơn "${active[i - 1].name}" (${formatVND(active[i - 1].min_spend)}) theo sort_order. Nên kiểm tra lại.`;
    }
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MembershipTiersAdmin() {
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reapplying, setReapplying] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TierFormData>(DEFAULT_FORM);
  const [perksInput, setPerksInput] = useState(""); // comma-separated

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [sortWarning, setSortWarning] = useState<string | null>(null);

  // ── Data fetch ──────────────────────────────────────────────────────────────

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    try {
      // Đọc qua RPC admin (SECURITY DEFINER) để thấy cả hạng đang tắt — RLS công khai
      // chỉ cho đọc is_active=true. RPC tự kiểm caller là admin.
      const { data, error } = await supabase.rpc("admin_list_tiers");
      if (error) throw error;
      const rows = (data || []) as MembershipTier[];
      setTiers(rows);
      setSortWarning(checkSortOrderConsistency(rows));
    } catch (err: any) {
      showToast("Lỗi tải dữ liệu: " + (err?.message || ""), false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  // ── Toast ───────────────────────────────────────────────────────────────────

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Form helpers ─────────────────────────────────────────────────────────────

  function openAddForm() {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM, sort_order: tiers.length });
    setPerksInput("");
    setFormErrors([]);
    setShowForm(true);
  }

  function openEditForm(tier: MembershipTier) {
    setEditingId(tier.id);
    setForm({
      code: tier.code,
      name: tier.name,
      sort_order: tier.sort_order,
      color: tier.color ?? "#6b7280",
      min_spend: tier.min_spend,
      min_kg: tier.min_kg,
      threshold_logic: tier.threshold_logic,
      discount_percent: tier.discount_percent,
      free_ship: tier.free_ship,
      perks: tier.perks,
      is_active: tier.is_active,
    });
    setPerksInput((tier.perks || []).join(", "));
    setFormErrors([]);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormErrors([]);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    const perks = perksInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const data: TierFormData = { ...form, perks };

    const errors = validateTierForm(data, tiers, editingId);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);
    setSaving(true);
    try {
      // Ghi qua RPC SECURITY DEFINER (RLS chỉ cho service_role ghi config).
      // p_id null = thêm mới; có id = cập nhật.
      const { error } = await supabase.rpc("admin_upsert_tier", {
        p_id: editingId,
        p_code: data.code,
        p_name: data.name,
        p_sort_order: data.sort_order,
        p_color: data.color,
        p_min_spend: data.min_spend,
        p_min_kg: data.min_kg,
        p_threshold_logic: data.threshold_logic,
        p_discount_percent: data.discount_percent,
        p_free_ship: data.free_ship,
        p_perks: data.perks,
        p_is_active: data.is_active,
      });
      if (error) throw error;
      showToast(editingId ? `Đã cập nhật hạng "${data.name}"` : `Đã thêm hạng "${data.name}"`);
      closeForm();
      fetchTiers();
    } catch (err: any) {
      showToast("Lỗi lưu: " + (err?.message || ""), false);
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle active ────────────────────────────────────────────────────────────

  async function handleToggleActive(tier: MembershipTier) {
    try {
      const { error } = await supabase.rpc("admin_set_tier_active", {
        p_id: tier.id,
        p_active: !tier.is_active,
      });
      if (error) throw error;
      showToast(
        tier.is_active ? `Đã tắt hạng "${tier.name}"` : `Đã bật hạng "${tier.name}"`
      );
      fetchTiers();
    } catch (err: any) {
      showToast("Lỗi: " + (err?.message || ""), false);
    }
  }

  // ── Reorder ──────────────────────────────────────────────────────────────────

  async function handleMove(tier: MembershipTier, direction: "up" | "down") {
    const sorted = [...tiers].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((t) => t.id === tier.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    // Hoán đổi vị trí rồi gửi mảng id theo thứ tự mới — RPC gán lại sort_order.
    const reordered = [...sorted];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    try {
      const { error } = await supabase.rpc("admin_reorder_tiers", {
        p_ids: reordered.map((t) => t.id),
      });
      if (error) throw error;
      fetchTiers();
    } catch (err: any) {
      showToast("Lỗi đổi thứ tự: " + (err?.message || ""), false);
    }
  }

  // ── Reapply all tiers ─────────────────────────────────────────────────────────

  async function handleReapplyAll() {
    setReapplying(true);
    try {
      const { error } = await supabase.rpc("recompute_all_tiers");
      if (error) throw error;
      showToast("Đã áp dụng lại hạng cho toàn bộ khách.");
    } catch (err: any) {
      showToast(
        "Lỗi áp dụng lại hạng: " + (err?.message || "Kiểm tra RPC recompute_all_tiers"),
        false
      );
    } finally {
      setReapplying(false);
    }
  }

  // ── Seed defaults ─────────────────────────────────────────────────────────────

  async function handleSeedDefaults() {
    setSeeding(true);
    try {
      const { error } = await supabase.rpc("admin_seed_default_tiers");
      if (error) throw error;
      showToast("Đã tạo 4 hạng mặc định.");
      fetchTiers();
    } catch (err: any) {
      showToast("Lỗi seed: " + (err?.message || ""), false);
    } finally {
      setSeeding(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const sortedTiers = [...tiers].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="flex flex-col gap-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 px-5 py-3.5 rounded-xl border shadow-lg text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200 ${
            toast.ok
              ? "bg-gray-900 border-gray-700 text-white"
              : "bg-red-900/80 border-red-700 text-red-200"
          }`}
        >
          {toast.ok ? (
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-400" />
          <h2 className="text-sm font-extrabold text-gray-100">Hạng Thành Viên</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400 font-bold">
            {tiers.length} hạng
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleReapplyAll}
            disabled={reapplying || tiers.length === 0}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {reapplying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="w-3.5 h-3.5" />
            )}
            Áp dụng lại hạng
          </button>
          <button
            onClick={openAddForm}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm hạng
          </button>
        </div>
      </div>

      {/* Sort warning */}
      {sortWarning && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-yellow-400" />
          {sortWarning}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm">Đang tải...</span>
        </div>
      ) : tiers.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-gray-700 rounded-xl bg-gray-800/30">
          <Crown className="w-10 h-10 text-gray-600" />
          <div className="text-center">
            <p className="text-gray-300 font-semibold text-sm">Chưa có hạng thành viên nào</p>
            <p className="text-gray-500 text-xs mt-1">Tạo thủ công hoặc dùng bộ 4 hạng mặc định.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Tạo 4 hạng mặc định
            </button>
            <button
              onClick={openAddForm}
              className="flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Tạo thủ công
            </button>
          </div>
        </div>
      ) : (
        /* Tier list */
        <div className="flex flex-col gap-2">
          {sortedTiers.map((tier, idx) => (
            <TierRow
              key={tier.id}
              tier={tier}
              isFirst={idx === 0}
              isLast={idx === sortedTiers.length - 1}
              onEdit={() => openEditForm(tier)}
              onToggle={() => handleToggleActive(tier)}
              onMoveUp={() => handleMove(tier, "up")}
              onMoveDown={() => handleMove(tier, "down")}
            />
          ))}
        </div>
      )}

      {/* Edit / Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 shrink-0">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-400" />
                <h3 className="font-extrabold text-sm text-gray-100">
                  {editingId ? "Sửa hạng thành viên" : "Thêm hạng mới"}
                </h3>
              </div>
              <button
                onClick={closeForm}
                className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form body */}
            <div className="p-5 space-y-4 flex-1">
              {formErrors.length > 0 && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 space-y-1">
                  {formErrors.map((e) => (
                    <p key={e} className="text-red-400 text-xs font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {e}
                    </p>
                  ))}
                </div>
              )}

              {/* Row: code + name */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mã code *">
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="member, silver, gold..."
                    className="input-field"
                    disabled={!!editingId}
                  />
                  {editingId && (
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      Không thể đổi code sau khi tạo.
                    </p>
                  )}
                </Field>
                <Field label="Tên hiển thị *">
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Khách Vàng"
                    className="input-field"
                  />
                </Field>
              </div>

              {/* Row: min_spend + min_kg */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ngưỡng chi tiêu (đ)">
                  <input
                    type="number"
                    min={0}
                    value={form.min_spend}
                    onChange={(e) =>
                      setForm({ ...form, min_spend: Math.max(0, Number(e.target.value)) })
                    }
                    className="input-field"
                  />
                </Field>
                <Field label="Ngưỡng kg">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={form.min_kg}
                    onChange={(e) =>
                      setForm({ ...form, min_kg: Math.max(0, Number(e.target.value)) })
                    }
                    className="input-field"
                  />
                </Field>
              </div>

              {/* Row: threshold_logic */}
              <Field label='Logic ngưỡng ("or" = đạt 1 trong 2 là lên; "and" = phải đạt cả 2)'>
                <div className="flex gap-2">
                  {(["or", "and"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm({ ...form, threshold_logic: v })}
                      className={`flex-1 h-9 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        form.threshold_logic === v
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      {v === "or" ? "OR (đạt 1 trong 2)" : "AND (phải cả 2)"}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Row: discount_percent + free_ship */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Giảm giá (%)">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={form.discount_percent}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discount_percent: Math.min(100, Math.max(0, Number(e.target.value))),
                      })
                    }
                    className="input-field"
                  />
                </Field>
                <Field label="Màu hạng">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.color ?? "#6b7280"}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="w-10 h-9 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer p-0.5"
                    />
                    <input
                      value={form.color ?? ""}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      placeholder="#eab308"
                      className="input-field flex-1"
                    />
                  </div>
                </Field>
              </div>

              {/* free_ship toggle */}
              <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-gray-200">Miễn phí ship</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Hạng này được miễn phí vận chuyển
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, free_ship: !form.free_ship })}
                  className="cursor-pointer transition-colors"
                >
                  {form.free_ship ? (
                    <ToggleRight className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-600" />
                  )}
                </button>
              </div>

              {/* is_active toggle */}
              <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-gray-200">Trạng thái</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Hạng đang hoạt động (active)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className="cursor-pointer transition-colors"
                >
                  {form.is_active ? (
                    <ToggleRight className="w-8 h-8 text-blue-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-600" />
                  )}
                </button>
              </div>

              {/* Perks */}
              <Field
                label="Quyền lợi (phân cách bằng dấu phẩy)"
                hint="Ví dụ: Giảm 5%, Free ship đơn lớn, Quà tháng"
              >
                <textarea
                  rows={2}
                  value={perksInput}
                  onChange={(e) => setPerksInput(e.target.value)}
                  placeholder="Giảm 5%, Free ship đơn lớn, Quà tháng"
                  className="input-field resize-none"
                />
              </Field>

              {/* sort_order */}
              <Field label="Thứ tự sắp xếp (số nhỏ = bậc thấp)">
                <input
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  className="input-field"
                />
              </Field>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-700 shrink-0">
              <button
                onClick={closeForm}
                className="h-9 px-4 text-xs font-semibold rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800 cursor-pointer transition-all"
              >
                Huỷ
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 h-9 px-5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {editingId ? "Lưu thay đổi" : "Tạo hạng"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS helper classes injected inline (avoids need for new CSS file) */}
      <style jsx>{`
        .input-field {
          width: 100%;
          background: rgb(31 41 55);
          border: 1px solid rgb(55 65 81);
          color: rgb(229 231 235);
          border-radius: 0.5rem;
          padding: 0.4rem 0.75rem;
          font-size: 0.8rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus {
          border-color: rgb(59 130 246);
        }
        .input-field:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

// ─── TierRow sub-component ─────────────────────────────────────────────────────

function TierRow({
  tier,
  isFirst,
  isLast,
  onEdit,
  onToggle,
  onMoveUp,
  onMoveDown,
}: {
  tier: MembershipTier;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        tier.is_active
          ? "bg-gray-800/60 border-gray-700 hover:border-gray-600"
          : "bg-gray-900/40 border-gray-800 opacity-60"
      }`}
    >
      {/* Color swatch */}
      <div
        className="w-3 h-8 rounded-full shrink-0"
        style={{ background: tier.color ?? "#6b7280" }}
      />

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-gray-100 truncate">{tier.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 border border-gray-600 text-gray-400 font-mono shrink-0">
            {tier.code}
          </span>
          {!tier.is_active && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-500 border border-gray-700 shrink-0">
              tắt
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-[11px] text-gray-400">
            ≥ {formatVND(tier.min_spend)}
          </span>
          {tier.min_kg > 0 && (
            <span className="text-[11px] text-gray-400">
              {tier.threshold_logic === "and" ? "+" : "/"} {tier.min_kg}kg
            </span>
          )}
          {tier.discount_percent > 0 && (
            <span className="text-[11px] text-emerald-400 font-semibold">
              −{tier.discount_percent}%
            </span>
          )}
          {tier.free_ship && (
            <span className="text-[11px] text-blue-400 font-semibold">Free ship</span>
          )}
          {tier.perks && tier.perks.length > 0 && (
            <span className="text-[10px] text-gray-500 truncate max-w-[180px]">
              {tier.perks.join(" · ")}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          title="Lên"
          className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-700 rounded-lg cursor-pointer transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          title="Xuống"
          className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-700 rounded-lg cursor-pointer transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onToggle}
          title={tier.is_active ? "Tắt hạng" : "Bật hạng"}
          className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-700 rounded-lg cursor-pointer transition-all"
        >
          {tier.is_active ? (
            <ToggleRight className="w-4 h-4 text-blue-400" />
          ) : (
            <ToggleLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
        <button
          onClick={onEdit}
          title="Sửa"
          className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-700 rounded-lg cursor-pointer transition-all"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-600">{hint}</p>}
    </div>
  );
}
