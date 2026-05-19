// Script kiểm tra bảng feedbacks trên Supabase
// Chạy: node scratch/check-feedbacks-table.js

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://irldjacvpnjnsdfejbue.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlybGRqYWN2cG5qbnNkZmVqYnVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4OTk2OTksImV4cCI6MjA5NDQ3NTY5OX0.2YN5SKaYwRSo9YEztgsHfkyUJlIal_e1wDCZyjxh1RM'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function checkFeedbacksTable() {
  console.log('🔍 Kiểm tra bảng feedbacks trên Supabase...\n')

  // 1. Thử SELECT để xem bảng có tồn tại không
  const { data, error } = await supabase
    .from('feedbacks')
    .select('*')
    .limit(5)

  if (error) {
    if (error.code === '42P01') {
      console.log('❌ BẢNG CHƯA TỒN TẠI! (relation "feedbacks" does not exist)')
      console.log('\n📋 Chạy SQL sau trong Supabase Dashboard > SQL Editor để tạo bảng:\n')
      console.log(CREATE_TABLE_SQL)
    } else if (error.code === '42703') {
      console.log('❌ BẢNG TỒN TẠI NHƯNG THIẾU CỘT! Lỗi:', error.message)
      console.log('\n📋 Chạy SQL sau để fix:\n')
      console.log(FIX_COLUMNS_SQL)
    } else if (error.message?.includes('row-level security')) {
      console.log('❌ BẢNG TỒN TẠI nhưng RLS đang chặn SELECT!')
      console.log('\n📋 Chạy SQL sau để mở quyền:\n')
      console.log(FIX_RLS_SQL)
    } else {
      console.log('❌ Lỗi không xác định:', error)
    }
    return
  }

  console.log('✅ BẢNG FEEDBACKS TỒN TẠI!')
  console.log(`📊 Hiện có ${data.length} bản ghi (giới hạn 5 để check)`)

  if (data.length > 0) {
    console.log('\n📝 Cấu trúc các cột thực tế (từ bản ghi đầu tiên):')
    console.log(Object.keys(data[0]).join(', '))
    console.log('\n📄 Dữ liệu mẫu:')
    data.forEach((row, i) => {
      console.log(`  [${i + 1}] id=${row.id?.slice(0,8)} | content="${row.content?.slice(0,60)}..." | rating=${row.rating} | created=${row.created_at?.slice(0,10)}`)
    })
  } else {
    console.log('\n⚠️  Bảng rỗng — chưa có dữ liệu nào được gửi.')
  }

  // 2. Thử INSERT test để kiểm tra quyền ghi
  console.log('\n🔐 Kiểm tra quyền INSERT...')
  const { error: insertError } = await supabase
    .from('feedbacks')
    .insert({
      content: '[TEST] Kiểm tra từ script - có thể xóa',
      rating: 5
    })

  if (insertError) {
    console.log('❌ Không thể INSERT:', insertError.message)
    if (insertError.message?.includes('row-level security')) {
      console.log('\n📋 Chạy SQL sau để mở quyền INSERT:\n')
      console.log(FIX_RLS_SQL)
    }
  } else {
    console.log('✅ Quyền INSERT hoạt động tốt!')
    // Xóa bản ghi test vừa tạo
    await supabase.from('feedbacks').delete().eq('content', '[TEST] Kiểm tra từ script - có thể xóa')
    console.log('🧹 Đã dọn dẹp bản ghi test.')
  }
}

const CREATE_TABLE_SQL = `-- ===================================
-- TẠO BẢNG FEEDBACKS MỚI HOÀN TOÀN
-- ===================================
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content     text NOT NULL,
  rating      integer DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- Mở quyền truy cập công khai (RLS Policies)
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert feedbacks"
  ON public.feedbacks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public select feedbacks"
  ON public.feedbacks FOR SELECT
  USING (true);

CREATE POLICY "Allow public delete feedbacks"
  ON public.feedbacks FOR DELETE
  USING (true);`

const FIX_COLUMNS_SQL = `-- ===================================
-- FIX CỘT BỊ THIẾU (nếu bảng đã tồn tại)
-- ===================================
-- Xóa cột title nếu tồn tại (không cần nữa)
ALTER TABLE public.feedbacks DROP COLUMN IF EXISTS title;

-- Đảm bảo các cột cần thiết tồn tại
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS rating integer DEFAULT 5;
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS user_id uuid;`

const FIX_RLS_SQL = `-- ===================================
-- MỞ QUYỀN RLS CHO BẢNG FEEDBACKS
-- ===================================
CREATE POLICY "Allow public insert feedbacks"
  ON public.feedbacks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public select feedbacks"
  ON public.feedbacks FOR SELECT
  USING (true);

CREATE POLICY "Allow public delete feedbacks"
  ON public.feedbacks FOR DELETE
  USING (true);`

checkFeedbacksTable().catch(console.error)
