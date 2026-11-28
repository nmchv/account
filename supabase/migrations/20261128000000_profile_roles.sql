-- Роли пользователей: student / teacher, выбираются при регистрации.
-- Применять после 20261115000000_account_core.sql.
-- Одобрение учителей супер-администратором будет отдельной миграцией. До этого
-- role = 'teacher' — лишь заявленная роль: не выдавайте по ней доступ к чужим данным.

begin;

-- Уже существующие пользователи получают 'student'.
alter table public.profiles
  add column if not exists role text not null default 'student';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('student', 'teacher'));

-- Роль берётся из метаданных регистрации. Их присылает браузер, поэтому
-- принимаются только два значения; всё остальное (или отсутствие роли,
-- например при создании пользователя из Dashboard) означает 'student'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    case when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher' else 'student' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Пользователь не должен менять свою роль из браузера. Табличные права на
-- запись заменяются правами на отдельные колонки (role в списки не входит).
-- id нужен в update: кабинет сохраняет профиль через upsert, а RLS не даёт
-- подставить чужой id.
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, username, display_name, avatar_url, bio, preferred_language, timezone)
  on public.profiles to authenticated;
grant update (id, username, display_name, avatar_url, bio, preferred_language, timezone)
  on public.profiles to authenticated;

commit;
