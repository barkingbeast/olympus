-- OLYMPUS: private tables; public API delegates to a narrowly scoped, authenticated transaction.
create schema if not exists olympus_private;
revoke all on schema olympus_private from public, anon;
grant usage on schema olympus_private to authenticated;
create table olympus_private.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 30),
 god text not null default 'zeus' check(god in ('zeus','poseidon','hades')),
 duo_id uuid, created_at timestamptz not null default now()
);
create table olympus_private.duos (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 invite text not null unique default encode(extensions.gen_random_bytes(16),'hex'),
 rules jsonb not null default '{"goal":"Stay on track together","days":30,"reward":"A meal together","definition":"Masturbation counts as a slip","revision":1}',
 created_at timestamptz not null default now()
);
alter table olympus_private.profiles add foreign key (duo_id) references olympus_private.duos(id);
create index on olympus_private.profiles(duo_id);
create table olympus_private.activities (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null, kind text not null, item text not null default '', payload jsonb not null default '{}',
 created_at timestamptz not null default now(), primary key(user_id,day,kind,item)
);
create table olympus_private.purchases (
 user_id uuid not null references auth.users(id) on delete cascade,
 item text not null, cost int not null, created_at timestamptz not null default now(), primary key(user_id,item)
);
create table olympus_private.notes (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null, body text not null check(length(body)<=2000), primary key(user_id,day)
);
alter table olympus_private.profiles enable row level security;
alter table olympus_private.duos enable row level security;
alter table olympus_private.activities enable row level security;
alter table olympus_private.purchases enable row level security;
alter table olympus_private.notes enable row level security;
revoke all on all tables in schema olympus_private from public, anon, authenticated;
create function olympus_private.action(op text, p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 u uuid := auth.uid(); d uuid; other_u uuid; today date := (now() at time zone 'Asia/Kolkata')::date;
 pr olympus_private.profiles; du olympus_private.duos; cost_n int; balance_n int; n int; item_n text;
begin
 if u is null then raise exception 'Sign in to continue'; end if;
 if op='setup' then
  insert into olympus_private.profiles(id,name,god) values(u,left(coalesce(nullif(trim(p->>'name'),''),'Hero'),30),coalesce(p->>'god','zeus'))
  on conflict(id) do update set name=excluded.name,god=excluded.god;
 end if;
 select * into pr from olympus_private.profiles where id=u for update;
 if pr.id is null then return jsonb_build_object('needs_setup',true); end if;
 d:=pr.duo_id;
 if op='create_duo' and d is null then
  insert into olympus_private.duos(owner_id) values(u) returning id into d;
  update olympus_private.profiles set duo_id=d where id=u;
 elsif op='join_duo' and d is null then
  if length(coalesce(p->>'code',''))<>32 then raise exception 'That invite code is not valid'; end if;
  select * into du from olympus_private.duos where invite=p->>'code' for update;
  if du.id is null then raise exception 'Invite not found'; end if;
  select count(*) into n from olympus_private.profiles where duo_id=du.id;
  if n>=2 then raise exception 'This duo already has two players'; end if;
  d:=du.id; update olympus_private.profiles set duo_id=d where id=u;
 elsif op='checkin' then
  if p->>'status' not in ('success','slip') or p->>'status' is null then raise exception 'Choose a check-in'; end if;
  insert into olympus_private.activities(user_id,day,kind,payload) values(u,today,'checkin',jsonb_build_object('status',p->>'status'))
  on conflict(user_id,day,kind,item) do update set payload=excluded.payload;
 elsif op='quest' then
  if p->>'item' not in ('walk','workout','focus','phone','breathe') or p->>'item' is null then raise exception 'Unknown quest'; end if;
  insert into olympus_private.activities(user_id,day,kind,item) values(u,today,'quest',p->>'item') on conflict do nothing;
 elsif op='note' then
  insert into olympus_private.notes values(u,today,left(coalesce(p->>'body',''),2000)) on conflict(user_id,day) do update set body=excluded.body;
 elsif op='support' then
  if d is null then raise exception 'Invite your friend first'; end if;
  if p->>'item' not in ('Call me','Let’s walk','Let’s play') or p->>'item' is null then raise exception 'Choose a request'; end if;
  insert into olympus_private.activities(user_id,day,kind,payload) values(u,today,'support',jsonb_build_object('message',p->>'item','duo',d))
  on conflict(user_id,day,kind,item) do update set payload=excluded.payload,created_at=now();
 elsif op='respond' then
  if d is null then raise exception 'Join a duo first'; end if;
  select id into other_u from olympus_private.profiles where duo_id=d and id<>u;
  if not exists(select 1 from olympus_private.activities where user_id=other_u and day=today and kind='support' and payload->>'duo'=d::text) then raise exception 'No support request today'; end if;
  insert into olympus_private.activities(user_id,day,kind,item) values(u,today,'quest','support') on conflict do nothing;
 elsif op='rules' then
  if d is null then raise exception 'Create a duo first'; end if;
  if coalesce((p->>'days')::int,0) not between 7 and 365 then raise exception 'Choose 7 to 365 days'; end if;
  select * into du from olympus_private.duos where id=d for update;
  update olympus_private.duos set rules=jsonb_build_object('goal',left(p->>'goal',100),'days',(p->>'days')::int,'reward',left(p->>'reward',100),'definition',left(p->>'definition',200),'revision',coalesce((du.rules->>'revision')::int,0)+1) where id=d;
 elsif op='agree' then
  if d is null then raise exception 'Create a duo first'; end if;
  select * into du from olympus_private.duos where id=d;
  insert into olympus_private.activities(user_id,day,kind,item,payload) values(u,today,'agree',d::text,jsonb_build_object('revision',du.rules->'revision')) on conflict(user_id,day,kind,item) do update set payload=excluded.payload;
 elsif op='purchase' then
  item_n:=p->>'item';
  cost_n:=case item_n when 'temple1' then 100 when 'temple2' then 200 when 'temple3' then 300 when 'aura' then 120 when 'banner' then 120 else null end;
  if cost_n is null then raise exception 'Unknown item'; end if;
  if exists(select 1 from olympus_private.purchases where user_id=u and item=item_n) then raise exception 'Already unlocked'; end if;
  if item_n='temple2' and not exists(select 1 from olympus_private.purchases where user_id=u and item='temple1') then raise exception 'Build the foundation first'; end if;
  if item_n='temple3' and not exists(select 1 from olympus_private.purchases where user_id=u and item='temple2') then raise exception 'Build the columns first'; end if;
  select coalesce(sum(case when kind='checkin' then 20 when kind='quest' then 10 else 0 end),0) into balance_n from olympus_private.activities where user_id=u;
  select balance_n-coalesce(sum(cost),0) into balance_n from olympus_private.purchases where user_id=u;
  if balance_n<cost_n then raise exception 'Complete more quests to earn coins'; end if;
  insert into olympus_private.purchases values(u,item_n,cost_n,now());
 elsif op='chest' then
  select count(*) into n from olympus_private.activities where user_id=u and kind='checkin' and payload->>'status'='success';
  if n<5 then raise exception 'Complete five successful days to unlock your chest'; end if;
  insert into olympus_private.purchases values(u,'chest-laurel',0,now()) on conflict do nothing;
 elsif op not in ('state','setup','create_duo','join_duo') then raise exception 'Unknown action';
 end if;
 select id into other_u from olympus_private.profiles where duo_id=d and id<>u;
 return jsonb_build_object(
 'today',today,'me',u,
 'profiles',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from olympus_private.profiles x where id=u or id=other_u),
 'duo',(select to_jsonb(x) from olympus_private.duos x where id=d),
 'activities',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from olympus_private.activities x where user_id=u or (user_id=other_u and day>=(select created_at::date from olympus_private.duos where id=d) and kind in ('checkin','quest','support','agree'))),
 'purchases',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from olympus_private.purchases x where user_id=u),
 'notes',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from olympus_private.notes x where user_id=u)
 );
end $$;
revoke all on function olympus_private.action(text,jsonb) from public, anon;
grant execute on function olympus_private.action(text,jsonb) to authenticated;
create function public.olympus_action(op text, p jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select olympus_private.action(op,p); $$;
revoke all on function public.olympus_action(text,jsonb) from public, anon;
grant execute on function public.olympus_action(text,jsonb) to authenticated;
-- All direct table reads and writes are denied; scoped actions are the only interface.
create policy private_api_only on olympus_private.profiles for all to authenticated using(false) with check(false);
create policy private_api_only on olympus_private.duos for all to authenticated using(false) with check(false);
create policy private_api_only on olympus_private.activities for all to authenticated using(false) with check(false);
create policy private_api_only on olympus_private.purchases for all to authenticated using(false) with check(false);
create policy private_api_only on olympus_private.notes for all to authenticated using(false) with check(false);
