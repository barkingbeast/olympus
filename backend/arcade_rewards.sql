-- Non-destructive upgrade: keep every existing record and its original economy.
-- Replaces only the scoped action and adds a pure coin calculation helper.
create or replace function olympus_private.reward_coins(kind text,payload jsonb) returns integer
language sql immutable security invoker set search_path='' as $$
 select case
 when kind='checkin' and payload->>'economy'='2' then case when payload->>'status'='success' then 30 else 5 end
 when kind='checkin' then 20
 when kind='game' then 2
 when kind='quest' and coalesce(payload->>'economy','1')<>'2' then 10
 else 0 end;
$$;
revoke all on function olympus_private.reward_coins(text,jsonb) from public,anon,authenticated;
create or replace function olympus_private.action(op text, p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 u uuid := auth.uid(); d uuid; other_u uuid; today date := (now() at time zone 'Asia/Kolkata')::date;
 pr olympus_private.profiles; du olympus_private.duos; cost_n int; balance_n int; n int; item_n text; run_n olympus_private.activities; token_n uuid; awarded_n boolean:=false;
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
  insert into olympus_private.activities(user_id,day,kind,payload) values(u,today,'checkin',jsonb_build_object('status',p->>'status','economy',2))
  on conflict(user_id,day,kind,item) do update set payload=olympus_private.activities.payload||jsonb_build_object('status',p->>'status');
 elsif op='quest' then
  if p->>'item' is distinct from 'breathe' then raise exception 'Side quests are now mini-games. Refresh OLYMPUS.'; end if;
  insert into olympus_private.activities(user_id,day,kind,item,payload) values(u,today,'quest',p->>'item','{"economy":2}') on conflict do nothing;
 elsif op='game_start' then
  if p->>'item' not in ('boulder','lantern','fleece') or p->>'item' is null then raise exception 'Unknown game'; end if;
  select count(*) into n from olympus_private.activities where user_id=u and day=today and kind='game';
  if n<2 and not exists(select 1 from olympus_private.activities where user_id=u and day=today and kind='game' and item=p->>'item') then
   token_n:=gen_random_uuid();
   insert into olympus_private.activities(user_id,day,kind,item,payload) values(u,today,'game_run',p->>'item',jsonb_build_object('token',token_n))
   on conflict(user_id,day,kind,item) do update set payload=excluded.payload,created_at=now();
  end if;
 elsif op='game_finish' then
  if p->>'item' not in ('boulder','lantern','fleece') or p->>'item' is null then raise exception 'Unknown game'; end if;
  select count(*) into n from olympus_private.activities where user_id=u and day=today and kind='game';
  if n<2 and not exists(select 1 from olympus_private.activities where user_id=u and day=today and kind='game' and item=p->>'item') then
   select * into run_n from olympus_private.activities where user_id=u and day=today and kind='game_run' and item=p->>'item';
   if run_n.user_id is null or p->>'token' is null or p->>'token' is distinct from run_n.payload->>'token' then raise exception 'This round expired. Start a new game.'; end if;
   if run_n.created_at>now()-interval '10 seconds' then raise exception 'Finish the round before claiming your reward.'; end if;
   if run_n.created_at<now()-interval '30 minutes' then raise exception 'This round expired. Start a new game.'; end if;
   insert into olympus_private.activities(user_id,day,kind,item,payload) values(u,today,'game',p->>'item','{"economy":2}') on conflict do nothing;
   get diagnostics n=row_count; awarded_n:=n=1;
  end if;
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
  insert into olympus_private.activities(user_id,day,kind,item,payload) values(u,today,'quest','support','{"economy":2}') on conflict do nothing;
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
  select coalesce(sum(olympus_private.reward_coins(kind,payload)),0) into balance_n from olympus_private.activities where user_id=u;
  select balance_n-coalesce(sum(cost),0) into balance_n from olympus_private.purchases where user_id=u;
  if balance_n<cost_n then raise exception 'Keep checking in to earn coins'; end if;
  insert into olympus_private.purchases values(u,item_n,cost_n,now());
 elsif op='chest' then
  select count(*) into n from olympus_private.activities where user_id=u and kind='checkin' and payload->>'status'='success';
  if n<5 then raise exception 'Complete five successful days to unlock your chest'; end if;
  insert into olympus_private.purchases values(u,'chest-laurel',0,now()) on conflict do nothing;
 elsif op not in ('state','setup','create_duo','join_duo') then raise exception 'Unknown action';
 end if;
 select id into other_u from olympus_private.profiles where duo_id=d and id<>u;
 return jsonb_build_object(
 'today',today,'me',u,'game_token',token_n,'last_reward',jsonb_build_object('awarded',awarded_n,'xp',case when awarded_n then 5 else 0 end,'coins',case when awarded_n then 2 else 0 end),
 'profiles',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from olympus_private.profiles x where id=u or id=other_u),
 'duo',(select to_jsonb(x) from olympus_private.duos x where id=d),
 'activities',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from olympus_private.activities x where user_id=u or (user_id=other_u and day>=(select created_at::date from olympus_private.duos where id=d) and kind in ('checkin','quest','game','support','agree'))),
 'purchases',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from olympus_private.purchases x where user_id=u),
 'notes',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from olympus_private.notes x where user_id=u)
 );
end $$;

revoke all on function olympus_private.action(text,jsonb) from public,anon;
grant execute on function olympus_private.action(text,jsonb) to authenticated;
