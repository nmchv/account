-- Импорт попыток Геотренажёра в личный кабинет после привязки логина.
-- Принимает массив попыток и сохраняет их в geotrainer_attempts для текущего
-- пользователя (auth.uid()). Триггер record_geotrainer_activity создаёт записи
-- в user_activity автоматически.

create or replace function public.sync_geotrainer_attempts(p_legacy_name text, p_attempts jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_item jsonb;
  v_source text;
  v_created timestamptz;
  v_count integer := 0;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_attempts is null or jsonb_typeof(p_attempts) <> 'array' then
    return 0;
  end if;

  for v_item in select value from jsonb_array_elements(p_attempts)
  loop
    -- Стабильный идентификатор попытки: ts + id теста (как в Геотренажёре).
    v_source := coalesce(nullif(v_item->>'source_id',''),
      coalesce(v_item->>'ts','') || ':' || coalesce(v_item->>'id',''));
    if v_source = '' or v_source = ':' then
      continue;
    end if;
    begin
      v_created := to_timestamp((v_item->>'ts')::double precision / 1000.0);
    exception when others then
      v_created := now();
    end;
    if v_created is null then v_created := now(); end if;

    insert into public.geotrainer_attempts (user_id, source_id, legacy_username, attempt_data, created_at)
    values (
      v_uid,
      v_source,
      nullif(trim(coalesce(p_legacy_name, '')), ''),
      v_item,
      v_created
    )
    on conflict (user_id, source_id) do update set
      legacy_username = coalesce(excluded.legacy_username, geotrainer_attempts.legacy_username),
      attempt_data = excluded.attempt_data;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.sync_geotrainer_attempts(text, jsonb) from public, anon;
grant execute on function public.sync_geotrainer_attempts(text, jsonb) to authenticated;

-- Разрешаем обновление своих попыток (нужно для upsert из клиента при желании).
drop policy if exists "geotrainer_attempts_update_own" on public.geotrainer_attempts;
create policy "geotrainer_attempts_update_own" on public.geotrainer_attempts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant update on public.geotrainer_attempts to authenticated;
