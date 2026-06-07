"use client";

// B6 — Tab "Mốc thưởng": cấu hình reward_rules (05 mục 5).
// Wizard "Khi [điều kiện] thì tặng [phần thưởng]". GHI qua RPC SECURITY DEFINER.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Edit2,
  Loader2,
  Save,
  Target,
  ToggleLeft,
  ToggleRight,
  Ticket,
  Gift,
} from "lucide-react";
import {
  inputClass,
  formatVND,
  formatDateShort,
  isoToLocalInput,
  localInputToIso,
  useToast,
  ToastView,
  Field,
  FormErrors,
  Modal,
  TierScopePicker,
  useTierOptions,
} from "./ui";

// ─── Types ───────────────────────────────────────────────────────────────────────

type ConditionType =
  | "order_amount_gte"
  | "order_kg_gte"
  | "cumulative_spend_gte"
  | "cumulative_kg_gte";

type RewardType = "voucher" | "gift";

type RewardRule = {
  id: string;
  name: string;
  condition_type: ConditionType;
  threshold: number;
  reward_type: RewardType;
  voucher_def_id: string | null;
  gift_id: string | null;
  tier_scope: string[] | null;
  is_active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
  voucher_name: string | null;
  gift_name: string | null;
  activation_count: number;
};

type RuleForm = {
  name: string;
  condition_type: ConditionType;
  threshold: number;
  reward_type: RewardType;
  voucher_def_id: string | null;
  gift_id: string | null;
  tier_scope: string[];
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
};

type Option = { id: string; name: string };

const DEFAULT_FORM: RuleForm = {
  name: "",
  condition_type: "order_amount_gte",
  threshold: 0,
  reward_type: "voucher",
  voucher_def_id: null,
  gift_id: null,
  tier_scope: [],
  valid_from: null,
  valid_to: null,
  is_active: true,
};

const CONDITION_LABEL: Record<ConditionType, string> = {
  order_amount_gte: "1 đơn có tổng tiền ≥",
  order_kg_gte: "1 đơn có tổng kg ≥",
  cumulative_spend_gte: "Tổng tích lũy tiền ≥",
  cumulative_kg_gte: "Tổng tích lũy kg ≥",
};

// kg cho loại *_kg, tiền (đồng) cho loại còn lại.
function isKgCondition(c: ConditionType): boolean {
  return c === "order_kg_gte" || c === "cumulative_kg_gte";
}

function conditionText(rule: RewardRule): string {
  const unit = isKgCondition(rule.condition_type)
    ? `${rule.threshold}kg`
    : formatVND(rule.threshold);
  return `${CONDITION_LABEL[rule.condition_type]} ${unit}`;
}

// ─── Component ──────────────────────────────────────────────────────────────────────

