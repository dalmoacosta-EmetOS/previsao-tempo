-- Weather Forecast · já APLICADO no projeto weather-forecast (qrpuodtyevkemaykfpgn) em 04/10/2026,
-- em 4 migrações: t01_planos, t02_tabelas_usuario, t03_funcoes_base, t04_politicas.
-- Registro para auditoria e para recriar o banco. Ver ADR-051.

-- t01 · planos
create table public.plans (
  id text primary key check (id ~ '^[a-z_]{2,20}$'),
  name text not null,
  max_devices int not null check (max_devices between 1 and 10),
  max_favorites int not null check (max_favorites between 0 and 200),
  max_trips int not null check (max_trips between 0 and 100),
  price_cents int,
  active boolean not null default true
);
alter table public.plans enable row level security;
create policy plans_read on public.plans for select to anon, authenticated using (active);
insert into public.plans (id, name, max_devices, max_favorites, max_trips, price_cents) values
  ('free', 'Grátis', 2, 10, 4, null), ('pro', 'Pro', 3, 50, 20, null);

-- t02 · tabelas da pessoa
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null default 'free' references public.plans(id),
  plan_until timestamptz,
  created_at timestamptz not null default now()
);
create table public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  home jsonb,
  favorites jsonb not null default '[]'::jsonb,
  trips jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint home_tamanho check (home is null or (jsonb_typeof(home) = 'object' and octet_length(home::text) <= 2000)),
  constraint fav_tipo check (jsonb_typeof(favorites) = 'array' and octet_length(favorites::text) <= 40000),
  constraint trips_tipo check (jsonb_typeof(trips) = 'array' and octet_length(trips::text) <= 40000)
);
create table public.devices (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default '' check (char_length(label) <= 60),
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index devices_user on public.devices(user_id);
alter table public.profiles enable row level security;
alter table public.user_data enable row level security;
alter table public.devices enable row level security;

-- t03 · funções: sessão válida, plano em vigor, perfil na criação da conta, limites do plano
create or replace function public.session_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.sessions s
    where s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid and s.user_id = auth.uid());
$$;
create or replace function public.plan_of(p_user uuid) returns public.plans
language sql stable security definer set search_path = '' as $$
  select p.* from public.plans p where p.id = coalesce((
    select pr.plan_id from public.profiles pr
    where pr.user_id = p_user and (pr.plan_until is null or pr.plan_until > now())), 'free');
$$;
create or replace function public.my_plan() returns public.plans
language sql stable security definer set search_path = '' as $$ select * from public.plan_of(auth.uid()); $$;
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  insert into public.user_data (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create or replace function public.enforce_plan_limits() returns trigger
language plpgsql security definer set search_path = '' as $$
declare pl public.plans;
begin
  pl := public.plan_of(new.user_id);
  if jsonb_array_length(new.favorites) > pl.max_favorites then raise exception 'plan_limit_favorites' using errcode = 'P0001'; end if;
  if jsonb_array_length(new.trips) > pl.max_trips then
    new.trips := (select coalesce(jsonb_agg(x.e order by x.i), '[]'::jsonb) from (
      select t.e, t.i from jsonb_array_elements(new.trips) with ordinality t(e, i) order by t.i limit pl.max_trips) x);
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger user_data_limits before insert or update on public.user_data for each row execute function public.enforce_plan_limits();

-- t04 · regras de acesso (cada pessoa só a própria linha, e só com sessão ativa)
create policy profiles_read on public.profiles for select to authenticated using (user_id = (select auth.uid()) and (select public.session_ok()));
create policy data_read on public.user_data for select to authenticated using (user_id = (select auth.uid()) and (select public.session_ok()));
create policy data_insert on public.user_data for insert to authenticated with check (user_id = (select auth.uid()) and (select public.session_ok()));
create policy data_update on public.user_data for update to authenticated
  using (user_id = (select auth.uid()) and (select public.session_ok())) with check (user_id = (select auth.uid()));
create policy devices_read on public.devices for select to authenticated using (user_id = (select auth.uid()) and (select public.session_ok()));
revoke all on public.plans, public.profiles, public.user_data, public.devices from anon, authenticated;
grant select on public.plans to anon, authenticated;
grant select on public.profiles, public.devices to authenticated;
grant select on public.user_data to authenticated;
grant insert (user_id, home, favorites, trips) on public.user_data to authenticated;
grant update (home, favorites, trips) on public.user_data to authenticated;
