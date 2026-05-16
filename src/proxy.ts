import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Email duy nhất được cấp quyền Admin
const ADMIN_EMAIL = 'minhquyet08122003@gmail.com'

export async function proxy(request: NextRequest) {
  // Tạo response chuẩn của Next.js
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Khởi tạo Supabase Server Client an toàn trong Middleware (để đọc cookie auth)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // LOGIC PHÂN QUYỀN TRUY CẬP: Chỉ quét các route bắt đầu bằng /admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    
    // Đọc session user hiện tại
    const { data: { user } } = await supabase.auth.getUser()

    // 1. CHƯA ĐĂNG NHẬP -> Về trang /auth
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth'
      return NextResponse.redirect(url)
    }

    // Kiểm tra chính xác email admin
    const isAdmin = user.email === ADMIN_EMAIL

    // KHÔNG PHẢI ADMIN -> Về trang chủ /
    if (!isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Chấp nhận truy cập bình thường
  return supabaseResponse
}

// Chỉ định Middleware chạy trên các đường dẫn nào
export const config = {
  matcher: [
    /*
     * Match toàn bộ các đường dẫn NGOẠI TRỪ:
     * - _next/static (cấu trúc React/Next)
     * - _next/image (ảnh tối ưu)
     * - favicon.ico
     * - các file dạng ảnh (.svg, .png, .jpg...) hoặc font
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
