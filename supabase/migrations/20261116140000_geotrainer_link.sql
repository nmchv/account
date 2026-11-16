-- Связь логина GeoTrainer с аккаунтом nmchv (единый email).
-- Позволяет пользователю привязать свой legacy-логин Геотренажёра к учётной
-- записи кабинета и хранить/показывать статистику в geotrainer_attempts.

create table if not exists public.geotrainer_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  legacy_key text not null,
  legacy_name text not null,
  linked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legacy_key)
);

create index if not exists geotrainer_links_legacy_key_idx
  on public.geotrainer_links (legacy_key);

alter table public.geotrainer_links enable row level security;

drop policy if exists "geotrainer_links_select_own" on public.geotrainer_links;
create policy "geotrainer_links_select_own" on public.geotrainer_links
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "geotrainer_links_insert_own" on public.geotrainer_links;
create policy "geotrainer_links_insert_own" on public.geotrainer_links
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

drop policy if exists "geotrainer_links_update_own" on public.geotrainer_links;
create policy "geotrainer_links_update_own" on public.geotrainer_links
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

revoke all on public.geotrainer_links from public, anon;
grant select, insert, update on public.geotrainer_links to authenticated;
grant all on public.geotrainer_links to service_role;

-- Админ видит связи (если функция is_admin уже создана миграциями админки).
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_admin'
  ) then
    execute 'drop policy if exists "geotrainer_links_select_admin" on public.geotrainer_links';
    execute 'create policy "geotrainer_links_select_admin" on public.geotrainer_links for select to authenticated using (public.is_admin())';
  end if;
end $$;

-- Удобная RPC для привязки из клиента (Геотренажёр/кабинет): проверяет, что
-- почта текущей сессии совпадает с переданной, и сохраняет связь.
create or replace function public.link_geotrainer_account(p_email text, p_legacy_key text, p_legacy_name text)
returns public.geotrainer_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_email text;
  v_row public.geotrainer_links;
begin
  v_uid := auth.uid();
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if v_uid is null or v_email = '' then
    raise exception 'not_authenticated';
  end if;
  if lower(coalesce(p_email, '')) <> v_email then
    raise exception 'email_mismatch';
  end if;
  if coalesce(trim(p_legacy_key), '') = '' then
    raise exception 'legacy_key_required';
  end if;

  insert into public.geotrainer_links (user_id, email, legacy_key, legacy_name, linked_at, updated_at)
  values (v_uid, v_email, trim(p_legacy_key), coalesce(nullif(trim(p_legacy_name), ''), trim(p_legacy_key)), now(), now())
  on conflict (user_id) do update set
    email = excluded.email,
    legacy_key = excluded.legacy_key,
    legacy_name = excluded.legacy_name,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.link_geotrainer_account(text, text, text) from public, anon;
grant execute on function public.link_geotrainer_account(text, text, text) to authenticated;
