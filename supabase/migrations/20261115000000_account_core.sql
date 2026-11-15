create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists preferred_language text not null default 'ru';
alter table public.profiles add column if not exists timezone text;
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon text not null default '',
  url text not null,
  category text not null default 'service',
  status text not null default 'available'
    check (status in ('available', 'restricted', 'maintenance', 'coming_soon')),
  visibility text not null default 'public'
    check (visibility in ('public', 'private')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_project_access (
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  access_level text not null default 'member',
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create table if not exists public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete restrict,
  event_type text not null,
  source_event_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, project_id, source_event_id)
);
create index if not exists user_activity_user_created_idx
  on public.user_activity (user_id, created_at desc);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  icon text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  metric text not null check (metric in ('tasks', 'tests', 'minutes')),
  target_value integer not null check (target_value > 0),
  current_value integer not null default 0 check (current_value >= 0),
  period text not null check (period in ('weekly', 'monthly')),
  created_at timestamptz not null default now()
);
create index if not exists user_goals_user_created_idx
  on public.user_goals (user_id, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null default 'info',
  title text not null,
  body text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create table if not exists public.service_data (
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  record_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id, record_id)
);

create table if not exists public.geotrainer_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_id text not null,
  legacy_username text,
  attempt_data jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, source_id)
);
create index if not exists geotrainer_attempts_user_created_idx
  on public.geotrainer_attempts (user_id, created_at desc);

alter table public.projects enable row level security;
alter table public.user_project_access enable row level security;
alter table public.user_activity enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_goals enable row level security;
alter table public.notifications enable row level security;
alter table public.service_data enable row level security;
alter table public.geotrainer_attempts enable row level security;

drop policy if exists "projects_read_public" on public.projects;
create policy "projects_read_public" on public.projects
  for select to anon, authenticated using (visibility = 'public');
drop policy if exists "projects_read_assigned" on public.projects;
create policy "projects_read_assigned" on public.projects
  for select to authenticated using (
    exists (
      select 1 from public.user_project_access a
      where a.project_id = projects.id and a.user_id = (select auth.uid())
        and a.is_active and (a.expires_at is null or a.expires_at > now())
    )
  );

drop policy if exists "user_project_access_select_own" on public.user_project_access;
create policy "user_project_access_select_own" on public.user_project_access
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "user_activity_select_own" on public.user_activity;
create policy "user_activity_select_own" on public.user_activity
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "achievements_read_active" on public.achievements;
create policy "achievements_read_active" on public.achievements
  for select to anon, authenticated using (is_active);

drop policy if exists "user_achievements_select_own" on public.user_achievements;
create policy "user_achievements_select_own" on public.user_achievements
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "user_goals_select_own" on public.user_goals;
create policy "user_goals_select_own" on public.user_goals
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "user_goals_insert_own" on public.user_goals;
create policy "user_goals_insert_own" on public.user_goals
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "user_goals_update_own" on public.user_goals;
create policy "user_goals_update_own" on public.user_goals
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "user_goals_delete_own" on public.user_goals;
create policy "user_goals_delete_own" on public.user_goals
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "service_data_select_own" on public.service_data;
create policy "service_data_select_own" on public.service_data
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "service_data_insert_own" on public.service_data;
create policy "service_data_insert_own" on public.service_data
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "service_data_update_own" on public.service_data;
create policy "service_data_update_own" on public.service_data
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "service_data_delete_own" on public.service_data;
create policy "service_data_delete_own" on public.service_data
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "geotrainer_attempts_select_own" on public.geotrainer_attempts;
create policy "geotrainer_attempts_select_own" on public.geotrainer_attempts
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "geotrainer_attempts_insert_own" on public.geotrainer_attempts;
create policy "geotrainer_attempts_insert_own" on public.geotrainer_attempts
  for insert to authenticated with check (user_id = (select auth.uid()));

revoke all on public.profiles, public.projects, public.user_project_access,
  public.user_activity, public.achievements, public.user_achievements,
  public.user_goals, public.notifications, public.service_data,
  public.geotrainer_attempts from public, anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select on public.projects to anon, authenticated;
grant select on public.user_project_access to authenticated;
grant select on public.user_activity to authenticated;
grant select on public.achievements to anon, authenticated;
grant select on public.user_achievements to authenticated;
grant select, insert, update, delete on public.user_goals to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert, update, delete on public.service_data to authenticated;
grant select, insert on public.geotrainer_attempts to authenticated;
grant all on public.profiles, public.projects, public.user_project_access,
  public.user_activity, public.achievements, public.user_achievements,
  public.user_goals, public.notifications, public.service_data,
  public.geotrainer_attempts to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.projects (slug, name, description, icon, url, category, status, visibility)
values
  ('exam-trainer', 'Exam Trainer', 'Подготовка к экзаменам и история попыток.', 'E', 'https://exam.nmchv.ru/', 'Обучение', 'available', 'public'),
  ('geotrainer', 'GeoTrainer', 'Географические тесты, карты и прогресс обучения.', 'G', 'https://www.geotrainer.nmchv.ru/', 'Обучение', 'available', 'public')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  url = excluded.url,
  category = excluded.category,
  status = excluded.status,
  visibility = excluded.visibility;

create or replace function public.record_exam_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_id uuid;
begin
  if new.status <> 'completed' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'completed' then
    return new;
  end if;

  select p.id into project_id
  from public.projects p
  where p.slug = 'exam-trainer';
  if project_id is null then
    raise exception 'Project registry entry exam-trainer is missing';
  end if;

  insert into public.user_activity (
    user_id, project_id, event_type, source_event_id, metadata, created_at
  )
  values (
    new.user_id, project_id, 'test_completed', 'exam:' || new.id::text,
    jsonb_build_object('exam_id', new.exam_id, 'score', new.score, 'max_score', new.max_score, 'percentage', new.percentage),
    coalesce(new.finished_at, now())
  )
  on conflict (user_id, project_id, source_event_id) do nothing;
  return new;
end;
$$;

drop trigger if exists attempts_account_activity on public.attempts;
create trigger attempts_account_activity
  after insert or update of status on public.attempts
  for each row execute function public.record_exam_activity();

create or replace function public.record_geotrainer_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_id uuid;
begin
  select p.id into project_id
  from public.projects p
  where p.slug = 'geotrainer';
  if project_id is null then
    raise exception 'Project registry entry geotrainer is missing';
  end if;

  insert into public.user_activity (
    user_id, project_id, event_type, source_event_id, metadata, created_at
  )
  values (
    new.user_id, project_id, 'test_completed', 'geo:' || new.source_id,
    jsonb_build_object('legacy_username', new.legacy_username),
    new.created_at
  )
  on conflict (user_id, project_id, source_event_id) do nothing;
  return new;
end;
$$;

drop trigger if exists geotrainer_account_activity on public.geotrainer_attempts;
create trigger geotrainer_account_activity
  after insert on public.geotrainer_attempts
  for each row execute function public.record_geotrainer_activity();
