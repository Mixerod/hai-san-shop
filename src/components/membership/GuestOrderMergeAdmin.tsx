"use client";

// B15 — Tab "Gộp đơn vãng lai": admin kéo 1 đơn khách vãng lai (user_id null)
// thả vào 1 tài khoản khách để gán chủ đơn. BỔ SUNG cho cơ chế tự gộp B13
// (khách tự gộp ở /profile) — KHÔNG thay thế. Ghi qua RPC admin_merge_guest_order
// (SECURITY DEFINER, tự kiểm admin); có fallback bấm chọn cho thiết bị cảm ứng.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  GitMerge,
  Search,
  Loader2,
  Package,
  Users,
  ChevronLeft,
  ChevronRight,
  MousePointerClick,
  Scissors,
} from "lucide-react";
import { formatVND, formatDateShort, inputClass, useToast, ToastView, Field, Modal } from "./ui";
import { TierBadge, type CustomerRow } from "./CustomerDetailDrawer";

const PAGE_SIZE = 10;

type GuestOrder = {
  id: string;
  note: string | null;
  total_amount: number;
  status: string;
  payment_status: string | null;
  created_at: string;
  total_count: number;
};

type UserOrder = {
  id: string;
  note: string | null;
  total_amount: number;
  status: string;
  payment_status: string | null;
  created_at: string;
  rewards_processed_at: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  paid: "Đã thanh toán",
  done: "Hoàn tất",
  cancelled: "Đã hủy",
};

const STATUS_CLASS: Record<string, string> = {
  paid: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  done: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  cancelled: "bg-red-500/15 border-red-500/30 text-red-300",
};

// note dạng "Tên: X\nSĐT: Y\n..." — tách ra để hiển thị gọn trên thẻ đơn.
function parseNote(note: string | null): { name: string; phone: string; rest: string } {
  const lines = (note ?? "").split("\n");
  let name = "";
  let phone = "";
  const rest: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*(Tên|Ten)\s*:\s*(.+)$/i);
    const p = line.match(/^\s*(SĐT|SDT|Phone)\s*:\s*(.+)$/i);
    if (m) name = m[2].trim();
    else if (p) phone = p[2].trim();
    else if (line.trim()) rest.push(line.trim());
  }
  return { name, phone, rest: rest.join(" · ") };
}

