import {test} from 'node:test';import assert from 'node:assert/strict';import {stats,sharedStreak,bossState,combatEvent,shiftDay,weekStart} from '../dist/game.js';
import {bossPhase,bossArt} from '../dist/art.js';
const today='2026-10-20';const entry=(day,status='success',id='a')=>({user_id:id,day,kind:'checkin',item:'',payload:{status}});
test('unlogged today preserves yesterday streak; missing full day breaks it',()=>{assert.equal(stats([entry('2026-10-18'),entry('2026-10-19')],'a',today).current,2);assert.equal(stats([entry('2026-10-18')],'a',today).current,0)});
test('slip resets active streak and preserves best streak, XP and quests',()=>{const a=[entry('2026-10-18'),entry('2026-10-19'),entry(today,'slip'),{user_id:'a',day:today,kind:'quest',item:'walk',payload:{}}];const s=stats(a,'a',today);assert.equal(s.current,0);assert.equal(s.best,2);assert.equal(s.xp,135);assert.equal(s.earned,70)});
test('five consecutive days unlock Greek God; missed days do not inflate best',()=>{let a=Array.from({length:5},(_,i)=>entry(shiftDay(today,-i)));assert.equal(stats(a,'a',today).stage,2);a=[entry('2026-10-15'),entry('2026-10-17'),entry('2026-10-18')];assert.equal(stats(a,'a',today).best,2)});
test('shared streak requires both players and ends on either slip',()=>{const a=[entry('2026-10-19'),entry('2026-10-19','success','b')];assert.equal(sharedStreak(a,['a','b'],today),1);a.push(entry(today,'slip','b'));assert.equal(sharedStreak(a,['a','b'],today),0);assert.equal(sharedStreak(a,['a'],today),0)});
test('boss awards one combo per shared day and resets Monday',()=>{const state={today,profiles:[{id:'a'},{id:'b'}],activities:[entry(today),entry(today,'success','b'),entry('2026-10-18')]};const b=bossState(state);assert.equal(b.damage,200);assert.equal(b.comboDays,1);assert.equal(weekStart(today),'2026-10-19')});
test('calendar arithmetic crosses month and year boundaries',()=>{assert.equal(shiftDay('2026-01-01',-1),'2025-12-31');assert.equal(shiftDay('2024-03-01',-1),'2024-02-29')});

test('combat effects require a real damage increase in the same weekly raid',()=>{
 const b={week:'2026-10-19',damage:150,max:1200,comboDays:0};
 assert.equal(combatEvent(b,{...b}),null);
 assert.equal(combatEvent(b,{...b,damage:75}),null);
 assert.equal(combatEvent(b,{...b,week:'2026-10-26',damage:225}),null);
 assert.deepEqual(combatEvent(b,{...b,damage:275,comboDays:1}),{damage:125,combo:true,defeated:false});
});
test('boss defeat effects fire only when crossing the final HP threshold',()=>{
 const b={week:'2026-10-19',damage:1190,max:1200,comboDays:1};
 assert.deepEqual(combatEvent(b,{...b,damage:1200}),{damage:10,combo:false,defeated:true});
 assert.equal(combatEvent({...b,damage:1200},{...b,damage:1200}),null);
});

test('visual boss phase changes at half health and preserves supplied progress',()=>{
 const progress={damage:599,max:1200};
 assert.equal(bossPhase(progress),'dormant');
 assert.deepEqual(progress,{damage:599,max:1200});
 assert.equal(bossPhase({...progress,damage:600}),'awakened');
 assert.equal(bossPhase({...progress,damage:1199}),'awakened');
 assert.equal(bossPhase({...progress,damage:1200}),'defeated');
 for(let i=0;i<4;i++){
  assert.match(bossArt(i,true),/class="boss-awakened"/);
  assert.doesNotMatch(bossArt(i),/class="boss-awakened"/);
 }
});
