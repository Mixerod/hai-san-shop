const { createClient } = require('@supabase/supabase-js')
const s = createClient(
  'https://irldjacvpnjnsdfejbue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlybGRqYWN2cG5qbnNkZmVqYnVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4OTk2OTksImV4cCI6MjA5NDQ3NTY5OX0.2YN5SKaYwRSo9YEztgsHfkyUJlIal_e1wDCZyjxh1RM'
)

async function run() {
  // Thử SELECT để thấy cột
  const { data, error } = await s.from('feedbacks').select('*').limit(1)
  if (error) {
    console.log('SELECT ERR:', error.message, '| code:', error.code)
  } else {
    if (data.length > 0) {
      console.log('COLS:', Object.keys(data[0]).join(', '))
    } else {
      console.log('Bảng rỗng, thử insert...')
      // Insert chỉ có content (không có rating) để xem cột nào tồn tại
      const r2 = await s.from('feedbacks').insert({ content: 'test_probe' })
      if (r2.error) {
        console.log('INSERT(content only) ERR:', r2.error.message)
      } else {
        console.log('INSERT(content only) OK - bảng có cột content')
        // Dọn dẹp
        await s.from('feedbacks').delete().eq('content', 'test_probe')
        
        // Giờ thử thêm rating
        const r3 = await s.from('feedbacks').insert({ content: 'test_probe2', rating: 5 })
        if (r3.error) {
          console.log('INSERT(content+rating) ERR:', r3.error.message, '=> THIẾU CỘT RATING!')
        } else {
          console.log('INSERT(content+rating) OK - bảng có đủ content + rating')
          await s.from('feedbacks').delete().eq('content', 'test_probe2')
        }
      }
    }
  }
}
run().catch(console.error)
