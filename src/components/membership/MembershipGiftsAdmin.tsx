"use client";

// B6 — Tab "Quà tặng": cấu hình gifts (05 mục 4).
// GHI qua RPC SECURITY DEFINER. Stock đổi theo DELTA (admin_adjust_gift_stock) để
// tránh race khi vừa phát vừa sửa — KHÔNG set giá trị tuyệt đối từ client.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Edit2,
  Loader2,
  Save,
  Gift,
  ToggleLeft,
  ToggleRight,
  PackagePlus,
  Infinity as InfinityIcon,
  AlertTriangle,
} from "lucide-react";
import {
  inputClass,
  useToast,
  ToastView,
  Field,
  FormErrors,
  Modal,
} from "./ui";

// Ngưỡng cảnh báo kho thấp (05 mục 4: "Cảnh báo khi stock thấp").
const LOW_STOCK_THRESHOLD = 5;

// ─── Types ───────────────────────────────────────────────────────────────────────

type GiftItem = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  stock: number; // -1 = vô hạn
  is_active: boolean;
  created_at: string;
  granted_count: number;
};

type GiftForm = {
  name: string;
  description: string;
  image_url: string;
  stock: number; // chỉ dùng khi tạo mới
  unlimited: boolean; // chỉ dùng khi tạo mới
  is_active: boolean;
};

const DEFAULT_FORM: GiftForm = {
  name: "",
  description: "",
  image_url: "",
  stock: 0,
  unlimited: false,
  is_active: true,
};

// ─── Component ──────────────────────────────────────────────────────────────────────

