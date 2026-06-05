-- Bảng lưu Expo Push Token của admin app
-- Chạy migration này trong Supabase SQL Editor trước khi dùng push notifications

create table if not exists public.admin_push_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  created_at timestamptz not null default now()
);

-- Cho phép service role đọc/ghi (dùng trong Edge Function)
alter table public.admin_push_tokens enable row level security;

create policy "Service role full access"
  on public.admin_push_tokens
  for all
  to service_role
  using (true);

-- Cho phép authenticated user (admin) lưu token của mình
create policy "Authenticated can upsert own token"
  on public.admin_push_tokens
  for insert
  to authenticated
  with check (true);
