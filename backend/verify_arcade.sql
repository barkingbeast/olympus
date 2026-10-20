begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); s jsonb; token text; n int; balance_n int;
begin
 insert into auth.users(id,email) values(a,'arcade-a@example.invalid'),(b,'arcade-b@example.invalid');
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform public.olympus_action('setup','{"name":"Arcade test","god":"hades"}');
 -- Legacy rewards are unchanged, even when a check-in is corrected.
 insert into olympus_private.activities(user_id,day,kind,payload) values(a,(now() at time zone 'Asia/Kolkata')::date-1,'checkin','{"status":"success"}');
 if olympus_private.reward_coins('checkin','{"status":"success"}')<>20 or olympus_private.reward_coins('quest','{}')<>10 then raise exception 'Legacy coin regression';end if;
 perform public.olympus_action('checkin','{"status":"success"}');
 perform public.olympus_action('checkin','{"status":"success"}');
 select count(*) into n from olympus_private.activities where user_id=a and day=(now() at time zone 'Asia/Kolkata')::date and kind='checkin';
 if n<>1 then raise exception 'Duplicate daily check-in';end if;
 if not exists(select 1 from olympus_private.activities where user_id=a and kind='checkin' and payload->>'economy'='2') then raise exception 'New check-in economy missing';end if;
 s:=public.olympus_action('game_start','{"item":"boulder"}');token:=s->>'game_token';
 begin
  perform public.olympus_action('game_finish',jsonb_build_object('item','boulder','token',token));raise exception 'Early claim accepted';
 exception when others then if sqlerrm<>'Finish the round before claiming your reward.' then raise;end if;end;
 begin
  perform public.olympus_action('game_finish','{"item":"boulder","token":"wrong"}');raise exception 'Invalid token accepted';
 exception when others then if sqlerrm<>'This round expired. Start a new game.' then raise;end if;end;
 update olympus_private.activities set created_at=now()-interval '12 seconds' where user_id=a and kind='game_run';
 s:=public.olympus_action('game_finish',jsonb_build_object('item','boulder','token',token));
 if not (s->'last_reward'->>'awarded')::boolean then raise exception 'First game not rewarded';end if;
 s:=public.olympus_action('game_finish',jsonb_build_object('item','boulder','token',token));
 if (s->'last_reward'->>'awarded')::boolean then raise exception 'Duplicate game rewarded';end if;
 s:=public.olympus_action('game_start','{"item":"lantern"}');token:=s->>'game_token';
 update olympus_private.activities set created_at=now()-interval '12 seconds' where user_id=a and kind='game_run';
 perform public.olympus_action('game_finish',jsonb_build_object('item','lantern','token',token));
 s:=public.olympus_action('game_start','{"item":"fleece"}');
 s:=public.olympus_action('game_finish','{"item":"fleece","token":"not-needed-after-cap"}');
 if (s->'last_reward'->>'awarded')::boolean then raise exception 'Daily cap bypass';end if;
 select count(*) into n from olympus_private.activities where user_id=a and kind='game';
 if n<>2 then raise exception 'Expected exactly two rewarded games';end if;
 select sum(olympus_private.reward_coins(kind,payload)) into balance_n from olympus_private.activities where user_id=a;
 if balance_n<>54 then raise exception 'Coin total mismatch: %',balance_n;end if;
 begin
  perform public.olympus_action('quest','{"item":"walk"}');raise exception 'Retired quest farming accepted';
 exception when others then if sqlerrm<>'Side quests are now mini-games. Refresh OLYMPUS.' then raise;end if;end;
 perform public.olympus_action('quest','{"item":"breathe"}');
 if olympus_private.reward_coins('quest','{"economy":2}')<>0 then raise exception 'Utility reward farming';end if;
 -- Purchase balance uses the new formula, and duplicate purchases remain blocked.
 insert into olympus_private.activities(user_id,day,kind,payload)
 select a,(now() at time zone 'Asia/Kolkata')::date-i,'checkin','{"status":"success","economy":2}' from generate_series(2,4)i;
 perform public.olympus_action('purchase','{"item":"aura"}');
 begin
  perform public.olympus_action('purchase','{"item":"aura"}');raise exception 'Duplicate purchase accepted';
 exception when others then if sqlerrm<>'Already unlocked' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',b::text,true);
 perform public.olympus_action('setup','{"name":"Other player","god":"zeus"}');s:=public.olympus_action('state');
 if jsonb_array_length(s->'activities')<>0 or jsonb_array_length(s->'purchases')<>0 then raise exception 'Cross-player data leak';end if;
 begin
  perform public.olympus_action('game_finish',jsonb_build_object('item','lantern','token',token));raise exception 'Other player token accepted';
 exception when others then if sqlerrm<>'This round expired. Start a new game.' then raise;end if;end;
 if has_table_privilege('authenticated','olympus_private.activities','SELECT') or has_function_privilege('anon','public.olympus_action(text,jsonb)','EXECUTE') then raise exception 'Private access widened';end if;
 raise notice 'PASS: reward cap, tokens, timing, duplicate prevention, legacy coins, purchase validation, player isolation';
end $$;
rollback;
