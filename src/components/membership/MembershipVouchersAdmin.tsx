"use client";

// B6 — Tab "Voucher": cấu hình voucher_definitions (05 mục 3).
// GHI qua RPC SECURITY DEFINER (admin_*); KHÔNG supabase.from(...).insert/update.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Edit2,
  Loader2,
  Save,
  Ticket,
  ToggleLeft,
  ToggleRight,
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

type VoucherType = "percent" | "fixed" | "free_ship";

type VoucherDef = {
  id: string;
  code: string | null;
  name: string;
  type: VoucherType;
  value: number;
  max_discount: number | null;
  min_order: number;
  min_kg: number;
  tier_scope: string[] | null;
  per_user_limit: number;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  created_at: string;
  issued_count: number;
  used_count: number;
};

type VoucherForm = {
  code: string;
  name: string;
  type: VoucherType;
  value: number;
  max_discount: number | null;
  min_order: number;
  min_kg: number;
  tier_scope: string[];
  per_user_limit: number;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
};

const DEFAULT_FORM: VoucherForm = {
  code: "",
  name: "",
  type: "percent",
  value: 0,
  max_discount: null,
  min_order: 0,
  min_kg: 0,
  tier_scope: [],
  per_user_limit: 1,
  valid_from: null,
  valid_to: null,
  is_active: true,
};

const TYPE_LABEL: Record<VoucherType, string> = {
  percent: "Giảm %",
  fixed: "Giảm tiền",
  free_ship: "Free ship",
};

// ─── Validate (khớp 05 mục 3) ──────────────────────────────────────────────────────

function validate(form: VoucherForm, list: VoucherDef[], editingId: string | null): string[] {
  const errors: string[] = [];
  if (!form.name.trim()) errors.push("Tên voucher không được để trống.");
  if (form.type === "percent" && (form.value <= 0 || form.value > 100))
    errors.push("Voucher percent: giá trị phải trong khoảng 0–100.");
  if (form.type === "fixed" && form.value <= 0)
    errors.push("Voucher fixed: số tiền giảm phải > 0.");
  if (form.min_order < 0) errors.push("Đơn tối thiểu phải ≥ 0.");
  if (form.min_kg < 0) errors.push("Kg tối thiểu phải ≥ 0.");
  if (form.per_user_limit < 1) errors.push("Giới hạn mỗi khách phải ≥ 1.");
  if (form.valid_from && form.valid_to && new Date(form.valid_from) >= new Date(form.valid_to))
    errors.push("Hạn bắt đầu phải trước hạn kết thúc.");
  const code = form.code.trim();
  if (code && list.find((v) => v.code === code && v.id !== editingId))
    errors.push(`Mã voucher "${code}" đã tồn tại.`);
  return errors;
}

// ─── Component ──────────────────────────────────────────────────────────────────────

