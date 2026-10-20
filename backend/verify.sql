begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); s jsonb; invite text; n int;
begin
 insert into auth.users(id,email) values(a,'olympus-test-a@example.invalid'),(b,'olympus-test-b@example.invalid'),(c,'olympus-test-c@example.invalid');
 perform set_config('request.jwt.claim.sub',a::text,true);
 s:=public.olympus_action('setup','{"name":"Test A","god":"zeus"}');
 s:=public.olympus_action('create_duo');invite:=s->'duo'->>'invite';
 perform public.olympus_action('checkin','{"status":"success"}');
 perform public.olympus_action('checkin','{"status":"success"}');
 select count(*) into n from olympus_private.activities where user_id=a and kind='checkin';
 if n<>1 then raise exception 'Duplicate check-in reward'; end if;
 perform public.olympus_action('quest','{"item":"breathe"}');
 perform public.olympus_action('quest','{"item":"breathe"}');
 select count(*) into n from olympus_private.activities where user_id=a and kind='quest';
 if n<>1 then raise exception 'Duplicate quest reward'; end if;
 perform public.olympus_action('note','{"body":"Secret A reflection"}');
 perform set_config('request.jwt.claim.sub',b::text,true);
 perform public.olympus_action('setup','{"name":"Test B","god":"poseidon"}');
 s:=public.olympus_action('join_duo',jsonb_build_object('code',invite));
 if jsonb_array_length(s->'profiles')<>2 then raise exception 'Duo not joined'; end if;
 if jsonb_array_length(s->'notes')<>0 then raise exception 'Private reflection leaked'; end if;
 perform set_config('request.jwt.claim.sub',c::text,true);
 perform public.olympus_action('setup','{"name":"Test C","god":"hades"}');
 s:=public.olympus_action('state');
 if jsonb_array_length(s->'profiles')<>1 or jsonb_array_length(s->'activities')<>0 then raise exception 'Cross-duo data leaked'; end if;
 begin
  perform public.olympus_action('join_duo',jsonb_build_object('code',invite));
  raise exception 'Expected full-duo rejection';
 exception when others then if sqlerrm<>'This duo already has two players' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',a::text,true);
 begin
  perform public.olympus_action('purchase','{"item":"temple3"}');raise exception 'Expected prerequisite rejection';
 exception when others then if sqlerrm<>'Build the columns first' then raise;end if;end;
 begin
  perform public.olympus_action('purchase','{"item":"aura"}');raise exception 'Expected balance rejection';
 exception when others then if sqlerrm<>'Keep checking in to earn coins' then raise;end if;end;
 perform public.olympus_action('checkin','{"status":"slip"}');
 s:=public.olympus_action('state');
 if not exists(select 1 from jsonb_array_elements(s->'activities') x where x->>'kind'='checkin' and x->'payload'->>'status'='slip') then raise exception 'Correction not saved';end if;
 raise notice 'PASS: private duo, third-player rejection, duplicate prevention, reflection isolation, purchase validation, check-in correction';
end $$;
rollback;
