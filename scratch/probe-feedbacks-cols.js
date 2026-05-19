const { createClient } = require('@supabase/supabase-js')
const s = createClient(
  'https://irldjacvpnjnsdfejbue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlybGRqYWN2cG5qbnNkZmVqYnVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4OTk2OTksImV4cCI6MjA5NDQ3NTY5OX0.2YN5SKaYwRSo9YEztgsHfkyUJlIal_e1wDCZyjxh1RM'
)

async function run() {
  const cols = ['content', 'rating', 'user_id', 'title', 'created_at', 'id']
  console.log('Kiểm tra từng cột:\n')
  for (const col of cols) {
    const r = await s.from('feedbacks').insert({ [col]: col === 'rating' ? 5 : 'test_col_probe' })
    if (r.error && r.error.message.includes("Could not find")) {
      console.log(`  ❌ Cột "${col}" KHÔNG TỒN TẠI`)
    } else if (r.error) {
      console.log(`  ✅ Cột "${col}" TỒN TẠI (lỗi khác: ${r.error.message.slice(0,60)})`)
      // cleanup
      await s.from('feedbacks').delete().eq('content', 'test_col_probe')
    } else {
      console.log(`  ✅ Cột "${col}" TỒN TẠI - insert thành công`)
      await s.from('feedbacks').delete().eq('content', 'test_col_probe')
    }
  }
}
run().catch(console.error)
