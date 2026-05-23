'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

type FAQItem = {
  q: string
  a: React.ReactNode
}

type FAQSection = {
  id: string
  title: string
  items: FAQItem[]
}

const SECTIONS: FAQSection[] = [
  {
    id: 'payment',
    title: 'Thanh toán',
    items: [
      {
        q: 'Mình có cần thanh toán trước khi nhận hàng không?',
        a: (
          <p>
            Không cần ạ! Nhà em chỉ thu tiền sau khi đã giao hàng đến tay khách. Anh/chị cứ kiểm tra hàng,
            hài lòng rồi mới thanh toán.
          </p>
        ),
      },
      {
        q: 'Mình có thể thanh toán bằng những hình thức nào?',
        a: (
          <>
            <p>Nhà em nhận cả hai hình thức, anh/chị chọn cái nào tiện hơn:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Tiền mặt — đưa trực tiếp cho người giao</li>
              <li>Chuyển khoản ngân hàng — sau khi nhận hàng, chuyển QR theo số tài khoản nhà em gửi</li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    id: 'shipping',
    title: 'Lịch giao hàng',
    items: [
      {
        q: 'Hải sản tươi của shop được lấy ở đâu?',
        a: (
          <p>
            Mẹ em xuống cảng Phan Thiết lấy hàng trực tiếp từ tàu/ghe vừa cập bến và làm sạch ngay trong
            ngày. Sau đó đóng thùng đá để chuẩn bị gửi lên Sài Gòn vào cuối tuần.
          </p>
        ),
      },
      {
        q: 'Khi nào hàng được giao đến mình?',
        a: (
          <>
            <p>Tuỳ khu vực, lịch giao như sau:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5">
              <li>
                <strong>Giao tận công ty (TP.HCM):</strong> sáng thứ Hai đầu tuần. Đóng thùng từ Phan Thiết
                tối Chủ nhật, sáng sớm thứ Hai có mặt.
              </li>
              <li>
                <strong>Giao nội thành TP.HCM:</strong> tuỳ khoảng cách. Khu vực Thủ Đức và lân cận sẽ được
                giao vào Chủ nhật hoặc tối thứ Hai.
              </li>
            </ul>
          </>
        ),
      },
      {
        q: 'Mình ở xa Thủ Đức hoặc ngoài TP.HCM thì sao?',
        a: (
          <p>
            Nhà em sẽ gọi điện thông báo trước cho anh/chị để thống nhất lịch giao và phí ship. Khu vực càng
            xa thì có thể cần thuê đơn vị vận chuyển ngoài (Viettel Post, GHN…) — chi tiết sẽ thông báo cụ
            thể trước khi lên đơn.
          </p>
        ),
      },
    ],
  },
  {
    id: 'shipping-fee',
    title: 'Phí vận chuyển',
    items: [
      {
        q: 'Phí ship của shop tính như thế nào?',
        a: (
          <p>
            Hải sản tươi nhà em gom đơn từ 15kg/thùng để chia phí ship. Với đặt từ 1kg trở lên, giá hải sản
            đã bao gồm phí vận chuyển, anh/chị chỉ trả thêm 5.000đ/đơn (cho công đóng gói).
          </p>
        ),
      },
      {
        q: 'Nếu mình muốn giao riêng (không gom đơn) thì sao?',
        a: (
          <p>
            Nhà em sẽ gọi điện thông báo trước. Nếu anh/chị đồng ý với mức phí ship riêng (khoảng 20.000đ
            qua bưu kiện Viettel Post — tuỳ gói cân nặng) thì sẽ lên đơn giao luôn.
          </p>
        ),
      },
    ],
  },
  {
    id: 'processed',
    title: 'Đồ chế biến (chả, khô, mắm)',
    items: [
      {
        q: 'Đồ chế biến (chả cá, cá khô, nước mắm…) của shop làm như thế nào?',
        a: (
          <p>
            Tất cả các loại đồ chế biến đều do mẹ em tự tay làm tại nhà ở Phan Thiết. Làm xong ngày nào sẽ
            đóng gói ngay ngày đó để giữ trọn chất lượng và hương vị.
          </p>
        ),
      },
      {
        q: 'Mình đặt số lượng lớn, bao lâu thì có hàng?',
        a: (
          <p>
            Vì mẹ em ở nhà chỉ có một mình làm, nên đơn số lượng lớn cần khoảng 5 ngày chuẩn bị. Mong
            anh/chị thông cảm và đặt sớm giúp nhà em ạ.
          </p>
        ),
      },
      {
        q: 'Hạn sử dụng của các loại đồ chế biến là bao lâu?',
        a: (
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Đồ tươi đóng gói:</strong> dùng tốt trong 2 – 3 tuần.
            </li>
            <li>
              <strong>Đồ khô (cá khô, mực khô…):</strong> dùng tốt trong 6 – 12 tháng.
            </li>
            <li>
              <strong>Nước mắm gia truyền:</strong> để bao lâu cũng được — càng lâu càng ngon. Nhà em chỉ ủ
              cá với muối, không phụ gia, không chất độn.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    id: 'rare',
    title: 'Hải sản hiếm & đặc sản',
    items: [
      {
        q: '“Mắm lú” là gì? Mình muốn mua có được không?',
        a: (
          <>
            <p>
              Mắm lú là một loại mắm đặc sản hiếm ở Phan Thiết, được ủ rất lâu nên hương vị đặc biệt và giá
              khá cao.
            </p>
            <p className="mt-2">
              Nhà em không phải lúc nào cũng có sẵn. Nếu anh/chị muốn ăn, hãy gọi/nhắn trước để em hỏi mẹ
              xem nhà còn để bán không ạ.
            </p>
          </>
        ),
      },
      {
        q: 'Tại sao một số loại hải sản hiếm không có trên trang sản phẩm?',
        a: (
          <>
            <p>
              Vì mẹ em xuống cảng lấy cá hằng ngày, không phải hôm nào cũng có những loại hải sản hiếm. Một
              số loại cần đặt trước cả tháng mới canh được.
            </p>
            <p className="mt-2">
              Nếu anh/chị muốn ăn cua, ghẹ hoặc loại hải sản đặc biệt nào — cứ nhắn dặn trước, khi nào có
              mẹ em sẽ lấy về và lên đơn cho anh/chị.
            </p>
          </>
        ),
      },
      {
        q: 'Giá hải sản hiếm có cố định không?',
        a: (
          <p>
            Không ạ. Hải sản theo mùa nên chất lượng và giá sẽ khác nhau tuỳ thời điểm. Khi mẹ em lấy được
            hàng, em sẽ báo giá và chất lượng cụ thể cho anh/chị quyết định.
          </p>
        ),
      },
    ],
  },
]

export default function FAQPage() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Lọc câu hỏi theo search
  const q = search.trim().toLowerCase()
  const filteredSections = q
    ? SECTIONS.map((s) => ({
        ...s,
        items: s.items.filter(
          (it) =>
            it.q.toLowerCase().includes(q) ||
            (typeof it.a === 'string' && (it.a as string).toLowerCase().includes(q))
        ),
      })).filter((s) => s.items.length > 0)
    : SECTIONS

  return (
    <div className="w-full bg-white">
      {/* HERO BANNER — compact, explicit centering via flex */}
      <section className="w-full bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 text-white py-10 sm:py-14 lg:py-16">
        <div className="w-full flex justify-center px-4 sm:px-6">
          <div className="w-full max-w-3xl flex flex-col items-center text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
              Những câu hỏi thường gặp
            </h1>

            {/* Search bar — gọn, không icon */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm câu hỏi theo từ khoá…"
              className="mt-6 sm:mt-8 w-full max-w-xl bg-white text-slate-900 placeholder-slate-400 rounded-full px-5 py-3 text-sm sm:text-base outline-none focus:ring-4 focus:ring-blue-300/40 shadow-md"
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>
      </section>

      {/* CONTENT — 2 cột (cân đối hơn với 5 sections) */}
      <section className="w-full py-12 sm:py-16 lg:py-20">
        <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-5xl">
            {filteredSections.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-slate-500 text-base">
                  Không tìm thấy câu hỏi nào khớp với <strong>"{search}"</strong>.
                </p>
                <button
                  onClick={() => setSearch('')}
                  className="mt-4 text-blue-600 hover:text-blue-800 underline text-sm font-medium cursor-pointer"
                >
                  Xoá tìm kiếm
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-20 gap-y-6 sm:gap-y-8">
                {filteredSections.map((section) => {
                  // Khi user đang search thì luôn hiện câu hỏi để dễ tìm; ngược lại theo openSections
                  const isSectionOpen = q ? true : openSections.has(section.id)
                  return (
                    <div
                      key={section.id}
                      onMouseEnter={() => {
                        // Hover vào section → mở để xem nhanh
                        setOpenSections((prev) => {
                          if (prev.has(section.id)) return prev
                          const next = new Set(prev)
                          next.add(section.id)
                          return next
                        })
                      }}
                      onMouseLeave={() => {
                        // Rời chuột khỏi section → đóng lại
                        setOpenSections((prev) => {
                          if (!prev.has(section.id)) return prev
                          const next = new Set(prev)
                          next.delete(section.id)
                          return next
                        })
                        // Đóng luôn các câu hỏi đã expand trong section đó
                        setOpenItems((prev) => {
                          const next = new Set(prev)
                          section.items.forEach((_, idx) => next.delete(`${section.id}-${idx}`))
                          return next
                        })
                      }}
                    >
                      {/* Section heading button — click để toggle ẩn/hiện danh sách câu hỏi */}
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        aria-expanded={isSectionOpen}
                        className="group w-full flex items-center justify-between gap-3 py-3 text-left cursor-pointer border-b border-slate-200 hover:border-slate-400 transition-colors"
                      >
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">
                          {section.title}
                        </h2>
                        <ChevronDown
                          className={`w-5 h-5 text-slate-400 group-hover:text-slate-700 shrink-0 transition-transform duration-200 ${
                            isSectionOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Danh sách câu hỏi — chỉ hiện khi section mở */}
                      {isSectionOpen && (
                        <ul className="space-y-3.5 mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                          {section.items.map((item, idx) => {
                            const key = `${section.id}-${idx}`
                            const isOpen = openItems.has(key)
                            return (
                              <li key={key}>
                                <button
                                  type="button"
                                  onClick={() => toggleItem(key)}
                                  className="group text-left w-full flex items-start gap-2 cursor-pointer"
                                  aria-expanded={isOpen}
                                >
                                  <span className="flex-1 text-blue-700 hover:text-blue-900 underline underline-offset-2 decoration-blue-300 hover:decoration-blue-700 text-[15px] leading-relaxed transition-colors">
                                    {item.q}
                                  </span>
                                  <ChevronDown
                                    className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform duration-200 ${
                                      isOpen ? 'rotate-180 text-slate-600' : ''
                                    }`}
                                  />
                                </button>

                                {isOpen && (
                                  <div className="mt-3 pl-4 border-l-2 border-blue-200 text-slate-600 text-[14px] leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                                    {item.a}
                                  </div>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA — flex justify-center cho centering tuyệt đối */}
      <section className="w-full border-t border-slate-200 bg-slate-50/60 py-12 sm:py-16">
        <div className="w-full flex justify-center px-4 sm:px-6">
          <div className="w-full max-w-2xl flex flex-col items-center text-center">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 leading-tight">
              Vẫn còn thắc mắc hoặc muốn đặt hải sản hiếm?
            </h3>
            <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
              Nhắn cho nhà em qua trang Săn hải sản — mẹ em sẽ phản hồi sớm nhất khi xuống cảng.
            </p>
            <Link
              href="/feedback?tab=preorder"
              className="sparkle-gold-btn inline-flex items-center justify-center bg-amber-950/5 hover:bg-amber-950/10 border border-amber-500/40 rounded-full mt-6 font-black uppercase tracking-wider text-xs sm:text-sm transition-all active:scale-95"
              style={{ padding: '12px 28px' }}
            >
              <span className="text-gold-gradient whitespace-nowrap">Săn hải sản</span>
            </Link>

            <p className="mt-10 text-xs text-slate-400 leading-relaxed">
              Cảm ơn anh/chị đã ủng hộ hải sản Phan Thiết của gia đình em <span className="text-rose-400">❤️</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
