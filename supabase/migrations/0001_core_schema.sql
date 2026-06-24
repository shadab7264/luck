create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.charities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  logo_url text,
  cover_image_url text,
  currency text default 'gbp',
  is_featured boolean default false,
  is_active boolean default true,
  created_by uuid,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'subscriber' check (role in ('subscriber', 'admin')),
  selected_charity_id uuid references public.charities(id),
  charity_contribution_pct numeric not null default 10 check (charity_contribution_pct >= 10 and charity_contribution_pct <= 100),
  stripe_customer_id text unique,
  country text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.charities
  drop constraint if exists charities_created_by_fkey,
  add constraint charities_created_by_fkey foreign key (created_by) references public.profiles(id);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan text check (plan in ('monthly', 'yearly')),
  status text check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')),
  currency text default 'gbp',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.golf_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  score int not null check (score >= 1 and score <= 45),
  score_date date not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, score_date)
);

create table if not exists public.charity_events (
  id uuid primary key default gen_random_uuid(),
  charity_id uuid references public.charities(id) on delete cascade,
  title text,
  event_date date,
  location text,
  description text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.draws (
  id uuid primary key default gen_random_uuid(),
  draw_month date not null unique,
  draw_type text check (draw_type in ('random', 'algorithmic')),
  algorithmic_mode text default 'most_frequent' check (algorithmic_mode in ('most_frequent', 'least_frequent')),
  status text check (status in ('draft', 'simulated', 'published')) default 'draft',
  winning_numbers int[] not null default '{}',
  total_prize_pool numeric not null default 0,
  pool_5_match numeric default 0,
  pool_4_match numeric default 0,
  pool_3_match numeric default 0,
  jackpot_rollover_amount numeric default 0,
  published_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint draws_month_first_day check (draw_month = date_trunc('month', draw_month)::date)
);

create table if not exists public.draw_entries (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid references public.draws(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  entry_numbers int[] not null,
  match_count int,
  prize_amount numeric default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (draw_id, user_id)
);

create table if not exists public.winners (
  id uuid primary key default gen_random_uuid(),
  draw_entry_id uuid unique references public.draw_entries(id) on delete cascade,
  proof_image_url text,
  verification_status text check (verification_status in ('pending', 'approved', 'rejected')) default 'pending',
  payment_status text check (payment_status in ('pending', 'paid')) default 'pending',
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  charity_id uuid references public.charities(id),
  amount numeric not null,
  currency text default 'gbp',
  stripe_payment_intent_id text unique,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique not null,
  type text,
  processed_at timestamptz default now(),
  payload jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Extra ledger tables required to make charity reporting and prize-pool math auditable.
create table if not exists public.charity_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  charity_id uuid references public.charities(id),
  stripe_invoice_id text unique not null,
  amount numeric not null,
  currency text default 'gbp',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  stripe_invoice_id text unique not null,
  amount_paid numeric not null,
  charity_amount numeric not null default 0,
  prize_pool_amount numeric not null default 0,
  currency text default 'gbp',
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.subscription_invoices is 'Webhook-fed revenue ledger used by publish_draw to calculate prize pools without hardcoded amounts.';

-- Future activation stub: campaigns can later group charities, sponsors, or organizations
-- with active date ranges, target amounts, and membership rules. It is intentionally
-- not implemented because the PRD asks only for readiness, not the feature itself.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'charities', 'profiles', 'subscriptions', 'golf_scores', 'charity_events',
    'draws', 'draw_entries', 'winners', 'donations', 'webhook_events',
    'charity_allocations', 'subscription_invoices'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.require_score_owner(p_user_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user_id and not public.is_admin() then
    raise exception 'Not allowed to edit scores for this user';
  end if;
end;
$$;

create or replace function public.upsert_golf_score(p_user_id uuid, p_score int, p_score_date date)
returns public.golf_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_score public.golf_scores;
begin
  perform public.require_score_owner(p_user_id);

  if p_score < 1 or p_score > 45 then
    raise exception 'Score must be between 1 and 45';
  end if;

  insert into public.golf_scores (user_id, score, score_date)
  values (p_user_id, p_score, p_score_date)
  on conflict (user_id, score_date) do update set score = excluded.score
  returning * into saved_score;

  delete from public.golf_scores gs
  where gs.user_id = p_user_id
    and gs.id in (
      select id
      from public.golf_scores
      where user_id = p_user_id
      order by score_date desc, created_at desc
      offset 5
    );

  return saved_score;
end;
$$;

create or replace function public.generate_winning_numbers(
  p_draw_month date,
  p_draw_type text,
  p_algorithmic_mode text default 'most_frequent'
)
returns int[]
language plpgsql
security definer
set search_path = public
as $$
declare
  result int[];
begin
  if p_draw_type = 'random' then
    select array_agg(n order by random())
    into result
    from generate_series(1, 45) n
    limit 5;

    select array_agg(n order by n) into result
    from unnest(result[1:5]) n;

    return result;
  end if;

  -- Algorithmic mode weights numbers by frequency of submitted scores in the draw month.
  -- "most_frequent" favors the scores users submit most often; "least_frequent" favors
  -- numbers seen least often, with absent values included at frequency zero.
  with frequency as (
    select n, count(gs.score)::int as hits
    from generate_series(1, 45) n
    left join public.golf_scores gs
      on gs.score = n
      and gs.score_date >= p_draw_month
      and gs.score_date < (p_draw_month + interval '1 month')::date
    group by n
  ),
  picked as (
    select n
    from frequency
    order by
      case when p_algorithmic_mode = 'least_frequent' then hits end asc nulls last,
      case when p_algorithmic_mode <> 'least_frequent' then hits end desc nulls last,
      random()
    limit 5
  )
  select array_agg(n order by n) into result
  from picked;

  return result;
end;
$$;

create or replace function public.entry_match_count(p_entry int[], p_winning int[])
returns int
language sql
immutable
as $$
  select count(*)::int
  from unnest(p_entry) entry_number
  where entry_number = any(p_winning);
$$;

create or replace function public.snapshot_draw_entries(p_draw_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.draw_entries (draw_id, user_id, entry_numbers)
  select
    p_draw_id,
    p.id,
    array_agg(gs.score order by gs.score_date desc, gs.created_at desc)
  from public.profiles p
  join public.subscriptions s
    on s.user_id = p.id
    and s.status in ('active', 'trialing')
    and s.current_period_end > now()
  join lateral (
    select score, score_date, created_at
    from public.golf_scores
    where user_id = p.id
    order by score_date desc, created_at desc
    limit 5
  ) gs on true
  group by p.id
  having count(*) = 5
  on conflict (draw_id, user_id) do update set entry_numbers = excluded.entry_numbers;
$$;

create or replace function public.run_draw_simulation(
  p_draw_month date,
  p_draw_type text,
  p_algorithmic_mode text default 'most_frequent'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numbers int[];
  v_draw_id uuid;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin role required';
  end if;

  v_numbers := public.generate_winning_numbers(p_draw_month, p_draw_type, p_algorithmic_mode);

  insert into public.draws (draw_month, draw_type, algorithmic_mode, status, winning_numbers, created_by)
  values (p_draw_month, p_draw_type, p_algorithmic_mode, 'simulated', v_numbers, auth.uid())
  on conflict (draw_month) do update
    set draw_type = excluded.draw_type,
        algorithmic_mode = excluded.algorithmic_mode,
        status = 'simulated',
        winning_numbers = excluded.winning_numbers,
        published_at = null
  returning id into v_draw_id;

  perform public.snapshot_draw_entries(v_draw_id);

  with counts as (
    select public.entry_match_count(entry_numbers, v_numbers) as match_count
    from public.draw_entries
    where draw_id = v_draw_id
  )
  select jsonb_build_object(
    'draw_id', v_draw_id,
    'winning_numbers', v_numbers,
    'entries', (select count(*) from public.draw_entries where draw_id = v_draw_id),
    'match_5', (select count(*) from counts where match_count = 5),
    'match_4', (select count(*) from counts where match_count = 4),
    'match_3', (select count(*) from counts where match_count = 3),
    'not_visible_to_users', true
  )
  into v_result;

  return v_result;
end;
$$;

create or replace function public.publish_draw(p_draw_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draw public.draws;
  v_revenue numeric;
  v_rollover numeric;
  v_pool_5 numeric;
  v_pool_4 numeric;
  v_pool_3 numeric;
  v_count_5 int;
  v_count_4 int;
  v_count_3 int;
begin
  if not public.is_admin() then
    raise exception 'Admin role required';
  end if;

  select * into v_draw
  from public.draws
  where id = p_draw_id
  for update;

  if not found then
    raise exception 'Draw not found';
  end if;

  if coalesce(array_length(v_draw.winning_numbers, 1), 0) <> 5 then
    update public.draws
    set winning_numbers = public.generate_winning_numbers(draw_month, draw_type, algorithmic_mode)
    where id = p_draw_id
    returning * into v_draw;
  end if;

  perform public.snapshot_draw_entries(p_draw_id);

  select coalesce(sum(prize_pool_amount), 0)
  into v_revenue
  from public.subscription_invoices
  where period_start >= v_draw.draw_month
    and period_start < (v_draw.draw_month + interval '1 month')::date;

  select coalesce(d.pool_5_match, 0)
  into v_rollover
  from public.draws d
  where d.draw_month < v_draw.draw_month
    and d.status = 'published'
    and not exists (
      select 1
      from public.draw_entries de
      where de.draw_id = d.id
        and de.match_count = 5
    )
  order by d.draw_month desc
  limit 1;

  v_pool_5 := round((v_revenue * 0.40) + coalesce(v_draw.jackpot_rollover_amount, v_rollover, 0), 2);
  v_pool_4 := round(v_revenue * 0.35, 2);
  v_pool_3 := round(v_revenue * 0.25, 2);

  update public.draw_entries
  set match_count = public.entry_match_count(entry_numbers, v_draw.winning_numbers),
      prize_amount = 0
  where draw_id = p_draw_id;

  select
    count(*) filter (where match_count = 5),
    count(*) filter (where match_count = 4),
    count(*) filter (where match_count = 3)
  into v_count_5, v_count_4, v_count_3
  from public.draw_entries
  where draw_id = p_draw_id;

  update public.draw_entries
  set prize_amount = case
    when match_count = 5 and v_count_5 > 0 then round(v_pool_5 / v_count_5, 2)
    when match_count = 4 and v_count_4 > 0 then round(v_pool_4 / v_count_4, 2)
    when match_count = 3 and v_count_3 > 0 then round(v_pool_3 / v_count_3, 2)
    else 0
  end
  where draw_id = p_draw_id;

  insert into public.winners (draw_entry_id)
  select id
  from public.draw_entries
  where draw_id = p_draw_id
    and match_count in (3, 4, 5)
  on conflict do nothing;

  update public.draws
  set status = 'published',
      total_prize_pool = v_pool_5 + v_pool_4 + v_pool_3,
      pool_5_match = case when v_count_5 = 0 then v_pool_5 else v_pool_5 end,
      pool_4_match = v_pool_4,
      pool_3_match = v_pool_3,
      jackpot_rollover_amount = coalesce(v_draw.jackpot_rollover_amount, v_rollover, 0),
      published_at = now()
  where id = p_draw_id;

  return jsonb_build_object(
    'draw_id', p_draw_id,
    'winning_numbers', v_draw.winning_numbers,
    'total_prize_pool', v_pool_5 + v_pool_4 + v_pool_3,
    'match_5', v_count_5,
    'match_4', v_count_4,
    'match_3', v_count_3,
    'rollover_to_next_draw', case when v_count_5 = 0 then v_pool_5 else 0 end
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.golf_scores enable row level security;
alter table public.charities enable row level security;
alter table public.charity_events enable row level security;
alter table public.draws enable row level security;
alter table public.draw_entries enable row level security;
alter table public.winners enable row level security;
alter table public.donations enable row level security;
alter table public.webhook_events enable row level security;
alter table public.charity_allocations enable row level security;
alter table public.subscription_invoices enable row level security;

drop policy if exists "profiles own select" on public.profiles;
create policy "profiles own select" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists "scores own crud" on public.golf_scores;
create policy "scores own crud" on public.golf_scores for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "subscriptions own select" on public.subscriptions;
create policy "subscriptions own select" on public.subscriptions for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "charities public active select" on public.charities;
create policy "charities public active select" on public.charities for select using (is_active = true or public.is_admin());
drop policy if exists "charities admin write" on public.charities;
create policy "charities admin write" on public.charities for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "events public active select" on public.charity_events;
create policy "events public active select" on public.charity_events for select using (
  exists (select 1 from public.charities c where c.id = charity_id and c.is_active = true) or public.is_admin()
);
drop policy if exists "events admin write" on public.charity_events;
create policy "events admin write" on public.charity_events for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "draws public published select" on public.draws;
create policy "draws public published select" on public.draws for select using (status = 'published' or public.is_admin());
drop policy if exists "draws admin write" on public.draws;
create policy "draws admin write" on public.draws for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "draw entries own select" on public.draw_entries;
create policy "draw entries own select" on public.draw_entries for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "draw entries admin write" on public.draw_entries;
create policy "draw entries admin write" on public.draw_entries for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "winners own select" on public.winners;
create policy "winners own select" on public.winners for select using (
  public.is_admin()
  or exists (
    select 1
    from public.draw_entries de
    where de.id = draw_entry_id
      and de.user_id = auth.uid()
  )
);
drop policy if exists "winners admin write" on public.winners;
create policy "winners admin write" on public.winners for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "donations own select insert" on public.donations;
create policy "donations own select insert" on public.donations for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "donations own insert" on public.donations;
create policy "donations own insert" on public.donations for insert with check (user_id = auth.uid());

drop policy if exists "charity allocations admin select" on public.charity_allocations;
create policy "charity allocations admin select" on public.charity_allocations for select using (public.is_admin() or user_id = auth.uid());
drop policy if exists "subscription invoices admin select" on public.subscription_invoices;
create policy "subscription invoices admin select" on public.subscription_invoices for select using (public.is_admin() or user_id = auth.uid());
