export const stages=[{day:0,title:'Mortal',place:'The foothills',symbol:'🌿'},{day:3,title:'Spartan',place:'Gates of Sparta',symbol:'🛡️'},{day:5,title:'Greek God',place:'The sacred grove',symbol:'🌟'},{day:7,title:'Olympian',place:'Temple of light',symbol:'🏛️'},{day:14,title:'Titan',place:'The Underworld',symbol:'🔥'},{day:21,title:'God of Thunder',place:'The storm summit',symbol:'⚡'},{day:30,title:'Cosmic Deity',place:'Mount Olympus',symbol:'🌌'}];
export const quests=[{id:'breathe',name:'Find your calm',desc:'Finish the 10-minute distraction timer.',icon:'❋'}];
export const economy={successXP:100,successCoins:30,slipXP:10,slipCoins:5,gameXP:5,gameCoins:2,gameCap:2};
export function activityReward(a){
 const modern=a.payload?.economy===2;
 if(a.kind==='checkin'){const success=a.payload?.status==='success';return{xp:modern?(success?100:10):(success?50:10),coins:modern?(success?30:5):20};}
 if(a.kind==='game')return{xp:5,coins:2};
 if(a.kind==='quest'&&!modern)return{xp:25,coins:10};
 return{xp:0,coins:0};
}
export function gameRewardsToday(state){return state.activities.filter(a=>a.user_id===state.me&&a.day===state.today&&a.kind==='game').length}
export function weeklyScore(activities,id,today){return activities.filter(a=>a.user_id===id&&a.day>=weekStart(today)&&a.day<=today).reduce((sum,a)=>sum+activityReward(a).xp,0)}

export function shiftDay(day,n){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
export function dayNow(){const f=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'});const parts=Object.fromEntries(f.formatToParts(new Date()).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`}
export function weekStart(day){const d=new Date(day+'T12:00:00Z');return shiftDay(day,-((d.getUTCDay()+6)%7))}
export function stats(activities,id,today){const a=activities.filter(x=>x.user_id===id),checks=a.filter(x=>x.kind==='checkin').sort((a,b)=>a.day.localeCompare(b.day));const success=new Set(checks.filter(x=>x.payload.status==='success').map(x=>x.day));let current=0;let cursor=success.has(today)?today:shiftDay(today,-1);while(success.has(cursor)){current++;cursor=shiftDay(cursor,-1)}let best=0,run=0,last='';for(const c of checks){if(c.payload.status==='success'){run=last===shiftDay(c.day,-1)?run+1:1;last=c.day;best=Math.max(best,run)}else{run=0;last=''}}if(checks.some(x=>x.day===today&&x.payload.status==='slip'))current=0;
const xp=a.reduce((sum,x)=>sum+activityReward(x).xp,0);
const earned=a.reduce((sum,x)=>sum+activityReward(x).coins,0);
const week=weekStart(today),weekly=a.filter(x=>x.day>=week&&x.day<=today);
return{current,best,xp,earned,success:success.size,rate:checks.length?Math.round(success.size/checks.length*100):0,checks,weeklySuccess:weekly.filter(x=>x.kind==='checkin'&&x.payload.status==='success').length,weeklyQuests:weekly.filter(x=>x.kind==='game'||x.kind==='quest'&&x.payload?.economy!==2).length,level:Math.floor(xp/250)+1,stage:stages.reduce((v,s,i)=>current>=s.day?i:v,0),bestStage:stages.reduce((v,s,i)=>best>=s.day?i:v,0)}}
export function sharedStreak(activities,ids,today){if(ids.length<2)return 0;const sets=ids.map(id=>new Set(activities.filter(a=>a.user_id===id&&a.kind==='checkin'&&a.payload.status==='success').map(a=>a.day)));let n=0,c=sets.every(s=>s.has(today))?today:shiftDay(today,-1);if(activities.some(a=>ids.includes(a.user_id)&&a.day===today&&a.kind==='checkin'&&a.payload.status==='slip'))return 0;while(sets.every(s=>s.has(c))){n++;c=shiftDay(c,-1)}return n}
export function bossState(state){const week=weekStart(state.today),a=state.activities.filter(x=>x.day>=week&&x.day<=state.today),ids=state.profiles.map(x=>x.id);const successes=a.filter(x=>x.kind==='checkin'&&x.payload.status==='success'),questsN=a.filter(x=>x.kind==='quest'&&x.payload?.economy!==2).length,gamesN=a.filter(x=>x.kind==='game').length;const comboDays=[...new Set(successes.map(x=>x.day))].filter(d=>ids.length===2&&ids.every(id=>successes.some(x=>x.user_id===id&&x.day===d))).length;const damage=successes.length*75+questsN*15+gamesN*5+comboDays*50;const index=Math.floor(new Date(week+'T12:00Z').getTime()/604800000)%4;return{damage:Math.min(1200,damage),max:1200,comboDays,index,names:['The Ancient Hydra','Hound of the Underworld','The Emerald Leviathan','The Fallen Titan'],week}}

// Compare authoritative totals, rather than button clicks, to avoid duplicate strikes.
export function combatEvent(before,after){
 if(!before||!after||before.week!==after.week||after.damage<=before.damage)return null;
 return {damage:after.damage-before.damage,combo:after.comboDays>before.comboDays,defeated:before.damage<after.max&&after.damage>=after.max};
}
