-- Администраторы кабинета.
-- Права определяются только этой таблицей на сервере: кнопка «Админка» в интерфейсе
-- ничего не решает, любые админские данные защищены политиками RLS ниже.
-- Администратор входит обычным паролем своего аккаунта Supabase Auth.

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Пользователь видит только собственную строку (чтобы интерфейс понял, админ ли он).
-- Политик на insert/update/delete нет: назначать админов можно только из SQL Editor
-- или service_role, но не из браузера.
drop policy if exists "admins_select_own" on public.admins;
create policy "admins_select_own" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.admins from public, anon, authenticated;
grant select on public.admins to authenticated;
grant all on public.admins to service_role;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Админ может читать (но не менять) профили и журнал активности всех пользователей.
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists "user_activity_select_admin" on public.user_activity;
create policy "user_activity_select_admin" on public.user_activity
  for select to authenticated using (public.is_admin());

-- Назначить себя администратором (выполнить один раз в SQL Editor, подставив свою почту):
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict do nothing;
