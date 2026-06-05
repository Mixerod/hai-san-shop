# Phase 12 — Setup Files & Documentation

## Mục tiêu
Tạo các file hỗ trợ setup để dev mới có thể chạy app ngay.

## Files tạo mới
- `admin-app/.env.example` — template cho Supabase credentials
- `supabase/migrations/20240101000000_admin_push_tokens.sql` — SQL tạo bảng admin_push_tokens với RLS policies

## Hướng dẫn setup nhanh
1. Copy `admin-app/.env.example` → `admin-app/.env`
2. Điền `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Chạy SQL migration trong Supabase SQL Editor (hoặc qua Supabase CLI)
4. Deploy Edge Function: `supabase functions deploy send-push-notification`
5. Tạo database webhook trên bảng `orders` INSERT → gọi Edge Function
6. Chạy app: `cd admin-app && npx expo start`

## Status: ✅ Done