export default function MembershipVouchersAdmin() {
  const [list, setList] = useState<VoucherDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<VoucherForm>(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const { toast, showToast } = useToast();
  const { tierCodes, tierNames } = useTierOptions();

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_vouchers");
      if (error) throw error;
      setList((data || []) as VoucherDef[]);
    } catch (err: unknown) {
      showToast("Lỗi tải voucher: " + msg(err), false);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function openAdd() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormErrors([]);
    setShowForm(true);
  }

  function openEdit(v: VoucherDef) {
    setEditingId(v.id);
    setForm({
      code: v.code ?? "",
      name: v.name,
      type: v.type,
      value: v.value,
      max_discount: v.max_discount,
      min_order: v.min_order,
      min_kg: v.min_kg,
      tier_scope: v.tier_scope ?? [],
      per_user_limit: v.per_user_limit,
      valid_from: v.valid_from,
      valid_to: v.valid_to,
      is_active: v.is_active,
    });
    setFormErrors([]);
    setShowForm(true);
  }

  async function handleSave() {
    const errors = validate(form, list, editingId);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);
    setSaving(true);
    try {
      const { error } = await supabase.rpc("admin_upsert_voucher", {
        p_id: editingId,
        p_code: form.code.trim() || null,
        p_name: form.name,
        p_type: form.type,
        p_value: form.type === "free_ship" ? 0 : form.value,
        p_max_discount: form.type === "percent" ? form.max_discount : null,
        p_min_order: form.min_order,
        p_min_kg: form.min_kg,
        p_tier_scope: form.tier_scope.length > 0 ? form.tier_scope : null,
        p_per_user_limit: form.per_user_limit,
        p_valid_from: form.valid_from,
        p_valid_to: form.valid_to,
        p_is_active: form.is_active,
      });
      if (error) throw error;
      showToast(editingId ? `Đã cập nhật "${form.name}"` : `Đã thêm voucher "${form.name}"`);
      setShowForm(false);
      fetchList();
    } catch (err: unknown) {
      showToast("Lỗi lưu: " + msg(err), false);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(v: VoucherDef) {
    try {
      const { error } = await supabase.rpc("admin_set_voucher_active", {
        p_id: v.id,
        p_active: !v.is_active,
      });
      if (error) throw error;
      showToast(v.is_active ? `Đã tắt "${v.name}"` : `Đã bật "${v.name}"`);
      fetchList();
    } catch (err: unknown) {
      showToast("Lỗi: " + msg(err), false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ToastView toast={toast} />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-fuchsia-400" />
          <h2 className="text-sm font-extrabold text-gray-100">Voucher</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400 font-bold">
            {list.length} mẫu
          </span>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm voucher
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : list.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((v) => (
            <VoucherRow
              key={v.id}
              v={v}
              tierNames={tierNames}
              onEdit={() => openEdit(v)}
              onToggle={() => handleToggle(v)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editingId ? "Sửa voucher" : "Thêm voucher"}
          icon={<Ticket className="w-4 h-4 text-fuchsia-400" />}
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
                {editingId ? "Lưu thay đổi" : "Tạo voucher"}
              </button>
            </>
          }
        >
          <FormErrors errors={formErrors} />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tên voucher *">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Giảm 50k đơn lớn"
                className={inputClass}
              />
            </Field>
            <Field label="Mã code (tuỳ chọn)" hint="Bỏ trống nếu cấp riêng cho từng khách">
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="SALE50"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Loại voucher">
            <div className="flex gap-2">
              {(["percent", "fixed", "free_ship"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 h-9 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    form.type === t
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </Field>

          {form.type !== "free_ship" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={form.type === "percent" ? "Giá trị (%)" : "Số tiền giảm (đ)"}>
                <input
                  type="number"
                  min={0}
                  max={form.type === "percent" ? 100 : undefined}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: Math.max(0, Number(e.target.value)) })}
                  className={inputClass}
                />
              </Field>
              {form.type === "percent" && (
                <Field label="Trần tiền giảm (đ)" hint="Bỏ trống = không giới hạn">
                  <input
                    type="number"
                    min={0}
                    value={form.max_discount ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        max_discount: e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                      })
                    }
                    className={inputClass}
                  />
                </Field>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Đơn tối thiểu (đ)">
              <input
                type="number"
                min={0}
                value={form.min_order}
                onChange={(e) => setForm({ ...form, min_order: Math.max(0, Number(e.target.value)) })}
                className={inputClass}
              />
            </Field>
            <Field label="Kg tối thiểu">
              <input
                type="number"
                min={0}
                step={0.1}
                value={form.min_kg}
                onChange={(e) => setForm({ ...form, min_kg: Math.max(0, Number(e.target.value)) })}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Giới hạn mỗi khách (per_user_limit)">
            <input
              type="number"
              min={1}
              value={form.per_user_limit}
              onChange={(e) => setForm({ ...form, per_user_limit: Math.max(1, Number(e.target.value)) })}
              className={inputClass}
            />
          </Field>

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

          <ActiveToggle
            active={form.is_active}
            onChange={(v) => setForm({ ...form, is_active: v })}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────────────

function VoucherRow({
  v,
  tierNames,
  onEdit,
  onToggle,
}: {
  v: VoucherDef;
  tierNames: Record<string, string>;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const valueLabel =
    v.type === "percent"
      ? `−${v.value}%`
      : v.type === "fixed"
      ? `−${formatVND(v.value)}`
      : "Free ship";
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        v.is_active
          ? "bg-gray-800/60 border-gray-700 hover:border-gray-600"
          : "bg-gray-900/40 border-gray-800 opacity-60"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-gray-100 truncate">{v.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 font-semibold shrink-0">
            {valueLabel}
          </span>
          {v.code && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 border border-gray-600 text-gray-400 font-mono shrink-0">
              {v.code}
            </span>
          )}
          {!v.is_active && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-500 border border-gray-700 shrink-0">
              tắt
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[11px] text-gray-400">
          {v.min_order > 0 && <span>Đơn ≥ {formatVND(v.min_order)}</span>}
          {v.min_kg > 0 && <span>≥ {v.min_kg}kg</span>}
          {v.tier_scope && v.tier_scope.length > 0 && (
            <span className="text-gray-500">
              Hạng: {v.tier_scope.map((c) => tierNames[c] ?? c).join(", ")}
            </span>
          )}
          <span className="text-gray-500">
            HSD: {formatDateShort(v.valid_from)} → {formatDateShort(v.valid_to)}
          </span>
          <span className="text-emerald-400/80">
            Đã phát {v.issued_count} · Đã dùng {v.used_count}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggle}
          title={v.is_active ? "Tắt" : "Bật"}
          className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-700 rounded-lg cursor-pointer transition-all"
        >
          {v.is_active ? (
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
      <Ticket className="w-10 h-10 text-gray-600" />
      <div className="text-center">
        <p className="text-gray-300 font-semibold text-sm">Chưa có voucher nào</p>
        <p className="text-gray-500 text-xs mt-1">Tạo mẫu voucher để dùng trong mốc thưởng hoặc trao tay.</p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer active:scale-95"
      >
        <Plus className="w-3.5 h-3.5" />
        Thêm voucher
      </button>
    </div>
  );
}

function msg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err) return String((err as { message: unknown }).message);
  return "Lỗi không xác định";
}