export default function GuestOrderMergeAdmin() {
  const { toast, showToast } = useToast();

  // ── đơn vãng lai (cột trái) ──
  const [orders, setOrders] = useState<GuestOrder[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderPage, setOrderPage] = useState(0);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderDebounced, setOrderDebounced] = useState("");
  const [loadingOrders, setLoadingOrders] = useState(true);

  // ── khách hàng (cột phải) ──
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [custTotal, setCustTotal] = useState(0);
  const [custPage, setCustPage] = useState(0);
  const [custSearch, setCustSearch] = useState("");
  const [custDebounced, setCustDebounced] = useState("");
  const [loadingCust, setLoadingCust] = useState(true);

  // ── kéo-thả / chọn / xác nhận ──
  const [dragOrderId, setDragOrderId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ order: GuestOrder; customer: CustomerRow } | null>(null);
  const [mergeReason, setMergeReason] = useState("");
  const [busy, setBusy] = useState(false);

  // ── tách đơn khỏi khách (admin_detach_order) ──
  const [detachCustomer, setDetachCustomer] = useState<CustomerRow | null>(null);
  const [userOrders, setUserOrders] = useState<UserOrder[]>([]);
  const [loadingUserOrders, setLoadingUserOrders] = useState(false);
  const [detachTarget, setDetachTarget] = useState<UserOrder | null>(null);
  const [detachReason, setDetachReason] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setOrderDebounced(orderSearch.trim());
      setOrderPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [orderSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      setCustDebounced(custSearch.trim());
      setCustPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [custSearch]);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_guest_orders", {
        p_search: orderDebounced || null,
        p_limit: PAGE_SIZE,
        p_offset: orderPage * PAGE_SIZE,
      });
      if (error) throw error;
      const rows = (data || []) as GuestOrder[];
      setOrders(rows);
      setOrderTotal(rows.length > 0 ? Number(rows[0].total_count) : 0);
    } catch (err: unknown) {
      showToast("Lỗi tải đơn vãng lai: " + errMsg(err), false);
      setOrders([]);
      setOrderTotal(0);
    } finally {
      setLoadingOrders(false);
    }
  }, [orderDebounced, orderPage, showToast]);

  const fetchCustomers = useCallback(async () => {
    setLoadingCust(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_customers", {
        p_search: custDebounced || null,
        p_limit: PAGE_SIZE,
        p_offset: custPage * PAGE_SIZE,
      });
      if (error) throw error;
      const rows = (data || []) as (CustomerRow & { total_count: number })[];
      setCustomers(rows);
      setCustTotal(rows.length > 0 ? Number(rows[0].total_count) : 0);
    } catch (err: unknown) {
      showToast("Lỗi tải khách: " + errMsg(err), false);
      setCustomers([]);
      setCustTotal(0);
    } finally {
      setLoadingCust(false);
    }
  }, [custDebounced, custPage, showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  function openConfirm(orderId: string, customer: CustomerRow) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    setMergeReason("");
    setConfirm({ order, customer });
  }

  async function handleMerge() {
    if (!confirm) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_merge_guest_order", {
        p_order: confirm.order.id,
        p_user: confirm.customer.id,
        p_reason: mergeReason.trim() || null,
      });
      if (error) throw error;
      showToast(
        `Đã gộp đơn ${formatVND(confirm.order.total_amount)} vào "${
          confirm.customer.full_name || confirm.customer.email || "khách"
        }"`,
      );
      setConfirm(null);
      setSelectedOrderId(null);
      await Promise.all([fetchOrders(), fetchCustomers()]);
    } catch (err: unknown) {
      showToast("Lỗi gộp đơn: " + errMsg(err), false);
    } finally {
      setBusy(false);
    }
  }

  async function openDetach(c: CustomerRow) {
    setDetachCustomer(c);
    setDetachTarget(null);
    setDetachReason("");
    setLoadingUserOrders(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_user_orders", { p_user: c.id });
      if (error) throw error;
      setUserOrders((data || []) as UserOrder[]);
    } catch (err: unknown) {
      showToast("Lỗi tải đơn của khách: " + errMsg(err), false);
      setUserOrders([]);
    } finally {
      setLoadingUserOrders(false);
    }
  }

  async function handleDetach() {
    if (!detachCustomer || !detachTarget) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_detach_order", {
        p_order: detachTarget.id,
        p_reason: detachReason.trim() || null,
      });
      if (error) throw error;
      showToast(`Đã tách đơn ${formatVND(detachTarget.total_amount)} ra đơn vãng lai`);
      setDetachTarget(null);
      setDetachReason("");
      // refresh: đơn vừa tách sẽ xuất hiện lại ở cột đơn vãng lai
      const cust = detachCustomer;
      await Promise.all([fetchOrders(), fetchCustomers()]);
      await openDetach(cust);
    } catch (err: unknown) {
      showToast("Lỗi tách đơn: " + errMsg(err), false);
    } finally {
      setBusy(false);
    }
  }

  // Đơn đã được TÍNH tích lũy = done/paid + đã qua xử lý thưởng → tách sẽ TRỪ tiền.
  const isCounted = (o: UserOrder) =>
    (o.status === "done" || o.status === "paid") && o.rewards_processed_at != null;

  const activeOrderId = dragOrderId ?? selectedOrderId;
  const orderPages = Math.max(1, Math.ceil(orderTotal / PAGE_SIZE));
  const custPages = Math.max(1, Math.ceil(custTotal / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <ToastView toast={toast} />

      <div className="flex items-center gap-2">
        <GitMerge className="w-5 h-5 text-violet-400" />
        <h2 className="text-sm font-extrabold text-gray-100">Gộp đơn vãng lai</h2>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400 font-bold">
          {orderTotal} đơn chưa có chủ
        </span>
      </div>
      <p className="text-[11px] text-gray-500 -mt-2 flex items-center gap-1.5">
        <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
        Kéo 1 đơn bên trái thả vào khách bên phải (hoặc bấm chọn đơn rồi bấm &quot;Gộp vào đây&quot;).
        Cơ chế khách tự gộp ở /profile vẫn hoạt động bình thường.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* ── CỘT TRÁI: đơn vãng lai ── */}
        <div className="flex flex-col gap-2.5 rounded-xl border border-gray-800 bg-gray-900/40 p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-orange-400" />
              <h3 className="text-xs font-extrabold text-gray-200">Đơn vãng lai</h3>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Tìm tên / SĐT trong đơn"
                className="h-8 w-48 pl-8 pr-3 text-xs bg-gray-800 border border-gray-700 text-gray-200 rounded-lg outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {loadingOrders ? (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-xs">Đang tải...</span>
            </div>
          ) : orders.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-10 border border-dashed border-gray-700 rounded-lg">
              {orderDebounced ? "Không tìm thấy đơn phù hợp" : "Không còn đơn vãng lai nào 🎉"}
            </p>
          ) : (
            orders.map((o) => {
              const info = parseNote(o.note);
              const isActive = activeOrderId === o.id;
              return (
                <div
                  key={o.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", o.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragOrderId(o.id);
                  }}
                  onDragEnd={() => {
                    setDragOrderId(null);
                    setDropTargetId(null);
                  }}
                  onClick={() => setSelectedOrderId((cur) => (cur === o.id ? null : o.id))}
                  className={`px-3.5 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all select-none ${
                    isActive
                      ? "border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/40"
                      : "border-gray-700 bg-gray-800/60 hover:border-gray-600 hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-gray-100 truncate">
                      {info.name || "(không rõ tên)"}
                    </span>
                    <span className="text-xs font-bold text-emerald-400/90 shrink-0">
                      {formatVND(o.total_amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-[11px] text-gray-500 truncate">
                      {info.phone || "—"} · {formatDateShort(o.created_at)}
                    </p>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold shrink-0 ${
                        STATUS_CLASS[o.status] ??
                        "bg-gray-700/40 border-gray-600 text-gray-300"
                      }`}
                    >
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </div>
                  {info.rest && (
                    <p className="text-[10px] text-gray-600 truncate mt-1">{info.rest}</p>
                  )}
                </div>
              );
            })
          )}

          {orderTotal > PAGE_SIZE && (
            <Pager page={orderPage} pages={orderPages} onPage={setOrderPage} />
          )}
        </div>

        {/* ── CỘT PHẢI: khách hàng (vùng thả) ── */}
        <div className="flex flex-col gap-2.5 rounded-xl border border-gray-800 bg-gray-900/40 p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-extrabold text-gray-200">Thả vào khách</h3>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={custSearch}
                onChange={(e) => setCustSearch(e.target.value)}
                placeholder="Tìm tên / SĐT / email"
                className="h-8 w-48 pl-8 pr-3 text-xs bg-gray-800 border border-gray-700 text-gray-200 rounded-lg outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {loadingCust ? (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-xs">Đang tải...</span>
            </div>
          ) : customers.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-10 border border-dashed border-gray-700 rounded-lg">
              Không tìm thấy khách
            </p>
          ) : (
            customers.map((c) => {
              const isTarget = dropTargetId === c.id;
              return (
                <div
                  key={c.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDropTargetId(c.id);
                  }}
                  onDragLeave={() => setDropTargetId((cur) => (cur === c.id ? null : cur))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const orderId = e.dataTransfer.getData("text/plain") || dragOrderId;
                    setDragOrderId(null);
                    setDropTargetId(null);
                    if (orderId) openConfirm(orderId, c);
                  }}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border transition-all ${
                    isTarget
                      ? "border-violet-500 bg-violet-500/15 ring-2 ring-violet-500/40 scale-[1.01]"
                      : "border-gray-700 bg-gray-800/60"
                  }`}
                >
                  <div className="flex-1 min-w-0 pointer-events-none">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-gray-100 truncate">
                        {c.full_name || c.email || "(chưa đặt tên)"}
                      </span>
                      <TierBadge code={c.tier_code} name={c.tier_name} color={c.tier_color} />
                    </div>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                      {c.phone || "—"}
                      {c.email ? ` · ${c.email}` : ""} · {formatVND(c.lifetime_spend)}
                    </p>
                  </div>
                  {selectedOrderId && (
                    <button
                      onClick={() => openConfirm(selectedOrderId, c)}
                      className="shrink-0 h-7 px-2.5 text-[11px] font-bold rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors cursor-pointer"
                    >
                      Gộp vào đây
                    </button>
                  )}
                  <button
                    onClick={() => openDetach(c)}
                    title="Tách đơn của khách này ra đơn vãng lai (đổi chủ đơn)"
                    className="shrink-0 flex items-center gap-1 h-7 px-2 text-[11px] font-bold rounded-lg border border-gray-600 text-gray-300 hover:text-amber-300 hover:border-amber-500/50 transition-colors cursor-pointer"
                  >
                    <Scissors className="w-3 h-3" /> Tách
                  </button>
                </div>
              );
            })
          )}

          {custTotal > PAGE_SIZE && <Pager page={custPage} pages={custPages} onPage={setCustPage} />}
        </div>
      </div>

      {/* ── Modal xác nhận gộp ── */}
      {confirm && (
        <Modal
          title="Xác nhận gộp đơn"
          icon={<GitMerge className="w-4 h-4 text-violet-400" />}
          onClose={() => !busy && setConfirm(null)}
          footer={
            <>
              <button
                onClick={() => setConfirm(null)}
                disabled={busy}
                className="h-9 px-4 text-xs font-bold rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={handleMerge}
                disabled={busy}
                className="h-9 px-4 flex items-center gap-1.5 text-xs font-bold rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 cursor-pointer transition-colors"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitMerge className="w-3.5 h-3.5" />}
                Gộp đơn
              </button>
            </>
          }
        >
          <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-3 text-xs space-y-1">
            <p className="text-gray-400">
              Đơn:{" "}
              <b className="text-gray-100">
                {parseNote(confirm.order.note).name || "(không rõ tên)"}
              </b>{" "}
              · {formatVND(confirm.order.total_amount)} ·{" "}
              {STATUS_LABEL[confirm.order.status] ?? confirm.order.status} ·{" "}
              {formatDateShort(confirm.order.created_at)}
            </p>
            <p className="text-gray-400">
              Gộp vào:{" "}
              <b className="text-gray-100">
                {confirm.customer.full_name || confirm.customer.email || "(chưa đặt tên)"}
              </b>
              {confirm.customer.phone ? ` · ${confirm.customer.phone}` : ""}
            </p>
          </div>
          <p className="text-[11px] text-gray-500">
            Đơn đã hoàn tất/thanh toán sẽ được cộng tích lũy ngay (không phát voucher/quà hồi tố);
            nếu đủ mốc, hạng tự nâng. Đơn chưa hoàn tất chỉ gán chủ — tích lũy chạy khi đơn xong.
          </p>
          <Field label="Lý do (tuỳ chọn)">
            <input
              value={mergeReason}
              onChange={(e) => setMergeReason(e.target.value)}
              placeholder="VD: khách báo quên đăng nhập khi đặt"
              className={inputClass}
            />
          </Field>
        </Modal>
      )}

      {/* ── Modal tách đơn khỏi khách ── */}
      {detachCustomer && (
        <Modal
          title={`Tách đơn — ${detachCustomer.full_name || detachCustomer.email || "khách"}`}
          icon={<Scissors className="w-4 h-4 text-amber-400" />}
          onClose={() => !busy && setDetachCustomer(null)}
          footer={
            <button
              onClick={() => setDetachCustomer(null)}
              disabled={busy}
              className="h-9 px-4 text-xs font-bold rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
            >
              Đóng
            </button>
          }
        >
          <p className="text-[11px] text-gray-500">
            Tách đơn ra khỏi khách → đơn trở lại cột &quot;Đơn vãng lai&quot; để kéo-thả gộp cho
            đúng chủ (trường hợp đặt dùm). Đơn đã tính tích lũy sẽ bị TRỪ tiền tương ứng và
            hạng tự hạ nếu tụt mốc.
          </p>
          {loadingUserOrders ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-xs">Đang tải...</span>
            </div>
          ) : userOrders.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-8 border border-dashed border-gray-700 rounded-lg">
              Khách này chưa sở hữu đơn nào
            </p>
          ) : (
            <div className="space-y-2">
              {userOrders.map((o) => (
                <div
                  key={o.id}
                  className={`px-3.5 py-2.5 rounded-lg border transition-all ${
                    detachTarget?.id === o.id
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-gray-700 bg-gray-800/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-emerald-400/90">
                          {formatVND(o.total_amount)}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${
                            STATUS_CLASS[o.status] ?? "bg-gray-700/40 border-gray-600 text-gray-300"
                          }`}
                        >
                          {STATUS_LABEL[o.status] ?? o.status}
                        </span>
                        {isCounted(o) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-sky-500/30 bg-sky-500/10 text-sky-300 font-semibold">
                            đã tính tích lũy
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {formatDateShort(o.created_at)} · {parseNote(o.note).name || "—"}
                      </p>
                    </div>
                    <button
                      onClick={() => setDetachTarget((cur) => (cur?.id === o.id ? null : o))}
                      disabled={busy}
                      className="shrink-0 flex items-center gap-1 h-7 px-2.5 text-[11px] font-bold rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/15 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <Scissors className="w-3 h-3" /> Tách
                    </button>
                  </div>
                  {detachTarget?.id === o.id && (
                    <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
                      <p className="text-[11px] text-amber-300">
                        {isCounted(o)
                          ? `Đơn này ĐÃ tính tích lũy — tách sẽ trừ ${formatVND(o.total_amount)} khỏi tổng chi tiêu của khách (hạng tự hạ nếu tụt mốc).`
                          : "Đơn này chưa tính tích lũy — tách chỉ bỏ chủ đơn, tổng chi tiêu giữ nguyên."}
                      </p>
                      <Field label="Lý do (tuỳ chọn)">
                        <input
                          value={detachReason}
                          onChange={(e) => setDetachReason(e.target.value)}
                          placeholder="VD: đơn đặt dùm người khác"
                          className={inputClass}
                        />
                      </Field>
                      <button
                        onClick={handleDetach}
                        disabled={busy}
                        className="h-8 px-3.5 flex items-center gap-1.5 text-[11px] font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 cursor-pointer transition-colors"
                      >
                        {busy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Scissors className="w-3.5 h-3.5" />
                        )}
                        Xác nhận tách ra vãng lai
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function Pager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (fn: (p: number) => number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <span className="text-[11px] text-gray-500">
        Trang {page + 1}/{pages}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="flex items-center gap-1 h-7 px-2.5 text-[11px] font-semibold rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Trước
        </button>
        <button
          onClick={() => onPage((p) => (p + 1 < pages ? p + 1 : p))}
          disabled={page + 1 >= pages}
          className="flex items-center gap-1 h-7 px-2.5 text-[11px] font-semibold rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
        >
          Sau <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err)
    return String((err as { message: unknown }).message);
  return "Lỗi không xác định";
}