export default function MembershipRewardRulesAdmin() {
  const [list, setList] = useState<RewardRule[]>([]);
  const [vouchers, setVouchers] = useState<Option[]>([]);
  const [gifts, setGifts] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RuleForm>(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const { toast, showToast } = useToast();
  const { tierCodes, tierNames } = useTierOptions();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rules, vs, gs] = await Promise.all([
        supabase.rpc("admin_list_reward_rules"),
        supabase.rpc("admin_list_vouchers"),
        supabase.rpc("admin_list_gifts"),
      ]);
      if (rules.error) throw rules.error;
      setList((rules.data || []) as RewardRule[]);
      // Chỉ cho chọn voucher/quà đang active làm phần thưởng.
      if (!vs.error)
        setVouchers(
          (vs.data as { id: string; name: string; is_active: boolean }[])
            .filter((v) => v.is_active)
            .map((v) => ({ id: v.id, name: v.name }))
        );
      if (!gs.error)
        setGifts(
          (gs.data as { id: string; name: string; is_active: boolean }[])
            .filter((g) => g.is_active)
            .map((g) => ({ id: g.id, name: g.name }))
        );
    } catch (err: unknown) {
      showToast("Lỗi tải mốc thưởng: " + msg(err), false);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function openAdd() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormErrors([]);
    setShowForm(true);
  }

  function openEdit(r: RewardRule) {
    setEditingId(r.id);
    setForm({
      name: r.name,
      condition_type: r.condition_type,
      threshold: r.threshold,
      reward_type: r.reward_type,
      voucher_def_id: r.voucher_def_id,
      gift_id: r.gift_id,
      tier_scope: r.tier_scope ?? [],
      valid_from: r.valid_from,
      valid_to: r.valid_to,
      is_active: r.is_active,
    });
    setFormErrors([]);
    setShowForm(true);
  }

  function validate(f: RuleForm): string[] {
    const errors: string[] = [];
    if (!f.name.trim()) errors.push("Tên luật không được để trống.");
    if (f.threshold <= 0) errors.push("Ngưỡng phải > 0.");
    if (f.reward_type === "voucher" && !f.voucher_def_id)
      errors.push("Phần thưởng voucher: phải chọn 1 voucher.");
    if (f.reward_type === "gift" && !f.gift_id)
      errors.push("Phần thưởng quà: phải chọn 1 quà.");
    if (f.valid_from && f.valid_to && new Date(f.valid_from) >= new Date(f.valid_to))
      errors.push("Hạn bắt đầu phải trước hạn kết thúc.");
    return errors;
  }

  async function handleSave() {
    const errors = validate(form);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);
    setSaving(true);
    try {
      const { error } = await supabase.rpc("admin_upsert_reward_rule", {
        p_id: editingId,
        p_name: form.name,
        p_condition_type: form.condition_type,
        p_threshold: form.threshold,
        p_reward_type: form.reward_type,
        p_voucher_def_id: form.reward_type === "voucher" ? form.voucher_def_id : null,
        p_gift_id: form.reward_type === "gift" ? form.gift_id : null,
        p_tier_scope: form.tier_scope.length > 0 ? form.tier_scope : null,
        p_valid_from: form.valid_from,
        p_valid_to: form.valid_to,
        p_is_active: form.is_active,
      });
      if (error) throw error;
      showToast(editingId ? `Đã cập nhật "${form.name}"` : `Đã thêm luật "${form.name}"`);
      setShowForm(false);
      fetchAll();
    } catch (err: unknown) {
      showToast("Lỗi lưu: " + msg(err), false);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(r: RewardRule) {
    try {
      const { error } = await supabase.rpc("admin_set_reward_rule_active", {
        p_id: r.id,
        p_active: !r.is_active,
      });
      if (error) throw error;
      showToast(r.is_active ? `Đã tắt "${r.name}"` : `Đã bật "${r.name}"`);
      fetchAll();
    } catch (err: unknown) {
      showToast("Lỗi: " + msg(err), false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ToastView toast={toast} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-extrabold text-gray-100">Mốc thưởng</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400 font-bold">
            {list.length} luật
          </span>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm luật
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : list.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((r) => (
            <RuleRow
              key={r.id}
              r={r}
              tierNames={tierNames}
              onEdit={() => openEdit(r)}
              onToggle={() => handleToggle(r)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editingId ? "Sửa mốc thưởng" : "Thêm mốc thưởng"}
          icon={<Target className="w-4 h-4 text-amber-400" />}
          onClose={() => setShowForm(false)}
          footer={
            <>
              <button
                onClick={() => setShowForm(false)}
                className="h-9 px-4 text-xs font-semibold rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800 cursor-pointer transition-all"
              >
                Huỷ
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 h-9 px-5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editingId ? "Lưu thay đổi" : "Tạo luật"}
              </button>
            </>
          }
        >
          <FormErrors errors={formErrors} />

          <Field label="Tên luật *">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Đơn ≥ 2 triệu tặng voucher 50k"
              className={inputClass}
            />
          </Field>

          {/* Wizard: KHI [điều kiện] */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-3 space-y-3">
            <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Khi…</p>
            <Field label="Điều kiện">
              <select
                value={form.condition_type}
                onChange={(e) => setForm({ ...form, condition_type: e.target.value as ConditionType })}
                className={inputClass}
              >
                {(Object.keys(CONDITION_LABEL) as ConditionType[]).map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABEL[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={isKgCondition(form.condition_type) ? "Ngưỡng (kg)" : "Ngưỡng (đ)"}>
              <input
                type="number"
                min={0}
                step={isKgCondition(form.condition_type) ? 0.1 : 1000}
                value={form.threshold}
                onChange={(e) => setForm({ ...form, threshold: Math.max(0, Number(e.target.value)) })}
                className={inputClass}
              />
            </Field>
          </div>

          {/* Wizard: THÌ TẶNG [phần thưởng] */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-3 space-y-3">
            <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Thì tặng…</p>
            <div className="flex gap-2">
              {(["voucher", "gift"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, reward_type: t })}
                  className={`flex-1 h-9 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    form.reward_type === t
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {t === "voucher" ? <Ticket className="w-3.5 h-3.5" /> : <Gift className="w-3.5 h-3.5" />}
                  {t === "voucher" ? "Voucher" : "Quà"}
                </button>
              ))}
            </div>

            {form.reward_type === "voucher" ? (
              <Field label="Chọn voucher *">
                <select
                  value={form.voucher_def_id ?? ""}
                  onChange={(e) => setForm({ ...form, voucher_def_id: e.target.value || null })}
                  className={inputClass}
                >
                  <option value="">— Chọn voucher —</option>
                  {vouchers.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                {vouchers.length === 0 && (
                  <p className="text-[10px] text-amber-400 mt-1">
                    Chưa có voucher active. Tạo ở tab Voucher trước.
                  </p>
                )}
              </Field>
            ) : (
              <Field label="Chọn quà *">
                <select
                  value={form.gift_id ?? ""}
                  onChange={(e) => setForm({ ...form, gift_id: e.target.value || null })}
                  className={inputClass}
                >
                  <option value="">— Chọn quà —</option>
                  {gifts.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                {gifts.length === 0 && (
                  <p className="text-[10px] text-amber-400 mt-1">
                    Chưa có quà active. Tạo ở tab Quà tặng trước.
                  </p>
                )}
              </Field>
            )}
          </div>

          <Field label="Áp cho hạng (bỏ trống = mọi hạng)">
            <TierScopePicker
              allTierCodes={tierCodes}
              tierNames={tierNames}
              selected={form.tier_scope}
              onChange={(next) => setForm({ ...form, tier_scope: next })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Hiệu lực từ">
              <input
                type="datetime-local"
                value={isoToLocalInput(form.valid_from)}
                onChange={(e) => setForm({ ...form, valid_from: localInputToIso(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <Field label="Hiệu lực đến">
              <input
                type="datetime-local"
                value={isoToLocalInput(form.valid_to)}
                onChange={(e) => setForm({ ...form, valid_to: localInputToIso(e.target.value) })}
                className={inputClass}
              />
            </Field>
          </div>

          <ActiveToggle active={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
        </Modal>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────────────

function RuleRow({
  r,
  tierNames,
  onEdit,
  onToggle,
}: {
  r: RewardRule;
  tierNames: Record<string, string>;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const rewardLabel =
    r.reward_type === "voucher"
      ? `Voucher: ${r.voucher_name ?? "(đã xoá)"}`
      : `Quà: ${r.gift_name ?? "(đã xoá)"}`;
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        r.is_active
          ? "bg-gray-800/60 border-gray-700 hover:border-gray-600"
          : "bg-gray-900/40 border-gray-800 opacity-60"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-gray-100 truncate">{r.name}</span>
          {!r.is_active && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-500 border border-gray-700 shrink-0">
              tắt
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px]">
          <span className="text-amber-300">{conditionText(r)}</span>
          <span className="text-gray-600">→</span>
          <span className="flex items-center gap-1 text-emerald-300">
            {r.reward_type === "voucher" ? <Ticket className="w-3 h-3" /> : <Gift className="w-3 h-3" />}
            {rewardLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[11px] text-gray-500">
          {r.tier_scope && r.tier_scope.length > 0 && (
            <span>Hạng: {r.tier_scope.map((c) => tierNames[c] ?? c).join(", ")}</span>
          )}
          <span>
            HSD: {formatDateShort(r.valid_from)} → {formatDateShort(r.valid_to)}
          </span>
          <span>Đã kích hoạt {r.activation_count}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggle}
          title={r.is_active ? "Tắt" : "Bật"}
          className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-700 rounded-lg cursor-pointer transition-all"
        >
          {r.is_active ? (
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

function ActiveToggle({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
      <div>
        <p className="text-xs font-semibold text-gray-200">Trạng thái</p>
        <p className="text-[10px] text-gray-500 mt-0.5">Đang hoạt động (active)</p>
      </div>
      <button type="button" onClick={() => onChange(!active)} className="cursor-pointer transition-colors">
        {active ? (
          <ToggleRight className="w-8 h-8 text-blue-400" />
        ) : (
          <ToggleLeft className="w-8 h-8 text-gray-600" />
        )}
      </button>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-16 text-gray-500">
      <Loader2 className="w-6 h-6 animate-spin mr-2" />
      <span className="text-sm">Đang tải...</span>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-gray-700 rounded-xl bg-gray-800/30">
      <Target className="w-10 h-10 text-gray-600" />
      <div className="text-center">
        <p className="text-gray-300 font-semibold text-sm">Chưa có mốc thưởng nào</p>
        <p className="text-gray-500 text-xs mt-1">
          Tạo luật "Khi mua đủ X thì tặng Y". Cần có voucher/quà ở tab tương ứng trước.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer active:scale-95"
      >
        <Plus className="w-3.5 h-3.5" />
        Thêm luật
      </button>
    </div>
  );
}

function msg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err) return String((err as { message: unknown }).message);
  return "Lỗi không xác định";
}
