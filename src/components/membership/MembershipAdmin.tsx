"use client";

// Khu vực "Thành viên & Ưu đãi" trong /admin (05 mục 1) — thanh tab con điều phối.
// Tab "Hạng thành viên" = B5; "Voucher / Quà tặng / Mốc thưởng" = B6;
// "Khách hàng" (trao thủ công + audit) = B7.

import { useState } from "react";
import { Crown, Ticket, Gift, Target, Users } from "lucide-react";
import MembershipTiersAdmin from "@/components/MembershipTiersAdmin";
import MembershipVouchersAdmin from "./MembershipVouchersAdmin";
import MembershipGiftsAdmin from "./MembershipGiftsAdmin";
import MembershipRewardRulesAdmin from "./MembershipRewardRulesAdmin";
import MembershipCustomersAdmin from "./MembershipCustomersAdmin";

type SubTab = "tiers" | "vouchers" | "gifts" | "rules" | "customers";

const TABS: { id: SubTab; label: string; icon: typeof Crown; disabled?: boolean }[] = [
  { id: "tiers", label: "Hạng thành viên", icon: Crown },
  { id: "vouchers", label: "Voucher", icon: Ticket },
  { id: "gifts", label: "Quà tặng", icon: Gift },
  { id: "rules", label: "Mốc thưởng", icon: Target },
  { id: "customers", label: "Khách hàng", icon: Users },
];

export default function MembershipAdmin() {
  const [tab, setTab] = useState<SubTab>("tiers");

  return (
    <div className="flex flex-col gap-5">
      {/* Tiêu đề khu vực */}
      <div>
        <h1 className="text-base font-extrabold text-gray-100">Thành viên &amp; Ưu đãi</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Cấu hình hạng, voucher, quà tặng và mốc thưởng cho khách đã đăng nhập.
        </p>
      </div>

      {/* Thanh tab con */}
      <div className="flex items-center gap-1.5 flex-wrap border-b border-gray-800 pb-2">
        {TABS.map(({ id, label, icon: Icon, disabled }) => (
          <button
            key={id}
            onClick={() => !disabled && setTab(id)}
            disabled={disabled}
            title={disabled ? "Sắp có (B7): trao thủ công + audit" : undefined}
            className={`flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border transition-all ${
              tab === id
                ? "bg-blue-600 border-blue-600 text-white"
                : disabled
                ? "bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed"
                : "bg-gray-800 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {disabled && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-500">
                sắp có
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Nội dung tab */}
      <div>
        {tab === "tiers" && <MembershipTiersAdmin />}
        {tab === "vouchers" && <MembershipVouchersAdmin />}
        {tab === "gifts" && <MembershipGiftsAdmin />}
        {tab === "rules" && <MembershipRewardRulesAdmin />}
        {tab === "customers" && <MembershipCustomersAdmin />}
      </div>
    </div>
  );
}
