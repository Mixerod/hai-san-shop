import { createClient } from '@supabase/supabase-js'

// Vercel Cron gọi route này mỗi ngày (xem vercel.json) để Supabase Free không tự pause.
// Chỉ đọc 1 dòng, không ghi/xoá dữ liệu.
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error } = await supabase.from('products').select('id').limit(1)

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
