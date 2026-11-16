-- Fix: "column reference \"project_id\" is ambiguous" when geotrainer attempts are synced.
-- The trigger functions used a local variable named project_id; in ON CONFLICT the
-- unqualified name could be resolved ambiguously. Rename to v_project_id.

create or replace function public.record_exam_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
begin
  if new.status <> 'completed' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'completed' then
    return new;
  end if;

  select p.id into v_project_id
  from public.projects p
  where p.slug = 'exam-trainer';
  if v_project_id is null then
    raise exception 'Project registry entry exam-trainer is missing';
  end if;

  insert into public.user_activity (
    user_id, project_id, event_type, source_event_id, metadata, created_at
  )
  values (
    new.user_id, v_project_id, 'test_completed', 'exam:' || new.id::text,
    jsonb_build_object('exam_id', new.exam_id, 'score', new.score, 'max_score', new.max_score, 'percentage', new.percentage),
    coalesce(new.finished_at, now())
  )
  on conflict (user_id, project_id, source_event_id) do nothing;
  return new;
end;
$$;

create or replace function public.record_geotrainer_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
begin
  select p.id into v_project_id
  from public.projects p
  where p.slug = 'geotrainer';
  if v_project_id is null then
    raise exception 'Project registry entry geotrainer is missing';
  end if;

  insert into public.user_activity (
    user_id, project_id, event_type, source_event_id, metadata, created_at
  )
  values (
    new.user_id, v_project_id, 'test_completed', 'geo:' || new.source_id,
    jsonb_build_object('legacy_username', new.legacy_username),
    new.created_at
  )
  on conflict (user_id, project_id, source_event_id) do nothing;
  return new;
end;
$$;
