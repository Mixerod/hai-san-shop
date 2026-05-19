import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import CartExitGuard from '@/components/CartExitGuard'

export const metadata: Metadata = {
  title: 'Hải Sản Sạch - Đặc Sản Miền Biển',
  description: 'Cá tươi, cá khô, chả cá, chả mực, mắm - trực tiếp từ cảng và ghe lưới',
  icons: {
    icon: '/icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Thêm suppressHydrationWarning vào đây để React lờ đi những class bị extension cài lén vào
    <html lang="vi" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="bg-slate-50 text-slate-800 min-h-screen w-full flex flex-col items-stretch">
        <Navbar />
        <CartExitGuard />
        <main className="flex-grow w-full">
          {children}
        </main>
      </body>
    </html>
  )
}