export default function MembershipGiftsAdmin() {
  const [list, setList] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GiftForm>(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const { toast, showToast } = useToast();

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_gifts");
      if (error) throw error;
      setList((data || []) as GiftItem[]);
    } catch (err: unknown) {
      showToast("Lỗi tải quà: " + msg(err), false);
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

  function openEdit(g: GiftItem) {
    setEditingId(g.id);
    setForm({
      name: g.name,
      description: g.description ?? "",
      image_url: g.image_url ?? "",
      stock: g.stock < 0 ? 0 : g.stock,
      unlimited: g.stock < 0,
      is_active: g.is_active,
    });
    setFormErrors([]);
    setShowForm(true);
  }

  async function handleSave() {
    const errors: string[] = [];
    if (!form.name.trim()) errors.push("Tên quà không được để trống.");
    if (!form.unlimited && form.stock < 0) errors.push("Tồn kho phải ≥ 0.");
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);
    setSaving(true);
    try {
      // Khi tạo mới: stock = -1 nếu vô hạn, ngược lại số nhập.
      // Khi sửa: RPC bỏ qua p_stock (đổi kho qua nút riêng).
      const { error } = await supabase.rpc("admin_upsert_gift", {
        p_id: editingId,
        p_name: form.name,
        p_description: form.description.trim() || null,
        p_image_url: form.image_url.trim() || null,
        p_stock: editingId ? null : form.unlimited ? -1 : form.stock,
        p_is_active: form.is_active,
      });
      if (error) throw error;
      showToast(editingId ? `Đã cập nhật "${form.name}"` : `Đã thêm quà "${form.name}"`);
      setShowForm(false);
      fetchList();
    } catch (err: unknown) {
      showToast("Lỗi lưu: " + msg(err), false);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddStock(g: GiftItem, delta: number) {
    try {
      const { error } = await supabase.rpc("admin_adjust_gift_stock", {
        p_id: g.id,
        p_delta: delta,
      });
      if (error) throw error;
      showToast(`Đã nhập thêm ${delta} vào kho "${g.name}"`);
      fetchList();
    } catch (err: unknown) {
      showToast("Lỗi nhập kho: " + msg(err), false);
    }
  }

  async function handleSetUnlimited(g: GiftItem, unlimited: boolean) {
    try {
      const { error } = await supabase.rpc("admin_set_gift_unlimited", {
        p_id: g.id,
        p_unlimited: unlimited,
      });
      if (error) throw error;
      showToast(unlimited ? `"${g.name}": kho vô hạn` : `"${g.name}": kho hữu hạn (0)`);
      fetchList();
    } catch (err: unknown) {
      showToast("Lỗi: " + msg(err), false);
    }
  }

  async function handleToggle(g: GiftItem) {
    try {
      const { error } = await supabase.rpc("admin_set_gift_active", {
        p_id: g.id,
        p_active: !g.is_active,
      });
      if (error) throw error;
      showToast(g.is_active ? `Đã tắt "${g.name}"` : `Đã bật "${g.name}"`);
      fetchList();
    } catch (err: unknown) {
      showToast("Lỗi: " + msg(err), false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ToastView toast={toast} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-rose-400" />
          <h2 className="text-sm font-extrabold text-gray-100">Quà tặng</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400 font-bold">
            {list.length} quà
          </span>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm quà
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : list.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {list.map((g) => (
            <GiftCard
              key={g.id}
              g={g}
              onEdit={() => openEdit(g)}
              onToggle={() => handleToggle(g)}
              onAddStock={(d) => handleAddStock(g, d)}
              onSetUnlimited={(u) => handleSetUnlimited(g, u)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editingId ? "Sửa quà" : "Thêm quà"}
          icon={<Gift className="w-4 h-4 text-rose-400" />}
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
                {editingId ? "Lưu thay đổi" : "Tạo quà"}
              </button>
            </>
          }
        >
          <FormErrors errors={formErrors} />

          <Field label="Tên quà *">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Hộp nước mắm 500ml"
              className={inputClass}
            />
          </Field>

          <Field label="Mô tả">
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Quà tặng kèm đơn ≥ 5kg"
              className={`${inputClass} resize-none`}
            />
          </Field>

          <Field label="Ảnh (URL)" hint="Đường dẫn ảnh hiển thị (tuỳ chọn)">
            <input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://..."
              className={inputClass}
            />
          </Field>

          {editingId ? (
            <p className="text-[11px] text-gray-500 rounded-lg border border-gray-700 bg-gray-800/40 px-3 py-2">
              Tồn kho đổi bằng nút "Nhập thêm kho" / "Vô hạn" ở thẻ quà (an toàn race khi đang phát).
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-gray-200">Kho vô hạn</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Không giới hạn số quà phát</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, unlimited: !form.unlimited })}
                  className="cursor-pointer transition-colors"
                >
                  {form.unlimited ? (
                    <ToggleRight className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-600" />
                  )}
                </button>
              </div>
              {!form.unlimited && (
                <Field label="Tồn kho ban đầu">
                  <input
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: Math.max(0, Number(e.target.value)) })}
                    className={inputClass}
                  />
                </Field>
              )}
            </>
          )}

          <ActiveToggle active={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
        </Modal>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────────────

function GiftCard({
  g,
  onEdit,
  onToggle,
  onAddStock,
  onSetUnlimited,
}: {
  g: GiftItem;
  onEdit: () => void;
  onToggle: () => void;
  onAddStock: (delta: number) => void;
  onSetUnlimited: (unlimited: boolean) => void;
}) {
  const unlimited = g.stock < 0;
  const lowStock = !unlimited && g.stock <= LOW_STOCK_THRESHOLD;
  return (
    <div
      className={`flex flex-col gap-2 px-4 py-3 rounded-xl border transition-all ${
        g.is_active
          ? "bg-gray-800/60 border-gray-700 hover:border-gray-600"
          : "bg-gray-900/40 border-gray-800 opacity-60"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {g.image_url ? (
          <img
            src={g.image_url}
            alt={g.name}
            className="w-12 h-12 rounded-lg object-cover border border-gray-700 shrink-0 bg-gray-800"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg border border-gray-700 bg-gray-800 flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5 text-gray-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-gray-100 truncate">{g.name}</span>
            {!g.is_active && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-500 border border-gray-700 shrink-0">
                tắt
              </span>
            )}
          </div>
          {g.description && (
            <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{g.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px]">
            {unlimited ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <InfinityIcon className="w-3.5 h-3.5" /> Vô hạn
              </span>
            ) : (
              <span className={`flex items-center gap-1 font-semibold ${lowStock ? "text-amber-400" : "text-gray-300"}`}>
                {lowStock && <AlertTriangle className="w-3.5 h-3.5" />}
                Kho: {g.stock}
              </span>
            )}
            <span className="text-gray-500">Đã phát {g.granted_count}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggle}
            title={g.is_active ? "Tắt" : "Bật"}
            className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-700 rounded-lg cursor-pointer transition-all"
          >
            {g.is_active ? (
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

      {/* Quản lý kho */}
      <div className="flex items-center gap-1.5 flex-wrap border-t border-gray-700/60 pt-2">
        {!unlimited && (
          <>
            {[1, 5, 10].map((d) => (
              <button
                key={d}
                onClick={() => onAddStock(d)}
                className="flex items-center gap-1 h-7 px-2 text-[11px] font-semibold rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300 cursor-pointer transition-all"
              >
                <PackagePlus className="w-3 h-3" />+{d}
              </button>
            ))}
            <button
              onClick={() => onSetUnlimited(true)}
              className="flex items-center gap-1 h-7 px-2 text-[11px] font-semibold rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-emerald-300 cursor-pointer transition-all"
            >
              <InfinityIcon className="w-3 h-3" /> Vô hạn
            </button>
          </>
        )}
        {unlimited && (
          <button
            onClick={() => onSetUnlimited(false)}
            className="flex items-center gap-1 h-7 px-2 text-[11px] font-semibold rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300 cursor-pointer transition-all"
          >
            Đặt kho hữu hạn
          </button>
        )}
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
      <Gift className="w-10 h-10 text-gray-600" />
      <div className="text-center">
        <p className="text-gray-300 font-semibold text-sm">Chưa có quà nào</p>
        <p className="text-gray-500 text-xs mt-1">Thêm quà để dùng trong mốc thưởng hoặc trao tay.</p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer active:scale-95"
      >
        <Plus className="w-3.5 h-3.5" />
        Thêm quà
      </button>
    </div>
  );
}

function msg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err) return String((err as { message: unknown }).message);
  return "Lỗi không xác định";
}
