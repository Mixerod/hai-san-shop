"use client";

// ─── Primitives dùng chung cho các tab Membership admin (B5/B6/B7) ──────────────
// Giữ style đồng bộ với MembershipTiersAdmin (B5): nền tối, viền xám, accent xanh.

import { useState, useCallback, type ReactNode } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

// Class input chuẩn (thay cho .input-field styled-jsx ở B5) — dùng trực tiếp Tailwind.
export const inputClass =
  "w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 " +
  "text-[0.8rem] outline-none transition-colors focus:border-blue-500 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

// ─── Tiền tệ ────────────────────────────────────────────────────────────────────

export function formatVND(n: number): string {
  return (n ?? 0).toLocaleString("vi-VN") + "đ";
}

// ─── datetime-local <-> ISO ──────────────────────────────────────────────────────
// input type="datetime-local" cần dạng "YYYY-MM-DDTHH:mm" (giờ địa phương).

export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export function localInputToIso(val: string): string | null {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function formatDateShort(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}

// ─── Toast ────────────────────────────────────────────────────────────────────────

export type Toast = { msg: string; ok: boolean };

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);
  return { toast, showToast };
}

export function ToastView({ toast }: { toast: Toast | null }) {
  if (!toast) return null;
  return (
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
  );
}

// ─── Field wrapper (label + hint) ──────────────────────────────────────────────────

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
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

// ─── Hộp lỗi form ───────────────────────────────────────────────────────────────────

export function FormErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 space-y-1">
      {errors.map((e) => (
        <p key={e} className="text-red-400 text-xs font-medium flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {e}
        </p>
      ))}
    </div>
  );
}

// ─── Khung Modal chung (header + body cuộn + footer) ──────────────────────────────

export function Modal({
  title,
  icon,
  onClose,
  footer,
  children,
}: {
  title: string;
  icon?: ReactNode;
  onClose: () => void;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-extrabold text-sm text-gray-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-lg cursor-pointer"
          >
            <span className="sr-only">Đóng</span>✕
          </button>
        </div>
        <div className="p-5 space-y-4 flex-1">{children}</div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-700 shrink-0">
          {footer}
        </div>
      </div>
    </div>
  );
}

// ─── Multi-select code hạng (tier_scope) ───────────────────────────────────────────
// tier_scope null/[] = áp cho MỌI hạng; nếu chọn = chỉ các hạng được tick.

export function TierScopePicker({
  allTierCodes,
  tierNames,
  selected,
  onChange,
}: {
  allTierCodes: string[];
  tierNames: Record<string, string>;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  if (allTierCodes.length === 0) {
    return (
      <p className="text-[11px] text-gray-600">
        Chưa có hạng nào — luật/voucher sẽ áp cho mọi khách.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {allTierCodes.map((code) => {
        const on = selected.includes(code);
        return (
          <button
            key={code}
            type="button"
            onClick={() =>
              onChange(on ? selected.filter((c) => c !== code) : [...selected, code])
            }
            className={`px-2.5 h-7 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
              on
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"
            }`}
          >
            {tierNames[code] ?? code}
          </button>
        );
      })}
    </div>
  );
}

// ─── Hook lấy danh sách code hạng (cho tier_scope) ──────────────────────────────────

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useTierOptions() {
  const [codes, setCodes] = useState<string[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.rpc("admin_list_tiers");
      if (!alive || error || !data) return;
      const rows = data as { code: string; name: string }[];
      setCodes(rows.map((r) => r.code));
      setNames(Object.fromEntries(rows.map((r) => [r.code, r.name])));
    })();
    return () => {
      alive = false;
    };
  }, []);
  return { tierCodes: codes, tierNames: names };
}
