-- Weather Forecast · limite de aparelhos e "apagar minha conta" (ADR-051)
-- Estas funções apagam SESSÕES (desconectar aparelho) e a PRÓPRIA CONTA de quem pede.
-- Por mexerem em dados de login, o Supabase pede confirmação humana: o Dalmo cola este arquivo
-- no SQL Editor do projeto weather-forecast e clica em Run.

create or replace function public.claim_device(p_label text default '')
returns table (session_id uuid, label text, last_seen timestamptz, is_current boolean, revoked int)
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  sid uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  lim int;
  n int := 0;
begin
  if uid is null or sid is null or not public.session_ok() then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  lim := (public.plan_of(uid)).max_devices;
  delete from public.devices d where d.user_id = uid
    and not exists (select 1 from auth.sessions s where s.id = d.session_id);
  insert into public.devices as d (session_id, user_id, label)
    values (sid, uid, left(regexp_replace(coalesce(p_label, ''), '[[:cntrl:]<>]', '', 'g'), 60))
    on conflict on constraint devices_pkey do update set last_seen = now(),
      label = case when excluded.label <> '' then excluded.label else d.label end
    where d.user_id = uid;
  -- fica este aparelho + os mais recentes até o limite do plano; os outros são desconectados
  with keep as (
    select s.id from auth.sessions s
    left join public.devices d on d.session_id = s.id
    where s.user_id = uid
    order by (s.id = sid) desc, coalesce(d.last_seen, s.updated_at, s.created_at) desc
    limit lim
  ), gone as (
    delete from auth.sessions s where s.user_id = uid and s.id not in (select k.id from keep k) returning s.id
  )
  select count(*) into n from gone;
  delete from public.devices d where d.user_id = uid
    and not exists (select 1 from auth.sessions s where s.id = d.session_id);
  return query select d.session_id, d.label, d.last_seen, d.session_id = sid, n
    from public.devices d where d.user_id = uid order by d.last_seen desc;
end $$;

create or replace function public.revoke_device(p_session uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.session_ok() then raise exception 'not_authenticated' using errcode = '28000'; end if;
  delete from auth.sessions s where s.id = p_session and s.user_id = uid;
  delete from public.devices d where d.session_id = p_session and d.user_id = uid;
end $$;

create or replace function public.delete_my_account() returns void
language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.session_ok() then raise exception 'not_authenticated' using errcode = '28000'; end if;
  delete from auth.users u where u.id = uid;  -- perfil, dados e aparelhos saem em cascata
end $$;

-- Só quem está logado chama; ninguém de fora (anon) e nenhuma função interna exposta
revoke execute on function public.session_ok(), public.plan_of(uuid), public.my_plan(), public.handle_new_user(),
  public.enforce_plan_limits(), public.claim_device(text), public.revoke_device(uuid), public.delete_my_account() from public, anon;
revoke execute on function public.plan_of(uuid), public.handle_new_user(), public.enforce_plan_limits() from authenticated;
grant execute on function public.session_ok(), public.my_plan(), public.claim_device(text),
  public.revoke_device(uuid), public.delete_my_account() to authenticated;
