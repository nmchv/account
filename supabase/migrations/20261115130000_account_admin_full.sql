-- Полные права администратора (применять после 20261115120000_account_admin.sql).
-- Всё держится на public.is_admin(): обычный пользователь этих политик не проходит,
-- поэтому выданные ниже GRANT безопасны — доступ ограничивает RLS.

-- ---------- Список пользователей с почтой (auth.users недоступна через REST) ----------
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  username text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  events_count bigint,
  last_activity_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select u.id,
           u.email::text,
           coalesce(p.display_name, ''),
           p.username,
           u.created_at,
           u.last_sign_in_at,
           (select count(*) from public.user_activity a where a.user_id = u.id),
           (select max(a.created_at) from public.user_activity a where a.user_id = u.id)
    from auth.users u
    left join public.profiles p on p.id = u.id
    order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- ---------- Гранты на запись (ограничены политиками ниже) ----------
grant insert, update on public.projects to authenticated;
grant insert, update, delete on public.user_project_access to authenticated;
grant insert, update on public.achievements to authenticated;
grant insert, delete on public.user_achievements to authenticated;
grant insert on public.notifications to authenticated;

-- ---------- Сервисы ----------
drop policy if exists "projects_select_admin" on public.projects;
create policy "projects_select_admin" on public.projects
  for select to authenticated using (public.is_admin());
drop policy if exists "projects_insert_admin" on public.projects;
create policy "projects_insert_admin" on public.projects
  for insert to authenticated with check (public.is_admin());
drop policy if exists "projects_update_admin" on public.projects;
create policy "projects_update_admin" on public.projects
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Доступы к сервисам ----------
drop policy if exists "user_project_access_select_admin" on public.user_project_access;
create policy "user_project_access_select_admin" on public.user_project_access
  for select to authenticated using (public.is_admin());
drop policy if exists "user_project_access_insert_admin" on public.user_project_access;
create policy "user_project_access_insert_admin" on public.user_project_access
  for insert to authenticated with check (public.is_admin());
drop policy if exists "user_project_access_update_admin" on public.user_project_access;
create policy "user_project_access_update_admin" on public.user_project_access
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "user_project_access_delete_admin" on public.user_project_access;
create policy "user_project_access_delete_admin" on public.user_project_access
  for delete to authenticated using (public.is_admin());

-- ---------- Достижения ----------
drop policy if exists "achievements_select_admin" on public.achievements;
create policy "achievements_select_admin" on public.achievements
  for select to authenticated using (public.is_admin());
drop policy if exists "achievements_insert_admin" on public.achievements;
create policy "achievements_insert_admin" on public.achievements
  for insert to authenticated with check (public.is_admin());
drop policy if exists "achievements_update_admin" on public.achievements;
create policy "achievements_update_admin" on public.achievements
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "user_achievements_select_admin" on public.user_achievements;
create policy "user_achievements_select_admin" on public.user_achievements
  for select to authenticated using (public.is_admin());
drop policy if exists "user_achievements_insert_admin" on public.user_achievements;
create policy "user_achievements_insert_admin" on public.user_achievements
  for insert to authenticated with check (public.is_admin());
drop policy if exists "user_achievements_delete_admin" on public.user_achievements;
create policy "user_achievements_delete_admin" on public.user_achievements
  for delete to authenticated using (public.is_admin());

-- ---------- Чтение остальных данных пользователей ----------
drop policy if exists "user_goals_select_admin" on public.user_goals;
create policy "user_goals_select_admin" on public.user_goals
  for select to authenticated using (public.is_admin());

drop policy if exists "notifications_select_admin" on public.notifications;
create policy "notifications_select_admin" on public.notifications
  for select to authenticated using (public.is_admin());
drop policy if exists "notifications_insert_admin" on public.notifications;
create policy "notifications_insert_admin" on public.notifications
  for insert to authenticated with check (public.is_admin());

drop policy if exists "service_data_select_admin" on public.service_data;
create policy "service_data_select_admin" on public.service_data
  for select to authenticated using (public.is_admin());

drop policy if exists "geotrainer_attempts_select_admin" on public.geotrainer_attempts;
create policy "geotrainer_attempts_select_admin" on public.geotrainer_attempts
  for select to authenticated using (public.is_admin());
