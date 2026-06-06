"use client";

// B7 — Tab "Khách hàng": xem hạng/tích lũy + trao thủ công + audit (05 mục 6).
// Đọc danh sách qua RPC admin_list_customers (phân trang + tìm kiếm — 07 mục 3 yêu cầu
// phân trang, không select * toàn bảng). Chi tiết & thao tác ghi nằm ở CustomerDetailDrawer.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Search, Loader2, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { formatVND, useToast, ToastView, useTierOptions } from "./ui";
import CustomerDetailDrawer, { TierBadge, type CustomerRow } from "./CustomerDetailDrawer";

const PAGE_SIZE = 20;

export default function MembershipCustomersAdmin() {
  const [list, setList] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const { toast, showToast } = useToast();
  const { tierCodes, tierNames } = useTierOptions();

  // debounce ô tìm kiếm
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_customers", {
        p_search: debounced || null,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      const rows = (data || []) as (CustomerRow & { total_count: number })[];
      setList(rows);
      setTotal(rows.length > 0 ? Number(rows[0].total_count) : 0);
    } catch (err: unknown) {
      showToast("Lỗi tải khách: " + errMsg(err), false);
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debounced, page, showToast]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Sau khi drawer thao tác xong: refresh danh sách + đồng bộ khách đang chọn.
  const handleChanged = useCallback(async () => {
    await fetchList();
  }, [fetchList]);

  // Khi list cập nhật, đồng bộ lại bản ghi của khách đang mở (badge/khóa/tích lũy).
  useEffect(() => {
    if (!selected) return;
    const fresh = list.find((c) => c.id === selected.id);
    if (fresh && fresh !== selected) setSelected(fresh);
  }, [list]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <ToastView toast={toast} />

      {/* Header + tìm kiếm */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-sky-400" />
          <h2 className="text-sm font-extrabold text-gray-100">Khách hàng</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400 font-bold">
            {total} khách
          </span>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên / SĐT / email"
            className="h-8 w-64 pl-8 pr-3 text-xs bg-gray-800 border border-gray-700 text-gray-200 rounded-lg outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm">Đang tải...</span>
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-gray-700 rounded-xl bg-gray-800/30">
          <Users className="w-10 h-10 text-gray-600" />
          <p className="text-gray-300 font-semibold text-sm">
            {debounced ? "Không tìm thấy khách phù hợp" : "Chưa có khách hàng nào"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-700 bg-gray-800/60 hover:border-gray-600 hover:bg-gray-800 transition-all text-left cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-gray-100 truncate">
                    {c.full_name || "(chưa đặt tên)"}
                  </span>
                  <TierBadge code={c.tier_code} name={c.tier_name} color={c.tier_color} />
                  {c.tier_locked && (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold shrink-0">
                      <Lock className="w-3 h-3" /> khóa
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                  {c.phone || "—"}
                  {c.email ? ` · ${c.email}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-emerald-400/90">{formatVND(c.lifetime_spend)}</p>
                <p className="text-[10px] text-gray-500">{c.lifetime_kg} kg</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Phân trang */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-[11px] text-gray-500">
            Trang {page + 1}/{totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 h-8 px-3 text-xs font-semibold rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Trước
            </button>
            <button
              onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
              disabled={page + 1 >= totalPages}
              className="flex items-center gap-1 h-8 px-3 text-xs font-semibold rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              Sau <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {selected && (
        <CustomerDetailDrawer
          customer={selected}
          tierCodes={tierCodes}
          tierNames={tierNames}
          onClose={() => setSelected(null)}
          onChanged={handleChanged}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err)
    return String((err as { message: unknown }).message);
  return "Lỗi không xác định";
}
